// tests/api/leads-ratelimit.test.ts
import { describe, it, expect, vi, beforeAll, beforeEach } from "vitest";
import { createClient, type Client } from "@libsql/client";
import { readFileSync } from "fs";
import { resolve } from "path";
import { NextRequest } from "next/server";

let db: Client;

async function makeTestDb(): Promise<Client> {
  const client = createClient({ url: "file::memory:" });
  const schema = readFileSync(resolve(__dirname, "../../lib/db/schema.sql"), "utf-8");
  for (const stmt of schema.split(";").map((s) => s.trim()).filter(Boolean)) {
    try {
      await client.execute(stmt);
    } catch (err) {
      const m = String(err);
      if (m.includes("duplicate column") || m.includes("already exists")) continue;
      throw err;
    }
  }
  return client;
}

vi.mock("@/lib/db/client", () => ({
  getDb: () => db,
}));

// Kill the expensive side effects — the limiter/dedupe behavior is the target.
const pushMock = vi.fn(async (..._args: unknown[]) => undefined);
vi.mock("@/lib/push/notify", () => ({
  sendPushNotification: (...args: unknown[]) => pushMock(...args),
}));
vi.mock("@/lib/ai/lead-summary", () => ({
  summariseLead: vi.fn(async () => "test summary"),
}));

import { POST } from "@/app/api/leads/route";

function makeRequest(email: string, ip = "203.0.113.9"): NextRequest {
  return new NextRequest("http://localhost/api/leads", {
    method: "POST",
    headers: { "content-type": "application/json", "x-forwarded-for": ip },
    // conversationId null → scoring + summary paths exit early / stay cheap
    body: JSON.stringify({ name: "Test Person", email, conversationId: null }),
  });
}

// Real session flow (no auth mocking): getDb() is already mocked to the
// shared in-memory db, which carries the real schema including admin_users /
// admin_sessions, so a genuine session row makes getRequestUser() resolve an
// actual admin — exercising the real code path, not a stubbed one.
async function seedAdminSession(): Promise<string> {
  const adminId = "admin-" + Math.random().toString(36).slice(2);
  await db.execute({
    sql: `INSERT INTO admin_users (id, email, password_hash, role, active) VALUES (?, ?, 'x', 'admin', 1)`,
    args: [adminId, `${adminId}@test.com`],
  });
  const token = "session-" + Math.random().toString(36).slice(2);
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000)
    .toISOString().replace("T", " ").slice(0, 19);
  await db.execute({
    sql: `INSERT INTO admin_sessions (id, admin_user_id, expires_at) VALUES (?, ?, ?)`,
    args: [token, adminId, expiresAt],
  });
  return token;
}

function makeAdminRequest(email: string, ip: string, sessionToken: string): NextRequest {
  return new NextRequest("http://localhost/api/leads", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-forwarded-for": ip,
      cookie: `gto_admin_session=${sessionToken}`,
    },
    body: JSON.stringify({ name: "Test Person", email, conversationId: null }),
  });
}

beforeAll(async () => {
  db = await makeTestDb();
});

beforeEach(async () => {
  await db.execute("DELETE FROM rate_limits");
  await db.execute("DELETE FROM leads");
  pushMock.mockClear();
});

describe("POST /api/leads — rate limits + dedupe (A04-1)", () => {
  it("creates a lead normally (201 with id)", async () => {
    const res = await POST(makeRequest("one@example.com"));
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.id).toBeTruthy();
  });

  it("silently dedupes a repeat email within 24h — success shape, no second row, no second push", async () => {
    const first = await POST(makeRequest("dupe@example.com", "203.0.113.1"));
    const firstBody = await first.json();
    pushMock.mockClear();

    const second = await POST(makeRequest("dupe@example.com", "198.51.100.2"));
    expect(second.status).toBe(201);
    const secondBody = await second.json();
    expect(secondBody.success).toBe(true);
    expect(secondBody.id).toBe(firstBody.id);

    const rows = await db.execute("SELECT COUNT(*) AS n FROM leads WHERE email = 'dupe@example.com'");
    expect(Number(rows.rows[0].n)).toBe(1);
    expect(pushMock).not.toHaveBeenCalled();
  });

  it("returns 429 on the 6th submission from one IP inside 10 minutes", async () => {
    for (let i = 0; i < 5; i++) {
      await POST(makeRequest(`u${i}@example.com`));
    }
    const res = await POST(makeRequest("u5@example.com"));
    expect(res.status).toBe(429);
    expect(res.headers.get("Retry-After")).toBeTruthy();
  });

  it("does not throttle a different IP", async () => {
    for (let i = 0; i < 6; i++) await POST(makeRequest(`v${i}@example.com`, "203.0.113.50"));
    const res = await POST(makeRequest("fresh@example.com", "198.51.100.99"));
    expect(res.status).toBe(201);
  });

  it("two racing submissions of the same email produce exactly one lead row", async () => {
    const [r1, r2] = await Promise.all([
      POST(makeRequest("race@example.com", "203.0.113.61")),
      POST(makeRequest("race@example.com", "198.51.100.62")),
    ]);
    expect(r1.status).toBe(201);
    expect(r2.status).toBe(201);
    const rows = await db.execute("SELECT COUNT(*) AS n FROM leads WHERE email = 'race@example.com'");
    expect(Number(rows.rows[0].n)).toBe(1);
  });

  it("returns 429 once the daily cap (15/24h) is reached, even with burst cap unspent", async () => {
    const ip = "203.0.113.220";
    const now = Math.floor(Date.now() / 1000);
    const windowStart = now - (now % 86400);
    // Pre-seed the day window at 15 (the cap) — a single fresh POST tips it to
    // 16 without needing 16 organic requests, which would trip the 5/10min
    // burst cap long before reaching the daily one.
    await db.execute({
      sql: `INSERT INTO rate_limits (key, window_start, count) VALUES (?, ?, 15)`,
      args: [`lead_capture_day:${ip}`, windowStart],
    });
    const res = await POST(makeRequest("daily-cap@example.com", ip));
    expect(res.status).toBe(429);
  });
});

describe("POST /api/leads — admin bypass (finding 1)", () => {
  let adminToken: string;

  beforeAll(async () => {
    adminToken = await seedAdminSession();
  });

  it("an authenticated admin skips both rate limiters and the dedupe guard", async () => {
    const ip = "203.0.113.230";

    // 7 rapid posts — a non-admin would 429 on the 6th (burst cap is 5/10min).
    for (let i = 0; i < 7; i++) {
      const res = await POST(makeAdminRequest(`admin-lead-${i}@example.com`, ip, adminToken));
      expect(res.status).toBe(201);
    }

    // Same-email repeat — a non-admin would be silently deduped (existing id,
    // no new row). An admin transcribing a real repeat inquiry gets a new row.
    const first = await POST(makeAdminRequest("admin-repeat@example.com", ip, adminToken));
    const second = await POST(makeAdminRequest("admin-repeat@example.com", ip, adminToken));
    expect(first.status).toBe(201);
    expect(second.status).toBe(201);
    const firstBody = await first.json();
    const secondBody = await second.json();
    expect(secondBody.id).not.toBe(firstBody.id);

    const rows = await db.execute(
      "SELECT COUNT(*) AS n FROM leads WHERE email = 'admin-repeat@example.com'",
    );
    expect(Number(rows.rows[0].n)).toBe(2);
  });
});

describe("POST /api/leads — dedupe scoped by source (finding 2)", () => {
  it("a businesses-source lead with the same email does not block a main-source submission", async () => {
    const email = "cross-source@example.com";
    await db.execute({
      sql: `INSERT INTO leads (name, email, source) VALUES (?, ?, 'businesses')`,
      args: ["Marketplace Signup", email],
    });

    const res = await POST(makeRequest(email, "203.0.113.240"));
    expect(res.status).toBe(201);

    const rows = await db.execute(
      "SELECT COUNT(*) AS n FROM leads WHERE email = 'cross-source@example.com'",
    );
    expect(Number(rows.rows[0].n)).toBe(2);

    const mainRow = await db.execute(
      "SELECT COUNT(*) AS n FROM leads WHERE email = 'cross-source@example.com' AND source = 'main'",
    );
    expect(Number(mainRow.rows[0].n)).toBe(1);
  });
});

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
const pushMock = vi.fn(async () => undefined);
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
});

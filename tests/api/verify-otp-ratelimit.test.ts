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

// The route's marketplace helpers are irrelevant to the limiter — mock them
// so a "verification attempt" is cheap and always invalid.
vi.mock("@/lib/auth/marketplace", () => ({
  verifyOtp: vi.fn(async () => ({ ok: false, reason: "invalid" as const })),
  findUserByEmail: vi.fn(async () => null),
  createMarketplaceSession: vi.fn(async () => "tok"),
  marketplaceCookieOptions: () => ({}),
  MARKETPLACE_SESSION_COOKIE: "gto_marketplace_session",
}));

import { POST } from "@/app/api/businesses/verify-otp/route";

function makeRequest(ip = "203.0.113.9"): NextRequest {
  return new NextRequest("http://localhost/api/businesses/verify-otp", {
    method: "POST",
    headers: { "content-type": "application/json", "x-forwarded-for": ip },
    body: JSON.stringify({ email: "a@b.com", code: "123456", purpose: "signin" }),
  });
}

beforeAll(async () => {
  db = await makeTestDb();
});

beforeEach(async () => {
  await db.execute("DELETE FROM rate_limits");
});

describe("POST /api/businesses/verify-otp — IP rate limit (A04-2)", () => {
  it("allows the first 20 attempts from one IP (invalid code → 400, not 429)", async () => {
    for (let i = 0; i < 20; i++) {
      const res = await POST(makeRequest());
      expect(res.status).toBe(400);
    }
  });

  it("returns 429 with Retry-After on the 21st attempt from the same IP", async () => {
    for (let i = 0; i < 20; i++) await POST(makeRequest());
    const res = await POST(makeRequest());
    expect(res.status).toBe(429);
    expect(res.headers.get("Retry-After")).toBeTruthy();
    const body = await res.json();
    expect(body.error).toBe("Too many requests. Please slow down.");
  });

  it("does not throttle a different IP", async () => {
    for (let i = 0; i < 21; i++) await POST(makeRequest("203.0.113.9"));
    const res = await POST(makeRequest("198.51.100.7"));
    expect(res.status).toBe(400);
  });
});

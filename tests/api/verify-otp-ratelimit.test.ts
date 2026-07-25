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

// Marketplace mocks created inside factory (not at module scope)
vi.mock("@/lib/auth/marketplace", () => {
  const mockVerifyOtp = vi.fn(async () => ({ ok: false, reason: "invalid" as const }));
  const mockFindUserByEmail = vi.fn(async () => null);
  const mockCreateMarketplaceSession = vi.fn(async () => "tok");
  // Store on global so we can access in tests
  (globalThis as any).mockVerifyOtp = mockVerifyOtp;
  (globalThis as any).mockFindUserByEmail = mockFindUserByEmail;
  (globalThis as any).mockCreateMarketplaceSession = mockCreateMarketplaceSession;
  return {
    verifyOtp: mockVerifyOtp,
    findUserByEmail: mockFindUserByEmail,
    createMarketplaceSession: mockCreateMarketplaceSession,
    marketplaceCookieOptions: () => ({}),
    MARKETPLACE_SESSION_COOKIE: "gto_marketplace_session",
  };
});

import { POST } from "@/app/api/businesses/verify-otp/route";

function makeRequest(ip?: string): NextRequest {
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (ip !== undefined) {
    headers["x-forwarded-for"] = ip;
  }
  return new NextRequest("http://localhost/api/businesses/verify-otp", {
    method: "POST",
    headers,
    body: JSON.stringify({ email: "a@b.com", code: "123456", purpose: "signin" }),
  });
}

beforeAll(async () => {
  db = await makeTestDb();
});

beforeEach(async () => {
  await db.execute("DELETE FROM rate_limits");
  // Reset mocks to default failure behavior for each test
  const mockVerifyOtp = (globalThis as any).mockVerifyOtp;
  const mockFindUserByEmail = (globalThis as any).mockFindUserByEmail;
  const mockCreateMarketplaceSession = (globalThis as any).mockCreateMarketplaceSession;
  mockVerifyOtp.mockImplementation(async () => ({ ok: false, reason: "invalid" as const }));
  mockFindUserByEmail.mockImplementation(async () => null);
  mockCreateMarketplaceSession.mockImplementation(async () => "tok");
  mockVerifyOtp.mockClear();
  mockFindUserByEmail.mockClear();
  mockCreateMarketplaceSession.mockClear();
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

  it("on successful verification with no IP header, stores null in session (not 'unknown')", async () => {
    // Get the mocks from global
    const mockVerifyOtp = (globalThis as any).mockVerifyOtp;
    const mockFindUserByEmail = (globalThis as any).mockFindUserByEmail;
    const mockCreateMarketplaceSession = (globalThis as any).mockCreateMarketplaceSession;

    // Reconfigure mocks for success path
    mockVerifyOtp.mockImplementation(async () => ({ ok: true }));
    mockFindUserByEmail.mockImplementation(async () => ({
      id: "user123",
      email: "a@b.com",
      full_name: "Test User",
      access_activated: true,
    }));

    // Make request WITHOUT x-forwarded-for header (ip = undefined)
    const res = await POST(makeRequest());
    expect(res.status).toBe(200);

    // Verify createMarketplaceSession was called with null (not "unknown")
    expect(mockCreateMarketplaceSession).toHaveBeenCalledWith(
      "user123",
      null, // Second arg should be null, not "unknown"
      null  // user-agent not set in request
    );
  });
});

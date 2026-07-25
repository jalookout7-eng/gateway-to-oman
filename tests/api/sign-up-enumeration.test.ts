// tests/api/sign-up-enumeration.test.ts
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

const sendOtpMock = vi.fn(async () => undefined);
vi.mock("@/lib/email/otp", () => ({
  sendOtpEmail: (...args: unknown[]) => sendOtpMock(...args),
}));

const findUserMock = vi.fn();
vi.mock("@/lib/auth/marketplace", () => ({
  findUserByEmail: (...args: unknown[]) => findUserMock(...args),
  createUser: vi.fn(async () => "user-id-1"),
  issueOtp: vi.fn(async () => "123456"),
}));

import { POST } from "@/app/api/businesses/sign-up/route";

function makeRequest(email: string, ip = "203.0.113.9"): NextRequest {
  return new NextRequest("http://localhost/api/businesses/sign-up", {
    method: "POST",
    headers: { "content-type": "application/json", "x-forwarded-for": ip },
    body: JSON.stringify({
      full_name: "Test Person",
      email,
      phone: "+96890000000",
      password: "longenough8",
    }),
  });
}

beforeAll(async () => {
  db = await makeTestDb();
});

beforeEach(async () => {
  await db.execute("DELETE FROM rate_limits");
  sendOtpMock.mockClear();
  findUserMock.mockReset();
});

describe("POST /api/businesses/sign-up — enumeration fix (A07-1)", () => {
  it("returns the generic success shape for an EXISTING VERIFIED email, sending nothing", async () => {
    findUserMock.mockResolvedValue({ id: "u1", email_verified: true });
    const res = await POST(makeRequest("taken@example.com"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ ok: true, otp_sent: true });
    expect(sendOtpMock).not.toHaveBeenCalled();
  });

  it("returns the same shape for a fresh email (and does send the OTP)", async () => {
    findUserMock.mockResolvedValue(null);
    const res = await POST(makeRequest("fresh@example.com", "198.51.100.7"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.otp_sent).toBe(true);
    expect(sendOtpMock).toHaveBeenCalledTimes(1);
  });
});

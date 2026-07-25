// tests/api/owner-gates.test.ts
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

// Control the session user per test; keep lib/auth/token.ts REAL so the
// requireOwner logic itself is what's under test.
const sessionUserMock = vi.fn();
vi.mock("@/lib/auth/sessions", () => ({
  SESSION_COOKIE_NAME: "gto_admin_session",
  getSessionUser: (...args: unknown[]) => sessionUserMock(...args),
}));

vi.mock("@/lib/businesses/reviewer", () => ({
  getReviewerToken: vi.fn(async () => "reviewer-token-1"),
  regenerateReviewerToken: vi.fn(async () => "reviewer-token-2"),
}));

import { POST as createAdminUser } from "@/app/api/admin/admin-users/route";
import { PATCH as patchAdminUser, DELETE as deleteAdminUser } from "@/app/api/admin/admin-users/[id]/route";
import { GET as getReviewerLink, POST as rotateReviewerLink } from "@/app/api/admin/reviewer-link/route";

function makeRequest(method: string, url: string, body?: unknown): NextRequest {
  return new NextRequest(`http://localhost${url}`, {
    method,
    headers: {
      "content-type": "application/json",
      cookie: "gto_admin_session=test-token",
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
}

const asOwner = () => sessionUserMock.mockResolvedValue({ id: "owner-1", email: "o@x.com", full_name: "Owner", role: "owner" });
const asAdmin = () => sessionUserMock.mockResolvedValue({ id: "admin-1", email: "a@x.com", full_name: "Admin", role: "admin" });

beforeAll(async () => {
  db = await makeTestDb();
});

beforeEach(() => {
  sessionUserMock.mockReset();
});

describe("owner gates (A01-1 admin-users, A01-2 reviewer-link)", () => {
  it("admin-users POST → 403 for non-owner admin", async () => {
    asAdmin();
    const res = await createAdminUser(
      makeRequest("POST", "/api/admin/admin-users", { email: "new@x.com", password: "longenough8" }),
    );
    expect(res.status).toBe(403);
  });

  it("admin-users POST → 201 for owner", async () => {
    asOwner();
    const res = await createAdminUser(
      makeRequest("POST", "/api/admin/admin-users", { email: "new2@x.com", password: "longenough8" }),
    );
    expect(res.status).toBe(201);
  });

  it("admin-users PATCH → 403 for non-owner admin", async () => {
    asAdmin();
    const res = await patchAdminUser(
      makeRequest("PATCH", "/api/admin/admin-users/some-id", { full_name: "X" }),
      { params: Promise.resolve({ id: "some-id" }) },
    );
    expect(res.status).toBe(403);
  });

  it("admin-users DELETE → 403 for non-owner admin", async () => {
    asAdmin();
    const res = await deleteAdminUser(
      makeRequest("DELETE", "/api/admin/admin-users/some-id"),
      { params: Promise.resolve({ id: "some-id" }) },
    );
    expect(res.status).toBe(403);
  });

  it("reviewer-link GET → 403 for non-owner admin, 200 for owner", async () => {
    asAdmin();
    const denied = await getReviewerLink(makeRequest("GET", "/api/admin/reviewer-link"));
    expect(denied.status).toBe(403);

    asOwner();
    const allowed = await getReviewerLink(makeRequest("GET", "/api/admin/reviewer-link"));
    expect(allowed.status).toBe(200);
  });

  it("reviewer-link POST (rotate) → 403 for non-owner admin, 200 for owner", async () => {
    asAdmin();
    const denied = await rotateReviewerLink(makeRequest("POST", "/api/admin/reviewer-link"));
    expect(denied.status).toBe(403);

    asOwner();
    const allowed = await rotateReviewerLink(makeRequest("POST", "/api/admin/reviewer-link"));
    expect(allowed.status).toBe(200);
  });

  it("unauthenticated → 401 everywhere", async () => {
    sessionUserMock.mockResolvedValue(null);
    const res = await rotateReviewerLink(makeRequest("POST", "/api/admin/reviewer-link"));
    expect(res.status).toBe(401);
  });
});

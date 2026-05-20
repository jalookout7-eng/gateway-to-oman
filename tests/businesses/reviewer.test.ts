import { describe, it, expect, beforeAll, vi } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";

vi.stubEnv("TURSO_DATABASE_URL", "file::memory:?cache=shared");
vi.stubEnv("TURSO_AUTH_TOKEN", "");

// Apply the full schema to the shared in-memory DB the singleton getDb() returns.
async function applySchema() {
  const { getDb } = await import("@/lib/db/client");
  const db = getDb();
  const schema = readFileSync(resolve(__dirname, "../../lib/db/schema.sql"), "utf-8");
  const statements = schema
    .split(";")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
  for (const statement of statements) {
    try {
      await db.execute(statement);
    } catch (err) {
      const msg = String(err);
      if (msg.includes("duplicate column") || msg.includes("already exists")) continue;
      throw err;
    }
  }
  return db;
}

beforeAll(async () => {
  await applySchema();
});

describe("reviewer access token", () => {
  it("generates a unique URL-safe token each time", async () => {
    const { generateReviewerToken } = await import("@/lib/businesses/reviewer");
    const a = generateReviewerToken();
    const b = generateReviewerToken();
    expect(a).not.toBe(b);
    expect(a).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(a.length).toBeGreaterThanOrEqual(24);
  });

  it("persists, validates, and rotates the token", async () => {
    const { getReviewerToken, regenerateReviewerToken, validateReviewerToken } = await import(
      "@/lib/businesses/reviewer"
    );

    const token = await getReviewerToken();
    expect(token.length).toBeGreaterThan(0);
    // getReviewerToken is idempotent — same token on second read.
    expect(await getReviewerToken()).toBe(token);

    expect(await validateReviewerToken(token)).toBe(true);
    expect(await validateReviewerToken("wrong-token")).toBe(false);
    expect(await validateReviewerToken("")).toBe(false);
    expect(await validateReviewerToken(null)).toBe(false);

    // Shuffling invalidates the old token.
    const rotated = await regenerateReviewerToken();
    expect(rotated).not.toBe(token);
    expect(await validateReviewerToken(token)).toBe(false);
    expect(await validateReviewerToken(rotated)).toBe(true);
  });
});

describe("ensureReviewerUser", () => {
  it("creates a pre-activated reviewer account, idempotently", async () => {
    const { ensureReviewerUser, REVIEWER_EMAIL } = await import("@/lib/businesses/reviewer");
    const { getDb } = await import("@/lib/db/client");

    const id1 = await ensureReviewerUser();
    const id2 = await ensureReviewerUser();
    expect(id1).toBe(id2); // same row, not a duplicate

    const row = await getDb().execute({
      sql: "SELECT email, access_activated, email_verified FROM marketplace_users WHERE id = ?",
      args: [id1],
    });
    expect(row.rows[0].email).toBe(REVIEWER_EMAIL);
    expect(Number(row.rows[0].access_activated)).toBe(1);
    expect(Number(row.rows[0].email_verified)).toBe(1);
  });
});

describe("upsertGoogleUser", () => {
  it("creates a Google user, then links on repeat email", async () => {
    const { upsertGoogleUser } = await import("@/lib/auth/marketplace");
    const { getDb } = await import("@/lib/db/client");

    const id1 = await upsertGoogleUser({
      email: "g@example.com",
      full_name: "Google Person",
      google_id: "google-1",
    });
    const id2 = await upsertGoogleUser({
      email: "G@Example.com", // same identity, different case
      full_name: "Google Person",
      google_id: "google-1",
    });
    expect(id1).toBe(id2);

    const row = await getDb().execute({
      sql: "SELECT google_id, email_verified, access_activated FROM marketplace_users WHERE id = ?",
      args: [id1],
    });
    expect(row.rows[0].google_id).toBe("google-1");
    expect(Number(row.rows[0].email_verified)).toBe(1);
    // Google sign-in does NOT auto-grant marketplace access.
    expect(Number(row.rows[0].access_activated)).toBe(0);
  });
});

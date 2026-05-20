import { randomBytes, timingSafeEqual } from "crypto";
import { getDb } from "@/lib/db/client";

// The reviewer access token lives in the settings key/value table so admins can
// view + regenerate it from the dashboard (no env var, no redeploy needed).
const REVIEWER_TOKEN_KEY = "reviewer_access_token";

// A single pre-activated marketplace account that reviewer links sign into.
export const REVIEWER_EMAIL = "reviewer@gatewaytooman.com";
const REVIEWER_NAME = "Marketplace Reviewer";

export function generateReviewerToken(): string {
  // 24 random bytes → 32-char URL-safe string.
  return randomBytes(24).toString("base64url");
}

/**
 * Read the current reviewer token, creating one on first use so the admin card
 * always has a link to show.
 */
export async function getReviewerToken(): Promise<string> {
  const db = getDb();
  const result = await db.execute({
    sql: "SELECT value FROM settings WHERE key = ?",
    args: [REVIEWER_TOKEN_KEY],
  });
  const existing = result.rows[0]?.value;
  if (typeof existing === "string" && existing.length > 0) return existing;
  return regenerateReviewerToken();
}

/** Rotate ("shuffle") the token — old links stop working immediately. */
export async function regenerateReviewerToken(): Promise<string> {
  const token = generateReviewerToken();
  const db = getDb();
  await db.execute({
    sql: `INSERT INTO settings (key, value, updated_at)
          VALUES (?, ?, datetime('now'))
          ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')`,
    args: [REVIEWER_TOKEN_KEY, token],
  });
  return token;
}

/** Constant-time comparison of a candidate key against the stored token. */
export async function validateReviewerToken(candidate: string | null | undefined): Promise<boolean> {
  if (!candidate) return false;
  const db = getDb();
  const result = await db.execute({
    sql: "SELECT value FROM settings WHERE key = ?",
    args: [REVIEWER_TOKEN_KEY],
  });
  const stored = result.rows[0]?.value;
  if (typeof stored !== "string" || stored.length === 0) return false;
  const a = Buffer.from(candidate);
  const b = Buffer.from(stored);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

/**
 * Ensure the pre-activated reviewer account exists, then return its id. Idempotent:
 * if it already exists, its access is (re)confirmed. This account has no password —
 * it's only reachable through a valid reviewer link.
 */
export async function ensureReviewerUser(): Promise<string> {
  const db = getDb();
  const result = await db.execute({
    sql: `INSERT INTO marketplace_users (email, full_name, email_verified, access_activated)
          VALUES (?, ?, 1, 1)
          ON CONFLICT(email) DO UPDATE SET
            email_verified = 1,
            access_activated = 1,
            updated_at = datetime('now')
          RETURNING id`,
    args: [REVIEWER_EMAIL, REVIEWER_NAME],
  });
  return result.rows[0].id as string;
}

import { randomBytes, randomInt } from "crypto";
import { getDb } from "@/lib/db/client";
import { hashPassword, verifyPassword } from "@/lib/auth/password";

export const MARKETPLACE_SESSION_COOKIE = "gto_marketplace_session";
export const MARKETPLACE_SESSION_TTL_DAYS = 7;
const SESSION_TTL_MS = MARKETPLACE_SESSION_TTL_DAYS * 24 * 60 * 60 * 1000;

const OTP_TTL_MINUTES = 10;
const OTP_MAX_ATTEMPTS = 5;

export type MarketplaceUser = {
  id: string;
  email: string;
  full_name: string;
  phone: string | null;
  country_code: string | null;
  email_verified: boolean;
  access_activated: boolean;
};

function generateToken(): string {
  return randomBytes(32).toString("hex");
}

function generateOtpCode(): string {
  // 6 digits, cryptographically secure (H-3)
  return randomInt(100000, 1000000).toString();
}

export async function findUserByEmail(email: string): Promise<MarketplaceUser | null> {
  const db = getDb();
  const result = await db.execute({
    sql: `SELECT id, email, full_name, phone, country_code, email_verified, access_activated
          FROM marketplace_users
          WHERE lower(email) = lower(?)
          LIMIT 1`,
    args: [email.trim()],
  });
  if (result.rows.length === 0) return null;
  const row = result.rows[0];
  return {
    id: row.id as string,
    email: row.email as string,
    full_name: row.full_name as string,
    phone: (row.phone as string | null) ?? null,
    country_code: (row.country_code as string | null) ?? null,
    email_verified: Number(row.email_verified) === 1,
    access_activated: Number(row.access_activated) === 1,
  };
}

export async function createUser(input: {
  email: string;
  full_name: string;
  password: string;
  phone?: string | null;
  country_code?: string | null;
  lead_id?: string | null;
}): Promise<string> {
  const db = getDb();
  const passwordHash = await hashPassword(input.password);
  const result = await db.execute({
    sql: `INSERT INTO marketplace_users
            (email, full_name, password_hash, phone, country_code, lead_id)
          VALUES (?, ?, ?, ?, ?, ?)
          RETURNING id`,
    args: [
      input.email.trim().toLowerCase(),
      input.full_name.trim(),
      passwordHash,
      input.phone ?? null,
      input.country_code ?? null,
      input.lead_id ?? null,
    ],
  });
  return result.rows[0].id as string;
}

/**
 * Upsert a marketplace user authenticated via Google. Email is the identity key:
 * if the email already exists (e.g. they signed up with a password earlier), we
 * just link the google_id and confirm their email. New users are created with no
 * password. Access still requires admin approval (access_activated is untouched).
 * Returns the user id.
 */
export async function upsertGoogleUser(input: {
  email: string;
  full_name: string;
  google_id: string;
}): Promise<string> {
  const db = getDb();
  const email = input.email.trim().toLowerCase();
  const fullName = input.full_name.trim() || email.split("@")[0];
  const result = await db.execute({
    sql: `INSERT INTO marketplace_users (email, full_name, google_id, email_verified)
          VALUES (?, ?, ?, 1)
          ON CONFLICT(email) DO UPDATE SET
            google_id = excluded.google_id,
            email_verified = 1,
            updated_at = datetime('now')
          RETURNING id`,
    args: [email, fullName, input.google_id],
  });
  return result.rows[0].id as string;
}

export async function verifyUserPassword(email: string, password: string): Promise<MarketplaceUser | null> {
  const db = getDb();
  const result = await db.execute({
    sql: `SELECT id, email, full_name, phone, country_code, email_verified, access_activated, password_hash
          FROM marketplace_users
          WHERE lower(email) = lower(?)
          LIMIT 1`,
    args: [email.trim()],
  });
  if (result.rows.length === 0) return null;
  const row = result.rows[0];
  const hash = row.password_hash as string | null;
  if (!hash) return null;
  const ok = await verifyPassword(password, hash);
  if (!ok) return null;
  return {
    id: row.id as string,
    email: row.email as string,
    full_name: row.full_name as string,
    phone: (row.phone as string | null) ?? null,
    country_code: (row.country_code as string | null) ?? null,
    email_verified: Number(row.email_verified) === 1,
    access_activated: Number(row.access_activated) === 1,
  };
}

export async function issueOtp(email: string, purpose: "signup" | "signin" | "verify"): Promise<string> {
  const db = getDb();
  const code = generateOtpCode();
  const expiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000)
    .toISOString()
    .replace("T", " ")
    .slice(0, 19);

  // Consume any outstanding OTP for this email+purpose so the latest one wins.
  await db.execute({
    sql: `UPDATE marketplace_otps SET consumed = 1
          WHERE lower(email) = lower(?) AND purpose = ? AND consumed = 0`,
    args: [email.trim(), purpose],
  });

  await db.execute({
    sql: `INSERT INTO marketplace_otps (email, code, purpose, expires_at)
          VALUES (?, ?, ?, ?)`,
    args: [email.trim().toLowerCase(), code, purpose, expiresAt],
  });

  return code;
}

export async function verifyOtp(
  email: string,
  code: string,
  purpose: "signup" | "signin" | "verify",
): Promise<{ ok: true } | { ok: false; reason: "invalid" | "expired" | "too_many_attempts" }> {
  const db = getDb();
  const result = await db.execute({
    sql: `SELECT id, code, expires_at, attempts
          FROM marketplace_otps
          WHERE lower(email) = lower(?) AND purpose = ? AND consumed = 0
          ORDER BY created_at DESC LIMIT 1`,
    args: [email.trim(), purpose],
  });
  if (result.rows.length === 0) return { ok: false, reason: "invalid" };
  const row = result.rows[0];
  const attempts = Number(row.attempts ?? 0);
  if (attempts >= OTP_MAX_ATTEMPTS) {
    await db.execute({ sql: "UPDATE marketplace_otps SET consumed = 1 WHERE id = ?", args: [row.id as string] });
    return { ok: false, reason: "too_many_attempts" };
  }
  const now = new Date().toISOString().replace("T", " ").slice(0, 19);
  if (String(row.expires_at) < now) {
    await db.execute({ sql: "UPDATE marketplace_otps SET consumed = 1 WHERE id = ?", args: [row.id as string] });
    return { ok: false, reason: "expired" };
  }
  if (String(row.code) !== code.trim()) {
    await db.execute({
      sql: "UPDATE marketplace_otps SET attempts = attempts + 1 WHERE id = ?",
      args: [row.id as string],
    });
    return { ok: false, reason: "invalid" };
  }

  // Success — consume and mark email verified if signup.
  await db.execute({ sql: "UPDATE marketplace_otps SET consumed = 1 WHERE id = ?", args: [row.id as string] });
  if (purpose === "signup" || purpose === "verify") {
    await db.execute({
      sql: `UPDATE marketplace_users SET email_verified = 1, updated_at = datetime('now') WHERE lower(email) = lower(?)`,
      args: [email.trim()],
    });
  }
  return { ok: true };
}

export async function createMarketplaceSession(
  userId: string,
  ip: string | null,
  userAgent: string | null,
): Promise<string> {
  const db = getDb();
  const token = generateToken();
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS)
    .toISOString()
    .replace("T", " ")
    .slice(0, 19);
  await db.execute({
    sql: `INSERT INTO marketplace_sessions (id, user_id, ip, user_agent, expires_at)
          VALUES (?, ?, ?, ?, ?)`,
    args: [token, userId, ip, userAgent, expiresAt],
  });
  await db.execute({
    sql: `UPDATE marketplace_users SET last_login_at = datetime('now') WHERE id = ?`,
    args: [userId],
  });
  return token;
}

export async function getMarketplaceSession(token: string | undefined): Promise<MarketplaceUser | null> {
  if (!token) return null;
  const db = getDb();
  const result = await db.execute({
    sql: `SELECT u.id, u.email, u.full_name, u.phone, u.country_code, u.email_verified, u.access_activated, s.expires_at
          FROM marketplace_sessions s
          JOIN marketplace_users u ON u.id = s.user_id
          WHERE s.id = ?
          LIMIT 1`,
    args: [token],
  });
  if (result.rows.length === 0) return null;
  const row = result.rows[0];
  const now = new Date().toISOString().replace("T", " ").slice(0, 19);
  if (String(row.expires_at) < now) {
    await db.execute({ sql: "DELETE FROM marketplace_sessions WHERE id = ?", args: [token] });
    return null;
  }
  return {
    id: row.id as string,
    email: row.email as string,
    full_name: row.full_name as string,
    phone: (row.phone as string | null) ?? null,
    country_code: (row.country_code as string | null) ?? null,
    email_verified: Number(row.email_verified) === 1,
    access_activated: Number(row.access_activated) === 1,
  };
}

export function marketplaceCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: SESSION_TTL_MS / 1000,
  };
}

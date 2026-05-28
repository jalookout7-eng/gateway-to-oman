import { randomBytes } from "crypto";
import { getDb } from "@/lib/db/client";

export const SESSION_COOKIE_NAME = "gto_admin_session";
export const SESSION_TTL_DAYS = 7;
const SESSION_TTL_MS = SESSION_TTL_DAYS * 24 * 60 * 60 * 1000;

export type SessionUser = {
  id: string;
  email: string;
  full_name: string | null;
  role: "owner" | "admin" | "viewer";
};

function generateToken(): string {
  return randomBytes(32).toString("hex");
}

export async function createSession(
  adminUserId: string,
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
    sql: `INSERT INTO admin_sessions (id, admin_user_id, ip, user_agent, expires_at)
          VALUES (?, ?, ?, ?, ?)`,
    args: [token, adminUserId, ip, userAgent, expiresAt],
  });

  await db.execute({
    sql: `UPDATE admin_users SET last_login_at = datetime('now') WHERE id = ?`,
    args: [adminUserId],
  });

  return token;
}

export async function getSessionUser(token: string | undefined): Promise<SessionUser | null> {
  if (!token) return null;
  const db = getDb();
  const result = await db.execute({
    sql: `SELECT u.id, u.email, u.full_name, u.role, u.active, s.expires_at
          FROM admin_sessions s
          JOIN admin_users u ON u.id = s.admin_user_id
          WHERE s.id = ?
          LIMIT 1`,
    args: [token],
  });
  if (result.rows.length === 0) return null;
  const row = result.rows[0];
  if (Number(row.active) !== 1) return null;
  // SQLite stores expires_at as text; compare lexically vs current ISO-ish
  const expiresAt = String(row.expires_at);
  const now = new Date().toISOString().replace("T", " ").slice(0, 19);
  if (expiresAt < now) {
    await db.execute({ sql: "DELETE FROM admin_sessions WHERE id = ?", args: [token] });
    return null;
  }
  return {
    id: row.id as string,
    email: row.email as string,
    full_name: (row.full_name as string | null) ?? null,
    role: row.role as SessionUser["role"],
  };
}

export async function destroySession(token: string | undefined): Promise<void> {
  if (!token) return;
  const db = getDb();
  await db.execute({ sql: "DELETE FROM admin_sessions WHERE id = ?", args: [token] });
}

export function cookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    // SameSite=Strict for the admin cookie (audit item L-1).
    // Admin pages are only navigated from within the site after sign-in — no
    // legitimate cross-site flow needs to carry the admin cookie. Strict makes
    // the cookie un-sendable from clicked-from-external-site requests, which
    // closes the small window where a CSRF-style cross-site GET could leak
    // admin state. Marketplace + OAuth state cookies remain SameSite=Lax in
    // their own files because they DO need to survive top-level navigation
    // from emails / Google OAuth callbacks.
    sameSite: "strict" as const,
    path: "/",
    maxAge: SESSION_TTL_MS / 1000,
  };
}

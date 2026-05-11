import { NextRequest, NextResponse } from "next/server";
import { getSessionUser, SESSION_COOKIE_NAME, type SessionUser } from "@/lib/auth/sessions";

export function validateToken(token: string): boolean {
  const adminToken = process.env.ADMIN_TOKEN;
  if (!adminToken) return false;
  return token === adminToken;
}

/**
 * Check whether the request is authenticated as an admin.
 *
 * Two valid paths:
 * 1. Session cookie set by /api/auth/login (preferred — per-user, audited)
 * 2. Legacy bearer ADMIN_TOKEN (backwards compatibility — single shared secret)
 *
 * Returns null if authorized, or a 401 NextResponse if not.
 */
export async function requireAuth(request: NextRequest): Promise<NextResponse | null> {
  const sessionToken = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (sessionToken) {
    const user = await getSessionUser(sessionToken);
    if (user) return null;
  }

  const authHeader = request.headers.get("Authorization");
  const bearer = authHeader?.replace("Bearer ", "");
  if (bearer && validateToken(bearer)) return null;

  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

/**
 * Returns the SessionUser if the request is session-authenticated, otherwise null.
 * Use when an admin endpoint wants per-user info (which admin did this action).
 */
export async function getRequestUser(request: NextRequest): Promise<SessionUser | null> {
  const sessionToken = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (!sessionToken) return null;
  return getSessionUser(sessionToken);
}

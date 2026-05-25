import { NextRequest, NextResponse } from "next/server";
import { getSessionUser, SESSION_COOKIE_NAME, type SessionUser } from "@/lib/auth/sessions";

/**
 * Check whether the request is authenticated as an admin.
 *
 * Auth is cookie-session only — set by /api/auth/login.
 *
 * Returns null if authorized, or a 401 NextResponse if not.
 */
export async function requireAuth(request: NextRequest): Promise<NextResponse | null> {
  const sessionToken = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (sessionToken) {
    const user = await getSessionUser(sessionToken);
    if (user) return null;
  }

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

/**
 * Like requireAuth, but additionally requires the session user's role to be "owner".
 * Use for owner-only surfaces (intelligence dashboard, Omar phase control) — there is
 * more than one admin account and these must not be reachable by non-owner admins.
 *
 * Returns null if authorized as owner, 401 if unauthenticated, or 403 if authenticated
 * but not an owner.
 */
export async function requireOwner(request: NextRequest): Promise<NextResponse | null> {
  const user = await getRequestUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.role !== "owner") {
    return NextResponse.json({ error: "Forbidden — owner only" }, { status: 403 });
  }
  return null;
}

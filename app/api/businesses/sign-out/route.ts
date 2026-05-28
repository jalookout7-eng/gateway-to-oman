import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db/client";
import { MARKETPLACE_SESSION_COOKIE } from "@/lib/auth/marketplace";

/**
 * Marketplace user sign-out. Mirrors /api/auth/logout for admin sessions:
 * (1) delete the session row in the DB so the token can't be reused,
 * (2) clear the cookie on the response.
 */
export async function POST(request: NextRequest) {
  const token = request.cookies.get(MARKETPLACE_SESSION_COOKIE)?.value;

  if (token) {
    const db = getDb();
    await db
      .execute({
        sql: "DELETE FROM marketplace_sessions WHERE id = ?",
        args: [token],
      })
      .catch(() => {
        // Best-effort delete — even if the row is already gone, we still
        // clear the cookie below.
      });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set({
    name: MARKETPLACE_SESSION_COOKIE,
    value: "",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  return res;
}

import { randomBytes } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import {
  GOOGLE_STATE_COOKIE,
  buildGoogleAuthUrl,
  googleConfigured,
  googleRedirectUri,
} from "@/lib/auth/google";

/**
 * Kick off Google sign-in: GET /api/businesses/google/start
 * Sets a CSRF state cookie and redirects to Google's consent screen.
 */
export async function GET(request: NextRequest) {
  if (!googleConfigured()) {
    const url = new URL("/businesses/sign-in", request.url);
    url.searchParams.set("error", "google_unconfigured");
    return NextResponse.redirect(url);
  }

  const state = randomBytes(16).toString("hex");
  const authUrl = buildGoogleAuthUrl({
    clientId: process.env.GOOGLE_CLIENT_ID!,
    redirectUri: googleRedirectUri(request.url),
    state,
  });

  const response = NextResponse.redirect(authUrl);
  response.cookies.set(GOOGLE_STATE_COOKIE, state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 10 * 60, // 10 minutes to complete the round-trip
  });
  return response;
}

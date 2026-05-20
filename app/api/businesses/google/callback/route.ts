import { NextRequest, NextResponse } from "next/server";
import {
  GOOGLE_STATE_COOKIE,
  decodeIdToken,
  exchangeGoogleCode,
  googleConfigured,
  googleRedirectUri,
} from "@/lib/auth/google";
import {
  createMarketplaceSession,
  marketplaceCookieOptions,
  upsertGoogleUser,
  MARKETPLACE_SESSION_COOKIE,
} from "@/lib/auth/marketplace";

function fail(request: NextRequest, reason: string) {
  const url = new URL("/businesses/sign-in", request.url);
  url.searchParams.set("error", reason);
  return NextResponse.redirect(url);
}

/**
 * Google OAuth callback: GET /api/businesses/google/callback?code=...&state=...
 * Validates state, exchanges the code, upserts the user, and issues a session.
 */
export async function GET(request: NextRequest) {
  if (!googleConfigured()) return fail(request, "google_unconfigured");

  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  const stateCookie = request.cookies.get(GOOGLE_STATE_COOKIE)?.value;

  if (!code || !state || !stateCookie || state !== stateCookie) {
    return fail(request, "google_failed");
  }

  const tokens = await exchangeGoogleCode({
    code,
    redirectUri: googleRedirectUri(request.url),
  });
  if (!tokens?.id_token) return fail(request, "google_failed");

  const identity = decodeIdToken(tokens.id_token);
  if (!identity || !identity.email_verified) return fail(request, "google_failed");

  const userId = await upsertGoogleUser({
    email: identity.email,
    full_name: identity.name,
    google_id: identity.sub,
  });

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
  const userAgent = request.headers.get("user-agent");
  const token = await createMarketplaceSession(userId, ip, userAgent);

  const response = NextResponse.redirect(new URL("/businesses/listings", request.url));
  response.cookies.set(MARKETPLACE_SESSION_COOKIE, token, marketplaceCookieOptions());
  response.cookies.delete(GOOGLE_STATE_COOKIE);
  return response;
}

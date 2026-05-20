import { NextRequest, NextResponse } from "next/server";
import {
  createMarketplaceSession,
  marketplaceCookieOptions,
  MARKETPLACE_SESSION_COOKIE,
} from "@/lib/auth/marketplace";
import { validateReviewerToken, ensureReviewerUser } from "@/lib/businesses/reviewer";

/**
 * Reviewer access link: GET /api/businesses/reviewer?key=<token>
 *
 * If the key matches the current reviewer token (managed in the admin), this
 * signs the visitor into a pre-activated reviewer account and drops them on the
 * full marketplace — no OTP, no email, no password. Rotating the token in the
 * admin instantly invalidates old links.
 */
export async function GET(request: NextRequest) {
  const key = request.nextUrl.searchParams.get("key");

  const valid = await validateReviewerToken(key);
  if (!valid) {
    const url = new URL("/businesses/sign-in", request.url);
    url.searchParams.set("error", "invalid_link");
    return NextResponse.redirect(url);
  }

  const userId = await ensureReviewerUser();
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
  const userAgent = request.headers.get("user-agent");
  const token = await createMarketplaceSession(userId, ip, userAgent);

  const response = NextResponse.redirect(new URL("/businesses/listings", request.url));
  response.cookies.set(MARKETPLACE_SESSION_COOKIE, token, marketplaceCookieOptions());
  return response;
}

import { NextRequest, NextResponse } from "next/server";
import { verifyOtp, findUserByEmail, createMarketplaceSession, marketplaceCookieOptions, MARKETPLACE_SESSION_COOKIE } from "@/lib/auth/marketplace";
import { rateLimit, getClientIp } from "@/lib/rate-limit";

export async function POST(request: NextRequest) {
  // A04-2: IP-level cap so per-OTP attempt limits can't be reset by re-issuance.
  const ip = getClientIp(request);
  const rl = await rateLimit("verify_otp", ip, 20, 600);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Too many requests. Please slow down." },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } },
    );
  }

  const body = await request.json().catch(() => ({}));
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const code = typeof body.code === "string" ? body.code.trim() : "";
  const purpose = body.purpose === "signin" || body.purpose === "verify" ? body.purpose : "signup";

  if (!email || !code) {
    return NextResponse.json({ error: "Email and code required" }, { status: 400 });
  }

  const result = await verifyOtp(email, code, purpose);
  if (!result.ok) {
    const messages = {
      invalid: "That code doesn't match. Double-check or request a new one.",
      expired: "That code has expired. Request a new one to continue.",
      too_many_attempts: "Too many attempts. Request a new code to try again.",
    };
    return NextResponse.json({ error: messages[result.reason] }, { status: 400 });
  }

  // OTP verified — issue session.
  const user = await findUserByEmail(email);
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }
  const userAgent = request.headers.get("user-agent");
  // Preserve original semantics: session stores null when IP is unknown, not the string "unknown"
  const sessionIp = ip === "unknown" ? null : ip;
  const token = await createMarketplaceSession(user.id, sessionIp, userAgent);

  const response = NextResponse.json({
    ok: true,
    user: {
      id: user.id,
      email: user.email,
      full_name: user.full_name,
      access_activated: user.access_activated,
      email_verified: true,
    },
  });
  response.cookies.set(MARKETPLACE_SESSION_COOKIE, token, marketplaceCookieOptions());
  return response;
}

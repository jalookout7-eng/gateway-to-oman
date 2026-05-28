import { NextRequest, NextResponse } from "next/server";
import { verifyOtp, findUserByEmail, createMarketplaceSession, marketplaceCookieOptions, MARKETPLACE_SESSION_COOKIE } from "@/lib/auth/marketplace";

export async function POST(request: NextRequest) {
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
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
  const userAgent = request.headers.get("user-agent");
  const token = await createMarketplaceSession(user.id, ip, userAgent);

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

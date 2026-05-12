import { NextRequest, NextResponse } from "next/server";
import { verifyUserPassword, issueOtp } from "@/lib/auth/marketplace";
import { sendOtpEmail } from "@/lib/email/otp";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body.password === "string" ? body.password : "";

  if (!email || !password) {
    return NextResponse.json({ error: "Email and password required" }, { status: 400 });
  }

  const user = await verifyUserPassword(email, password);
  if (!user) {
    // Always 401 — don't reveal whether the email exists.
    return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
  }

  // Email-verification gate: if user never verified their email, require it now.
  // Always send an OTP — the front-end will land on the verify step.
  const purpose: "signup" | "signin" = user.email_verified ? "signin" : "signup";
  const code = await issueOtp(email, purpose);
  await sendOtpEmail(email, code, purpose);

  return NextResponse.json({
    ok: true,
    otp_sent: true,
    requires_verification: !user.email_verified,
    email,
  });
}

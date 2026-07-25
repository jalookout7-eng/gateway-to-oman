import { NextRequest, NextResponse } from "next/server";
import { createUser, findUserByEmail, issueOtp } from "@/lib/auth/marketplace";
import { sendOtpEmail } from "@/lib/email/otp";
import { getDb } from "@/lib/db/client";
import { rateLimit, getClientIp } from "@/lib/rate-limit";

export async function POST(request: NextRequest) {
  // Rate limits on OTP issuance: 10/10min per IP + 1/60s per email (H-1)
  // We apply these early before reading the body so we can check the IP.
  // Email check is deferred until we have the normalised email below.
  const ip = getClientIp(request);
  const rlIp = await rateLimit("otp_ip", ip, 10, 600);
  if (!rlIp.allowed) {
    return NextResponse.json(
      { error: "Too many requests. Please slow down." },
      { status: 429, headers: { "Retry-After": String(rlIp.retryAfterSec) } },
    );
  }

  const body = await request.json().catch(() => ({}));
  const fullName = typeof body.full_name === "string" ? body.full_name.trim() : "";
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const phone = typeof body.phone === "string" ? body.phone.trim() : "";
  const countryCode = typeof body.country_code === "string" ? body.country_code.trim() : "";
  const password = typeof body.password === "string" ? body.password : "";

  if (!fullName || fullName.length < 2) {
    return NextResponse.json({ error: "Please enter your full name" }, { status: 400 });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Valid email required" }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
  }
  if (!phone) {
    return NextResponse.json({ error: "Phone number required" }, { status: 400 });
  }

  // Per-email OTP rate limit: max 1 issuance per 60s per email (closes "fresh OTP bypass" hole)
  const rlEmail = await rateLimit("otp_email:" + email, email, 1, 60);
  if (!rlEmail.allowed) {
    return NextResponse.json(
      { error: "Too many requests. Please slow down." },
      { status: 429, headers: { "Retry-After": String(rlEmail.retryAfterSec) } },
    );
  }

  const existing = await findUserByEmail(email);
  if (existing) {
    if (existing.email_verified) {
      // A07-1: same success shape as a fresh sign-up so responses can't be
      // used to enumerate accounts. Nothing is sent; the real owner's
      // recoverable path is sign-in. Trade-off accepted by JA (item N).
      return NextResponse.json({ ok: true, otp_sent: true });
    }
    // Existing unverified account — let them resend OTP.
    const code = await issueOtp(email, "signup");
    await sendOtpEmail(email, code, "signup");
    return NextResponse.json({ ok: true, otp_sent: true, message: "Verification code re-sent." });
  }

  const userId = await createUser({
    email,
    full_name: fullName,
    password,
    phone,
    country_code: countryCode || null,
  });

  // Create a linked lead row so admin sees this in /admin/inquiries.
  const db = getDb();
  const leadResult = await db.execute({
    sql: `INSERT INTO leads (name, email, phone, country_code, source, interests)
          VALUES (?, ?, ?, ?, 'businesses', ?) RETURNING id`,
    args: [fullName, email, phone, countryCode || null, "Signed up via /businesses/sign-in"],
  });
  const leadId = leadResult.rows[0].id as string;
  await db.execute({
    sql: `UPDATE marketplace_users SET lead_id = ? WHERE id = ?`,
    args: [leadId, userId],
  });

  await db.execute({
    sql: `INSERT INTO activity_log (actor_type, action, target_type, target_id, source, metadata_json)
          VALUES (?, ?, ?, ?, ?, ?)`,
    args: [
      "visitor",
      "marketplace_signup",
      "marketplace_user",
      userId,
      "businesses",
      JSON.stringify({ email, full_name: fullName, phone, country_code: countryCode }),
    ],
  });

  const code = await issueOtp(email, "signup");
  await sendOtpEmail(email, code, "signup");

  return NextResponse.json({ ok: true, otp_sent: true });
}

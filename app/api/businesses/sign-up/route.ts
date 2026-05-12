import { NextRequest, NextResponse } from "next/server";
import { createUser, findUserByEmail, issueOtp } from "@/lib/auth/marketplace";
import { sendOtpEmail } from "@/lib/email/otp";
import { getDb } from "@/lib/db/client";

export async function POST(request: NextRequest) {
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

  const existing = await findUserByEmail(email);
  if (existing) {
    if (existing.email_verified) {
      return NextResponse.json(
        { error: "An account with that email exists. Try signing in instead." },
        { status: 409 },
      );
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

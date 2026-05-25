import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/token";
import { getEmailConfig, sendEmailLegacy } from "@/lib/email/sender";

export async function POST(request: NextRequest) {
  const authError = await requireAuth(request);
  if (authError) return authError;

  const { to } = await request.json();
  const config = await getEmailConfig();

  if (!config) {
    return NextResponse.json({ error: "Email not configured" }, { status: 400 });
  }

  try {
    await sendEmailLegacy(
      to,
      "Gateway to Oman — Test Email",
      "This is a test email from your Gateway to Oman admin dashboard. If you received this, your email configuration is working correctly!",
      config
    );
    return NextResponse.json({ sent: true });
  } catch (error) {
    // M-5: log full error server-side; return generic message to avoid leaking SMTP/infra detail
    console.error("Email test failed:", error);
    return NextResponse.json(
      { error: "Email test failed. Check server logs for details." },
      { status: 500 }
    );
  }
}

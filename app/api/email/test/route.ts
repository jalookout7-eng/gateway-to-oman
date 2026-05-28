import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/token";
import { sendEmail } from "@/lib/email/sender";

/**
 * Send a test email to verify the configured provider works.
 *
 * Reads the provider config from the same `settings` table source as
 * /admin/settings → Email configuration (and as OTP + booking emails).
 * Previously this endpoint used `getEmailConfig()` which read process.env
 * vars that were never set in production, so the button always returned
 * "Email not configured" even when the admin had saved a Resend key.
 */
export async function POST(request: NextRequest) {
  const authError = await requireAuth(request);
  if (authError) return authError;

  const { to } = await request.json().catch(() => ({}));
  if (!to || typeof to !== "string") {
    return NextResponse.json({ error: "Missing 'to' email address" }, { status: 400 });
  }

  try {
    await sendEmail({
      to,
      subject: "Gateway to Oman — Test Email",
      html: `
        <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
          <div style="text-align: center; padding-bottom: 16px;">
            <h1 style="color: #1A1A2E; margin: 0; font-size: 22px;">Gateway to Oman</h1>
          </div>
          <div style="background: #f7f7f5; border-radius: 12px; padding: 28px;">
            <p style="color: #333; margin: 0 0 12px; font-size: 15px;">
              This is a test email from your Gateway to Oman admin dashboard.
            </p>
            <p style="color: #555; margin: 0; font-size: 14px;">
              If you received this, your email configuration is working correctly.
            </p>
          </div>
          <p style="color: #999; font-size: 12px; text-align: center; margin-top: 24px;">
            Gateway to Oman · gatewaytooman.com/businesses
          </p>
        </div>
      `,
    });
    return NextResponse.json({ sent: true });
  } catch (error) {
    // Log full error server-side; return a generic message client-side so SMTP
    // / API key details aren't leaked (audit item M-5).
    console.error("[email/test] failed:", error);
    return NextResponse.json(
      { error: "Email test failed. Check server logs for details." },
      { status: 500 },
    );
  }
}

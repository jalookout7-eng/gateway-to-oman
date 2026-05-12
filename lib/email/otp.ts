/**
 * Send a one-time-passcode email to a marketplace user.
 * Uses the configured email provider via settings (SMTP / Resend / SendGrid).
 * Falls back to console.log when no provider is configured (dev mode).
 */
import { getDb } from "@/lib/db/client";

export async function sendOtpEmail(to: string, code: string, purpose: "signup" | "signin" | "verify") {
  const subject =
    purpose === "signup"
      ? "Your Gateway to Oman verification code"
      : purpose === "signin"
        ? "Your Gateway to Oman sign-in code"
        : "Verify your email — Gateway to Oman";

  const html = `
    <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
      <div style="text-align: center; padding-bottom: 16px;">
        <h1 style="color: #1A1A2E; margin: 0; font-size: 22px;">Gateway to Oman</h1>
      </div>
      <div style="background: #f7f7f5; border-radius: 12px; padding: 28px; text-align: center;">
        <p style="color: #555; margin: 0 0 16px; font-size: 14px;">Your verification code</p>
        <p style="font-size: 36px; font-weight: 700; letter-spacing: 8px; color: #1A1A2E; margin: 0;">
          ${code}
        </p>
        <p style="color: #666; margin: 16px 0 0; font-size: 13px;">
          Valid for 10 minutes. If you didn&apos;t request this, you can ignore this email.
        </p>
      </div>
      <p style="color: #999; font-size: 12px; text-align: center; margin-top: 24px;">
        Gateway to Oman · businesses.gatewaytooman.com
      </p>
    </div>
  `;

  // Try to load email config from DB settings
  const db = getDb();
  const settingsResult = await db.execute("SELECT key, value FROM settings WHERE key LIKE 'email_%'");
  const settings = Object.fromEntries(settingsResult.rows.map((r) => [r.key, r.value])) as Record<string, string>;

  const provider = settings.email_provider;
  const fromName = settings.email_from_name ?? "Gateway to Oman";
  const fromAddress = settings.email_from_address ?? process.env.EMAIL_FROM_ADDRESS ?? "noreply@gatewaytooman.com";
  const from = `${fromName} <${fromAddress}>`;

  // No provider configured — log to server console (dev fallback).
  if (!provider) {
    console.log(`[OTP fallback] To: ${to}, Code: ${code}, Purpose: ${purpose}`);
    return;
  }

  try {
    if (provider === "resend" && settings.email_resend_key) {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${settings.email_resend_key}`,
        },
        body: JSON.stringify({ from, to, subject, html }),
      });
      if (!res.ok) {
        console.error(`[OTP send via Resend] failed: ${res.status} ${await res.text()}`);
      }
      return;
    }

    if (provider === "sendgrid" && settings.email_sendgrid_key) {
      const res = await fetch("https://api.sendgrid.com/v3/mail/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${settings.email_sendgrid_key}`,
        },
        body: JSON.stringify({
          personalizations: [{ to: [{ email: to }] }],
          from: { email: fromAddress, name: fromName },
          subject,
          content: [{ type: "text/html", value: html }],
        }),
      });
      if (!res.ok) {
        console.error(`[OTP send via SendGrid] failed: ${res.status} ${await res.text()}`);
      }
      return;
    }

    if (provider === "smtp" && settings.email_smtp_host) {
      // Lazy-import nodemailer only when needed to keep cold start small.
      const nodemailer = await import("nodemailer");
      const transporter = nodemailer.default.createTransport({
        host: settings.email_smtp_host,
        port: Number(settings.email_smtp_port ?? 587),
        secure: Number(settings.email_smtp_port) === 465,
        auth: settings.email_smtp_user
          ? { user: settings.email_smtp_user, pass: settings.email_smtp_pass }
          : undefined,
      });
      await transporter.sendMail({ from, to, subject, html });
      return;
    }

    console.warn(`[OTP fallback] Provider '${provider}' not fully configured. Code: ${code}`);
  } catch (err) {
    console.error("[OTP send] threw:", err);
  }
}

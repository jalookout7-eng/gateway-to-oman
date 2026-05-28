import nodemailer from "nodemailer";
import { getDb } from "@/lib/db/client";

// ─────────────────────────────────────────────────────────────────────────────
// Public interfaces
// ─────────────────────────────────────────────────────────────────────────────

interface Attachment {
  filename: string;
  /** base64-encoded content for Resend/SendGrid, or string for nodemailer */
  content: string;
  contentType: string;
}

interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  attachments?: Attachment[];
}

interface EmailConfig {
  provider: string;
  smtp?: { host: string; port: number; user: string; pass: string };
  resendApiKey?: string;
  sendgridApiKey?: string;
  fromName: string;
  fromAddress: string;
  replyTo: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Settings loader — single source of truth for the email provider config.
// Reads the same `settings` rows that `/admin/settings → Email configuration`
// writes, and that `lib/email/otp.ts:sendOtpEmail()` also reads.
// ─────────────────────────────────────────────────────────────────────────────

async function loadEmailSettings(): Promise<Record<string, string>> {
  const db = getDb();
  const result = await db.execute(
    "SELECT key, value FROM settings WHERE key LIKE 'email_%'",
  );
  return Object.fromEntries(result.rows.map((r) => [r.key, r.value])) as Record<
    string,
    string
  >;
}

// ─────────────────────────────────────────────────────────────────────────────
// New unified entry point. Replaces the legacy EMAIL_* env-var-based send.
// Used by /api/admin/emails/[id]/send (booking confirmations + admin-approved
// lead follow-up emails). Routes to whichever provider /admin/settings has
// configured (resend / sendgrid / smtp).
// ─────────────────────────────────────────────────────────────────────────────

export async function sendEmail(options: SendEmailOptions): Promise<void> {
  const settings = await loadEmailSettings();
  const provider = settings.email_provider;
  if (!provider) {
    throw new Error(
      "Email is not configured. Go to /admin/settings → Email configuration to choose a provider.",
    );
  }

  const fromName = settings.email_from_name ?? "Gateway to Oman";
  const fromAddress =
    settings.email_from_address ?? "noreply@gatewaytooman.com";
  const replyTo = settings.email_reply_to ?? undefined;
  const from = `${fromName} <${fromAddress}>`;

  if (provider === "resend") {
    if (!settings.email_resend_key) {
      throw new Error(
        "Resend is selected but email_resend_key is missing in settings.",
      );
    }
    const body: Record<string, unknown> = {
      from,
      to: [options.to],
      subject: options.subject,
      html: options.html,
    };
    if (replyTo) body.reply_to = replyTo;
    if (options.attachments && options.attachments.length > 0) {
      body.attachments = options.attachments.map((a) => ({
        filename: a.filename,
        content: a.content,
        content_type: a.contentType,
      }));
    }
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${settings.email_resend_key}`,
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      throw new Error(
        `Resend send failed: ${res.status} ${await res.text()}`,
      );
    }
    return;
  }

  if (provider === "sendgrid") {
    if (!settings.email_sendgrid_key) {
      throw new Error(
        "SendGrid is selected but email_sendgrid_key is missing in settings.",
      );
    }
    const body: Record<string, unknown> = {
      personalizations: [{ to: [{ email: options.to }] }],
      from: { email: fromAddress, name: fromName },
      subject: options.subject,
      content: [{ type: "text/html", value: options.html }],
    };
    if (replyTo) body.reply_to = { email: replyTo };
    if (options.attachments && options.attachments.length > 0) {
      body.attachments = options.attachments.map((a) => ({
        filename: a.filename,
        content: a.content,
        type: a.contentType,
      }));
    }
    const res = await fetch("https://api.sendgrid.com/v3/mail/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${settings.email_sendgrid_key}`,
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      throw new Error(
        `SendGrid send failed: ${res.status} ${await res.text()}`,
      );
    }
    return;
  }

  if (provider === "smtp") {
    if (!settings.email_smtp_host) {
      throw new Error(
        "SMTP is selected but email_smtp_host is missing in settings.",
      );
    }
    const transporter = nodemailer.createTransport({
      host: settings.email_smtp_host,
      port: Number(settings.email_smtp_port ?? 587),
      secure: Number(settings.email_smtp_port) === 465,
      auth: settings.email_smtp_user
        ? {
            user: settings.email_smtp_user,
            pass: settings.email_smtp_pass,
          }
        : undefined,
    });
    await transporter.sendMail({
      from,
      to: options.to,
      subject: options.subject,
      html: options.html,
      replyTo,
      attachments: options.attachments?.map((a) => ({
        filename: a.filename,
        content: a.content,
        contentType: a.contentType,
      })),
    });
    return;
  }

  throw new Error(`Unknown email provider in settings: ${provider}`);
}

// ─────────────────────────────────────────────────────────────────────────────
// Legacy interface used by /api/email/send and /api/email/test.
// Caller passes an explicit EmailConfig (not loaded from settings). Kept as-is
// for backward compatibility — both endpoints already use it.
// ─────────────────────────────────────────────────────────────────────────────

export async function getEmailConfig(): Promise<EmailConfig | null> {
  const provider = process.env.EMAIL_PROVIDER;
  if (!provider) return null;

  return {
    provider,
    smtp:
      provider === "smtp"
        ? {
            host: process.env.SMTP_HOST!,
            port: parseInt(process.env.SMTP_PORT ?? "587"),
            user: process.env.SMTP_USER!,
            pass: process.env.SMTP_PASS!,
          }
        : undefined,
    resendApiKey: process.env.RESEND_API_KEY,
    sendgridApiKey: process.env.SENDGRID_API_KEY,
    fromName: process.env.EMAIL_FROM_NAME ?? "Ahmed Al-Azizi — Gateway to Oman",
    fromAddress: process.env.EMAIL_FROM_ADDRESS ?? "",
    replyTo: process.env.EMAIL_REPLY_TO ?? "azizi@alazizigroup.com",
  };
}

export async function sendEmailLegacy(
  to: string,
  subject: string,
  body: string,
  config: EmailConfig,
): Promise<boolean> {
  const from = `${config.fromName} <${config.fromAddress}>`;

  if (config.provider === "smtp" && config.smtp) {
    const transport = nodemailer.createTransport({
      host: config.smtp.host,
      port: config.smtp.port,
      secure: config.smtp.port === 465,
      auth: { user: config.smtp.user, pass: config.smtp.pass },
    });

    await transport.sendMail({
      from,
      replyTo: config.replyTo,
      to,
      subject,
      text: body,
    });
    return true;
  }

  if (config.provider === "resend" && config.resendApiKey) {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        reply_to: config.replyTo,
        to: [to],
        subject,
        text: body,
      }),
    });
    return response.ok;
  }

  if (config.provider === "sendgrid" && config.sendgridApiKey) {
    const response = await fetch("https://api.sendgrid.com/v3/mail/send", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.sendgridApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: to }] }],
        from: { email: config.fromAddress, name: config.fromName },
        reply_to: { email: config.replyTo },
        subject,
        content: [{ type: "text/plain", value: body }],
      }),
    });
    return response.ok;
  }

  throw new Error(`Unsupported email provider: ${config.provider}`);
}

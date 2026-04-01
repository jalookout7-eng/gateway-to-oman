import nodemailer from "nodemailer";

interface EmailConfig {
  provider: string;
  smtp?: { host: string; port: number; user: string; pass: string };
  resendApiKey?: string;
  sendgridApiKey?: string;
  fromName: string;
  fromAddress: string;
  replyTo: string;
}

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

export async function sendEmail(
  to: string,
  subject: string,
  body: string,
  config: EmailConfig
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

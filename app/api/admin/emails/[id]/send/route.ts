import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db/client";
import { requireAuth } from "@/lib/auth/token";
import { sendEmail } from "@/lib/email/sender";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const authError = requireAuth(request);
  if (authError) return authError;

  const db = getDb();
  const emailRow = await db.execute({
    sql: "SELECT * FROM emails WHERE id = ?",
    args: [params.id],
  });

  if (!emailRow.rows[0]) {
    return NextResponse.json({ error: "Email not found" }, { status: 404 });
  }

  const emailRecord = emailRow.rows[0];
  if (String(emailRecord.status) === "sent") {
    return NextResponse.json({ error: "Already sent" }, { status: 400 });
  }

  let bodyData: { html: string; icsAttachment?: string };
  try {
    bodyData = JSON.parse(String(emailRecord.body));
  } catch {
    return NextResponse.json({ error: "Malformed email body in database" }, { status: 500 });
  }

  await sendEmail({
    to: String(emailRecord.to_address),
    subject: String(emailRecord.subject),
    html: bodyData.html,
    attachments: bodyData.icsAttachment
      ? [{ filename: "consultation.ics", content: bodyData.icsAttachment, contentType: "text/calendar" }]
      : [],
  });

  await db.execute({
    sql: "UPDATE emails SET status = 'sent', approved_at = datetime('now') WHERE id = ?",
    args: [params.id],
  });

  return NextResponse.json({ ok: true });
}

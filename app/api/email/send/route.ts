import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db/client";
import { requireAuth } from "@/lib/auth/token";
import { getEmailConfig, sendEmail } from "@/lib/email/sender";

export async function POST(request: NextRequest) {
  const authError = requireAuth(request);
  if (authError) return authError;

  const { leadId, emailId } = await request.json();
  const db = getDb();

  const emailRow = await db.execute({
    sql: "SELECT * FROM emails WHERE id = ?",
    args: [emailId],
  });

  if (emailRow.rows.length === 0) {
    return NextResponse.json({ error: "Email not found" }, { status: 404 });
  }

  const lead = await db.execute({
    sql: "SELECT * FROM leads WHERE id = ?",
    args: [leadId],
  });

  if (lead.rows.length === 0) {
    return NextResponse.json({ error: "Lead not found" }, { status: 404 });
  }

  const config = await getEmailConfig();
  if (!config) {
    return NextResponse.json({ error: "Email not configured" }, { status: 400 });
  }

  const email = emailRow.rows[0];
  const sent = await sendEmail(
    lead.rows[0].email as string,
    email.subject as string,
    email.body as string,
    config
  );

  if (sent) {
    await db.execute({
      sql: "UPDATE emails SET status = 'sent', sent_at = datetime('now') WHERE id = ?",
      args: [emailId],
    });
  }

  return NextResponse.json({ sent });
}

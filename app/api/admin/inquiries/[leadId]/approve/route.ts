import { NextRequest, NextResponse } from "next/server";
import { requireAuth, getRequestUser } from "@/lib/auth/token";
import { getDb } from "@/lib/db/client";

/**
 * Approve a marketplace access request from /admin/inquiries.
 * - Looks up the linked marketplace_user (by lead_id); if none exists, returns
 *   a clear message — those leads should be approved from /admin/users once
 *   they sign up properly.
 * - Sets access_activated = 1, lead.outcome = 'converted'.
 * - Logs activity_log entry.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ leadId: string }> },
) {
  const authError = await requireAuth(request);
  if (authError) return authError;

  const { leadId } = await params;
  const db = getDb();

  const userResult = await db.execute({
    sql: "SELECT id, email, full_name, access_activated FROM marketplace_users WHERE lead_id = ? LIMIT 1",
    args: [leadId],
  });

  if (userResult.rows.length === 0) {
    return NextResponse.json(
      {
        error:
          "This visitor hasn&apos;t completed sign-up yet. Reach out to them via email or WhatsApp and ask them to sign up at /businesses/sign-in so we can activate their account.",
      },
      { status: 404 },
    );
  }

  const userRow = userResult.rows[0];
  const userId = userRow.id as string;
  if (Number(userRow.access_activated) === 1) {
    return NextResponse.json({ ok: true, already_activated: true });
  }

  await db.execute({
    sql: "UPDATE marketplace_users SET access_activated = 1, updated_at = datetime('now') WHERE id = ?",
    args: [userId],
  });
  await db.execute({
    sql: `UPDATE leads SET outcome = 'converted', outcome_updated_at = datetime('now')
          WHERE id = ? AND outcome != 'converted'`,
    args: [leadId],
  });

  const admin = await getRequestUser(request);
  await db.execute({
    sql: `INSERT INTO activity_log (actor_type, actor_id, action, target_type, target_id, source, metadata_json)
          VALUES (?, ?, ?, ?, ?, ?, ?)`,
    args: [
      admin ? "admin" : "system",
      admin?.id ?? null,
      "marketplace_user_approved_from_inquiry",
      "marketplace_user",
      userId,
      "businesses",
      JSON.stringify({ lead_id: leadId, email: userRow.email }),
    ],
  });

  return NextResponse.json({
    ok: true,
    user: { id: userId, email: userRow.email, full_name: userRow.full_name },
  });
}

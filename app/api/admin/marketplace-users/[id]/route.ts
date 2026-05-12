import { NextRequest, NextResponse } from "next/server";
import { requireAuth, getRequestUser } from "@/lib/auth/token";
import { getDb } from "@/lib/db/client";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const authError = await requireAuth(request);
  if (authError) return authError;

  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const db = getDb();

  const fields: string[] = [];
  const args: (string | number | null)[] = [];

  if (typeof body.access_activated === "boolean") {
    fields.push("access_activated = ?");
    args.push(body.access_activated ? 1 : 0);
  }
  if (typeof body.email_verified === "boolean") {
    fields.push("email_verified = ?");
    args.push(body.email_verified ? 1 : 0);
  }

  if (fields.length === 0) {
    return NextResponse.json({ error: "no updatable fields" }, { status: 400 });
  }
  fields.push("updated_at = datetime('now')");
  args.push(id);

  await db.execute({
    sql: `UPDATE marketplace_users SET ${fields.join(", ")} WHERE id = ?`,
    args,
  });

  // If we just activated access, mark the linked lead outcome = converted.
  if (body.access_activated === true) {
    await db.execute({
      sql: `UPDATE leads SET outcome = 'converted', outcome_updated_at = datetime('now')
            WHERE id IN (SELECT lead_id FROM marketplace_users WHERE id = ?) AND outcome != 'converted'`,
      args: [id],
    });
  }

  const user = await getRequestUser(request);
  await db.execute({
    sql: `INSERT INTO activity_log (actor_type, actor_id, action, target_type, target_id, source, metadata_json)
          VALUES (?, ?, ?, ?, ?, ?, ?)`,
    args: [
      user ? "admin" : "system",
      user?.id ?? null,
      body.access_activated === true ? "marketplace_user_activated" : "marketplace_user_updated",
      "marketplace_user",
      id,
      "businesses",
      JSON.stringify(body),
    ],
  });

  return NextResponse.json({ ok: true });
}

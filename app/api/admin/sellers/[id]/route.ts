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

  if (typeof body.name === "string") { fields.push("name = ?"); args.push(body.name.trim()); }
  if ("email" in body) { fields.push("email = ?"); args.push(body.email ? String(body.email).trim() : null); }
  if ("phone" in body) { fields.push("phone = ?"); args.push(body.phone ? String(body.phone).trim() : null); }
  if ("country_code" in body) { fields.push("country_code = ?"); args.push(body.country_code ? String(body.country_code).trim() : null); }
  if ("notes" in body) { fields.push("notes = ?"); args.push(body.notes ? String(body.notes).trim() : null); }
  if (typeof body.active === "boolean") { fields.push("active = ?"); args.push(body.active ? 1 : 0); }

  if (fields.length === 0) {
    return NextResponse.json({ error: "no updatable fields" }, { status: 400 });
  }
  fields.push("updated_at = datetime('now')");
  args.push(id);

  await db.execute({
    sql: `UPDATE sellers SET ${fields.join(", ")} WHERE id = ?`,
    args,
  });

  const user = await getRequestUser(request);
  await db.execute({
    sql: `INSERT INTO activity_log (actor_type, actor_id, action, target_type, target_id, metadata_json)
          VALUES (?, ?, ?, ?, ?, ?)`,
    args: [
      user ? "admin" : "system",
      user?.id ?? null,
      "seller_updated",
      "seller",
      id,
      JSON.stringify(body),
    ],
  });

  return NextResponse.json({ ok: true });
}

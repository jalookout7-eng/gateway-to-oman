import { NextRequest, NextResponse } from "next/server";
import { requireOwner, getRequestUser } from "@/lib/auth/token";
import { getDb } from "@/lib/db/client";
import { hashPassword } from "@/lib/auth/password";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const authError = await requireOwner(request);
  if (authError) return authError;
  const currentUser = await getRequestUser(request);

  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const db = getDb();

  const fields: string[] = [];
  const args: (string | number | null)[] = [];

  if (typeof body.full_name === "string") {
    fields.push("full_name = ?");
    args.push(body.full_name.trim() || null);
  }
  if (typeof body.active === "boolean") {
    fields.push("active = ?");
    args.push(body.active ? 1 : 0);
  }
  if (["owner", "admin", "viewer"].includes(body.role)) {
    fields.push("role = ?");
    args.push(body.role);
  }
  if (typeof body.password === "string" && body.password.length >= 8) {
    fields.push("password_hash = ?");
    args.push(await hashPassword(body.password));
  }

  if (fields.length === 0) {
    return NextResponse.json({ error: "no updatable fields" }, { status: 400 });
  }
  fields.push("updated_at = datetime('now')");
  args.push(id);

  await db.execute({
    sql: `UPDATE admin_users SET ${fields.join(", ")} WHERE id = ?`,
    args,
  });

  await db.execute({
    sql: `INSERT INTO activity_log (actor_type, actor_id, action, target_type, target_id, metadata_json)
          VALUES (?, ?, ?, ?, ?, ?)`,
    args: [
      currentUser ? "admin" : "system",
      currentUser?.id ?? null,
      "admin_user_updated",
      "admin_user",
      id,
      JSON.stringify({ fields: Object.keys(body) }),
    ],
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const authError = await requireOwner(request);
  if (authError) return authError;
  const currentUser = await getRequestUser(request);

  const { id } = await params;
  if (currentUser?.id === id) {
    return NextResponse.json({ error: "Cannot delete your own account" }, { status: 400 });
  }

  const db = getDb();
  const target = await db.execute({ sql: "SELECT role FROM admin_users WHERE id = ?", args: [id] });
  if (target.rows[0]?.role === "owner") {
    return NextResponse.json({ error: "Cannot delete the owner account. Demote to admin first." }, { status: 400 });
  }

  await db.execute({ sql: "DELETE FROM admin_users WHERE id = ?", args: [id] });

  await db.execute({
    sql: `INSERT INTO activity_log (actor_type, actor_id, action, target_type, target_id)
          VALUES (?, ?, ?, ?, ?)`,
    args: [currentUser ? "admin" : "system", currentUser?.id ?? null, "admin_user_deleted", "admin_user", id],
  });

  return NextResponse.json({ ok: true });
}

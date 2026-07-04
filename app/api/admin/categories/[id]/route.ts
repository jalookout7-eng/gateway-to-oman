import { NextRequest, NextResponse } from "next/server";
import { requireAuth, getRequestUser } from "@/lib/auth/token";
import { getDb } from "@/lib/db/client";

type RouteContext = { params: Promise<{ id: string }> };

/**
 * PATCH /api/admin/categories/[id]
 *   body: { name?, sort_order?, active? }
 *
 * Slug is immutable — rename by updating name only.
 */
export async function PATCH(request: NextRequest, context: RouteContext) {
  const authError = await requireAuth(request);
  if (authError) return authError;

  const { id } = await context.params;

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const sets: string[] = [];
  const args: (string | number | null)[] = [];

  if (body.name !== undefined) {
    if (typeof body.name !== "string" || body.name.trim().length === 0) {
      return NextResponse.json({ error: "name must be a non-empty string" }, { status: 400 });
    }
    if (body.name.length > 80) {
      return NextResponse.json({ error: "name must be ≤ 80 characters" }, { status: 400 });
    }
    sets.push("name = ?");
    args.push(body.name.trim());
  }

  if (body.sort_order !== undefined) {
    if (typeof body.sort_order !== "number" || !Number.isFinite(body.sort_order)) {
      return NextResponse.json({ error: "sort_order must be a number" }, { status: 400 });
    }
    sets.push("sort_order = ?");
    args.push(body.sort_order);
  }

  if (body.active !== undefined) {
    if (typeof body.active !== "boolean") {
      return NextResponse.json({ error: "active must be a boolean" }, { status: 400 });
    }
    sets.push("active = ?");
    args.push(body.active ? 1 : 0);
  }

  if (sets.length === 0) {
    return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
  }

  args.push(id);

  const db = getDb();
  const result = await db.execute({
    sql: `UPDATE categories SET ${sets.join(", ")} WHERE id = ?`,
    args,
  });

  if (result.rowsAffected === 0) {
    return NextResponse.json({ error: "Category not found" }, { status: 404 });
  }

  const user = await getRequestUser(request);
  await db.execute({
    sql: `INSERT INTO activity_log (actor_type, actor_id, action, target_type, target_id, source, metadata_json)
          VALUES ('admin', ?, 'category_update', 'category', ?, 'main', ?)`,
    args: [user?.id ?? null, id, JSON.stringify({ id, changes: body })],
  });

  return NextResponse.json({ ok: true });
}

/**
 * DELETE /api/admin/categories/[id]
 *
 * Hard delete. Blocked if any listings reference this category.
 * Deactivate instead (PATCH active=false) to hide without breaking listings.
 */
export async function DELETE(request: NextRequest, context: RouteContext) {
  const authError = await requireAuth(request);
  if (authError) return authError;

  const { id } = await context.params;
  const db = getDb();

  const refCheck = await db.execute({
    sql: "SELECT COUNT(*) AS n FROM listings WHERE category_id = ?",
    args: [id],
  });
  const refCount = Number(refCheck.rows[0]?.n ?? 0);
  if (refCount > 0) {
    return NextResponse.json(
      {
        error: `Cannot delete: ${refCount} listing(s) use this category. Deactivate it instead, or reassign those listings first.`,
      },
      { status: 409 },
    );
  }

  const result = await db.execute({
    sql: "DELETE FROM categories WHERE id = ?",
    args: [id],
  });

  if (result.rowsAffected === 0) {
    return NextResponse.json({ error: "Category not found" }, { status: 404 });
  }

  const user = await getRequestUser(request);
  await db.execute({
    sql: `INSERT INTO activity_log (actor_type, actor_id, action, target_type, target_id, source, metadata_json)
          VALUES ('admin', ?, 'category_delete', 'category', ?, 'main', ?)`,
    args: [user?.id ?? null, id, JSON.stringify({ id })],
  });

  return NextResponse.json({ ok: true });
}

import { NextRequest, NextResponse } from "next/server";
import { requireAuth, getRequestUser } from "@/lib/auth/token";
import { getDb } from "@/lib/db/client";

const VALID_KINDS = new Set(["status", "qualification", "segment"]);
const VALID_COLORS = new Set([
  "slate", "gray", "zinc", "red", "amber", "yellow",
  "lime", "green", "emerald", "teal", "cyan", "sky",
  "blue", "indigo", "violet", "purple", "pink", "rose",
]);

type RouteContext = { params: Promise<{ kind: string; slug: string }> };

/**
 * PATCH /api/admin/lead-options/[kind]/[slug]
 *   body: { label?, color?, sort_order?, active? }
 *
 * Updates an existing option. The slug is immutable (referential integrity:
 * leads rows reference it as a value). To "rename", deactivate this and add
 * a new one — admin can do that from the UI.
 */
export async function PATCH(request: NextRequest, context: RouteContext) {
  const authError = await requireAuth(request);
  if (authError) return authError;

  const { kind, slug } = await context.params;
  if (!VALID_KINDS.has(kind)) {
    return NextResponse.json({ error: "Invalid kind" }, { status: 400 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const sets: string[] = [];
  const args: (string | number | null)[] = [];

  if (body.label !== undefined) {
    if (typeof body.label !== "string" || body.label.trim().length === 0) {
      return NextResponse.json({ error: "label must be a non-empty string" }, { status: 400 });
    }
    if (body.label.length > 60) {
      return NextResponse.json({ error: "label must be ≤ 60 characters" }, { status: 400 });
    }
    sets.push("label = ?");
    args.push(body.label.trim());
  }

  if (body.color !== undefined) {
    if (body.color !== null && (typeof body.color !== "string" || !VALID_COLORS.has(body.color))) {
      return NextResponse.json(
        { error: `color must be null or one of: ${Array.from(VALID_COLORS).join(", ")}` },
        { status: 400 },
      );
    }
    sets.push("color = ?");
    args.push(body.color as string | null);
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

  sets.push("updated_at = datetime('now')");
  args.push(kind, slug);

  const db = getDb();
  const result = await db.execute({
    sql: `UPDATE lead_options SET ${sets.join(", ")} WHERE kind = ? AND slug = ?`,
    args,
  });

  if (result.rowsAffected === 0) {
    return NextResponse.json({ error: "Option not found" }, { status: 404 });
  }

  const user = await getRequestUser(request);
  await db.execute({
    sql: `INSERT INTO activity_log (actor_type, actor_id, action, target_type, target_id, source, metadata_json)
          VALUES ('admin', ?, 'lead_option_update', 'lead_option', ?, 'main', ?)`,
    args: [user?.id ?? null, `${kind}:${slug}`, JSON.stringify({ kind, slug, changes: body })],
  });

  return NextResponse.json({ ok: true });
}

/**
 * DELETE /api/admin/lead-options/[kind]/[slug]
 *
 * Hard delete. The admin UI should normally call PATCH active=false instead
 * (soft delete) to preserve referential clarity with existing leads. We allow
 * hard delete for genuine cleanup (typos, never-used options).
 */
export async function DELETE(request: NextRequest, context: RouteContext) {
  const authError = await requireAuth(request);
  if (authError) return authError;

  const { kind, slug } = await context.params;
  if (!VALID_KINDS.has(kind)) {
    return NextResponse.json({ error: "Invalid kind" }, { status: 400 });
  }

  const db = getDb();

  // Warn (not block) if leads reference this slug — admin chose hard delete
  // knowingly. Report the affected count in the activity log.
  const column = kind; // 'status' | 'qualification' | 'segment' — column name matches kind
  const refCheck = await db.execute({
    sql: `SELECT COUNT(*) AS n FROM leads WHERE ${column} = ?`,
    args: [slug],
  });
  const refCount = Number(refCheck.rows[0]?.n ?? 0);

  const result = await db.execute({
    sql: "DELETE FROM lead_options WHERE kind = ? AND slug = ?",
    args: [kind, slug],
  });

  if (result.rowsAffected === 0) {
    return NextResponse.json({ error: "Option not found" }, { status: 404 });
  }

  const user = await getRequestUser(request);
  await db.execute({
    sql: `INSERT INTO activity_log (actor_type, actor_id, action, target_type, target_id, source, metadata_json)
          VALUES ('admin', ?, 'lead_option_delete', 'lead_option', ?, 'main', ?)`,
    args: [user?.id ?? null, `${kind}:${slug}`, JSON.stringify({ kind, slug, leads_referencing: refCount })],
  });

  return NextResponse.json({ ok: true, leads_referencing: refCount });
}

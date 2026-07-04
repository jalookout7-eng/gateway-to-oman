import { NextRequest, NextResponse } from "next/server";
import { requireAuth, getRequestUser } from "@/lib/auth/token";
import { getDb } from "@/lib/db/client";

function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 60);
}

/**
 * GET /api/admin/categories
 *   ?includeInactive=1  -> include deactivated categories (default: active only)
 *
 * Returns: { categories: [{ id, slug, name, active, sort_order }, ...] }
 */
export async function GET(request: NextRequest) {
  const authError = await requireAuth(request);
  if (authError) return authError;

  const url = new URL(request.url);
  const includeInactive = url.searchParams.get("includeInactive") === "1";

  const db = getDb();
  const result = await db.execute({
    sql: `SELECT id, slug, name, active, sort_order
          FROM categories
          ${includeInactive ? "" : "WHERE active = 1"}
          ORDER BY sort_order ASC, name ASC`,
    args: [],
  });

  return NextResponse.json({
    categories: result.rows.map((r) => ({
      id: r.id as string,
      slug: r.slug as string,
      name: r.name as string,
      active: Number(r.active) === 1,
      sort_order: Number(r.sort_order),
    })),
  });
}

/**
 * POST /api/admin/categories
 *   body: { name, sort_order? }
 *
 * Creates a new category. Slug is derived from name.
 */
export async function POST(request: NextRequest) {
  const authError = await requireAuth(request);
  if (authError) return authError;

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const name = body.name as string | undefined;
  const sortOrder = body.sort_order as number | undefined;

  if (!name || typeof name !== "string" || name.trim().length === 0) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }
  if (name.length > 80) {
    return NextResponse.json({ error: "name must be ≤ 80 characters" }, { status: 400 });
  }
  if (sortOrder !== undefined && (typeof sortOrder !== "number" || !Number.isFinite(sortOrder))) {
    return NextResponse.json({ error: "sort_order must be a number" }, { status: 400 });
  }

  const slug = slugify(name);
  if (!slug) {
    return NextResponse.json({ error: "could not derive a valid slug from name" }, { status: 400 });
  }

  const db = getDb();

  const existing = await db.execute({
    sql: "SELECT id FROM categories WHERE slug = ?",
    args: [slug],
  });
  if (existing.rows.length > 0) {
    return NextResponse.json(
      { error: `A category with slug '${slug}' already exists` },
      { status: 409 },
    );
  }

  const idResult = await db.execute({
    sql: `INSERT INTO categories (slug, name, sort_order) VALUES (?, ?, ?) RETURNING id`,
    args: [slug, name.trim(), sortOrder ?? 0],
  });
  const id = idResult.rows[0]?.id as string;

  const user = await getRequestUser(request);
  await db.execute({
    sql: `INSERT INTO activity_log (actor_type, actor_id, action, target_type, target_id, source, metadata_json)
          VALUES ('admin', ?, 'category_create', 'category', ?, 'main', ?)`,
    args: [user?.id ?? null, id, JSON.stringify({ slug, name: name.trim() })],
  });

  return NextResponse.json(
    { id, slug, name: name.trim(), active: true, sort_order: sortOrder ?? 0 },
    { status: 201 },
  );
}

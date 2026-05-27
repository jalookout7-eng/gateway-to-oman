import { NextRequest, NextResponse } from "next/server";
import { requireAuth, getRequestUser } from "@/lib/auth/token";
import { getDb } from "@/lib/db/client";

// Valid `kind` values — these are the only three lead attributes that have
// admin-editable lookups. They match the seed in lib/db/schema.sql.
const VALID_KINDS = new Set(["status", "qualification", "segment"]);

// Tailwind colour tokens allowed in the chip palette. Constrained so a bad
// admin entry can't inject arbitrary class strings into the leads UI.
const VALID_COLORS = new Set([
  "slate", "gray", "zinc", "red", "amber", "yellow",
  "lime", "green", "emerald", "teal", "cyan", "sky",
  "blue", "indigo", "violet", "purple", "pink", "rose",
]);

function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 40);
}

/**
 * GET /api/admin/lead-options
 *   ?kind=status         -> only that kind
 *   ?includeInactive=1   -> include soft-deleted rows (default: active only)
 *
 * Returns: { options: [{ kind, slug, label, color, sort_order, active }, ...] }
 */
export async function GET(request: NextRequest) {
  const authError = await requireAuth(request);
  if (authError) return authError;

  const url = new URL(request.url);
  const kind = url.searchParams.get("kind");
  const includeInactive = url.searchParams.get("includeInactive") === "1";

  const where: string[] = [];
  const args: (string | number)[] = [];
  if (kind) {
    if (!VALID_KINDS.has(kind)) {
      return NextResponse.json(
        { error: `Invalid kind. Must be one of: ${Array.from(VALID_KINDS).join(", ")}` },
        { status: 400 },
      );
    }
    where.push("kind = ?");
    args.push(kind);
  }
  if (!includeInactive) {
    where.push("active = 1");
  }
  const whereClause = where.length > 0 ? `WHERE ${where.join(" AND ")}` : "";

  const db = getDb();
  const result = await db.execute({
    sql: `SELECT kind, slug, label, color, sort_order, active
          FROM lead_options
          ${whereClause}
          ORDER BY kind ASC, sort_order ASC, label ASC`,
    args,
  });

  return NextResponse.json({
    options: result.rows.map((r) => ({
      kind: r.kind as string,
      slug: r.slug as string,
      label: r.label as string,
      color: (r.color as string | null) ?? null,
      sort_order: Number(r.sort_order),
      active: Number(r.active) === 1,
    })),
  });
}

/**
 * POST /api/admin/lead-options
 *   body: { kind, label, slug?, color?, sort_order? }
 *
 * Creates a new option. If slug is omitted, derives it from label.
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

  const kind = body.kind as string | undefined;
  const label = body.label as string | undefined;
  const explicitSlug = body.slug as string | undefined;
  const color = body.color as string | undefined;
  const sortOrder = body.sort_order as number | undefined;

  if (!kind || !VALID_KINDS.has(kind)) {
    return NextResponse.json(
      { error: `kind is required and must be one of: ${Array.from(VALID_KINDS).join(", ")}` },
      { status: 400 },
    );
  }
  if (!label || typeof label !== "string" || label.trim().length === 0) {
    return NextResponse.json({ error: "label is required" }, { status: 400 });
  }
  if (label.length > 60) {
    return NextResponse.json({ error: "label must be ≤ 60 characters" }, { status: 400 });
  }
  if (color && !VALID_COLORS.has(color)) {
    return NextResponse.json(
      { error: `color must be one of: ${Array.from(VALID_COLORS).join(", ")}` },
      { status: 400 },
    );
  }
  if (sortOrder !== undefined && (typeof sortOrder !== "number" || !Number.isFinite(sortOrder))) {
    return NextResponse.json({ error: "sort_order must be a number" }, { status: 400 });
  }

  const slug = explicitSlug ? slugify(explicitSlug) : slugify(label);
  if (!slug) {
    return NextResponse.json({ error: "could not derive a valid slug from label" }, { status: 400 });
  }

  const db = getDb();

  // Reject duplicates (kind, slug) — PK would error anyway but a clean message helps.
  const existing = await db.execute({
    sql: "SELECT slug FROM lead_options WHERE kind = ? AND slug = ?",
    args: [kind, slug],
  });
  if (existing.rows.length > 0) {
    return NextResponse.json(
      { error: `An option with slug '${slug}' already exists in '${kind}'` },
      { status: 409 },
    );
  }

  await db.execute({
    sql: `INSERT INTO lead_options (kind, slug, label, color, sort_order)
          VALUES (?, ?, ?, ?, ?)`,
    args: [kind, slug, label.trim(), color ?? null, sortOrder ?? 0],
  });

  const user = await getRequestUser(request);
  await db.execute({
    sql: `INSERT INTO activity_log (actor_type, actor_id, action, target_type, target_id, source, metadata_json)
          VALUES ('admin', ?, 'lead_option_create', 'lead_option', ?, 'main', ?)`,
    args: [user?.id ?? null, `${kind}:${slug}`, JSON.stringify({ kind, slug, label, color, sort_order: sortOrder })],
  });

  return NextResponse.json({ kind, slug, label, color: color ?? null, sort_order: sortOrder ?? 0, active: true }, { status: 201 });
}

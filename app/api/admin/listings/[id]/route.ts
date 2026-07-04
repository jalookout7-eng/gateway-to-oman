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

  if (typeof body.title === "string") { fields.push("title = ?"); args.push(body.title.trim()); }
  if (typeof body.category_slug === "string" && body.category_slug.trim()) {
    const cat = await db.execute({
      sql: "SELECT id FROM categories WHERE slug = ?",
      args: [body.category_slug.trim()],
    });
    if (cat.rows.length === 0) {
      return NextResponse.json({ error: `unknown category '${body.category_slug}'` }, { status: 400 });
    }
    fields.push("category_id = ?");
    args.push(cat.rows[0].id as string);
  }
  if ("status" in body && ["available", "reserved", "sold"].includes(body.status)) {
    fields.push("status = ?"); args.push(body.status);
  }
  if (typeof body.published === "boolean") { fields.push("published = ?"); args.push(body.published ? 1 : 0); }
  if (typeof body.for_sale === "boolean") { fields.push("for_sale = ?"); args.push(body.for_sale ? 1 : 0); }
  if (typeof body.for_rent === "boolean") { fields.push("for_rent = ?"); args.push(body.for_rent ? 1 : 0); }
  if ("selling_price_omr" in body) {
    fields.push("selling_price_omr = ?");
    args.push(body.selling_price_omr === null ? null : Math.max(0, Number(body.selling_price_omr)));
  }
  if ("rental_price_omr" in body) {
    fields.push("rental_price_omr = ?");
    args.push(body.rental_price_omr === null ? null : Math.max(0, Number(body.rental_price_omr)));
  }
  if ("location_city" in body) { fields.push("location_city = ?"); args.push(body.location_city ? String(body.location_city).trim() : null); }
  if ("area" in body) { fields.push("area = ?"); args.push(body.area ? String(body.area).trim() : null); }
  if ("full_detail_text" in body) { fields.push("full_detail_text = ?"); args.push(body.full_detail_text ? String(body.full_detail_text).trim() : null); }

  if (fields.length === 0) {
    return NextResponse.json({ error: "no updatable fields" }, { status: 400 });
  }
  fields.push("updated_at = datetime('now')");
  args.push(id);

  await db.execute({
    sql: `UPDATE listings SET ${fields.join(", ")} WHERE id = ?`,
    args,
  });

  const user = await getRequestUser(request);
  await db.execute({
    sql: `INSERT INTO activity_log (actor_type, actor_id, action, target_type, target_id, source, metadata_json)
          VALUES (?, ?, ?, ?, ?, ?, ?)`,
    args: [
      user ? "admin" : "system",
      user?.id ?? null,
      "listing_updated",
      "listing",
      id,
      "businesses",
      JSON.stringify(body),
    ],
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const authError = await requireAuth(request);
  if (authError) return authError;

  const { id } = await params;
  const db = getDb();

  // Soft check: if listing has inquiries, prefer to mark as sold rather than delete.
  const inq = await db.execute({
    sql: "SELECT COUNT(*) as c FROM inquiries WHERE listing_id = ?",
    args: [id],
  });
  if (Number(inq.rows[0].c) > 0) {
    return NextResponse.json(
      {
        error:
          "This listing has buyer inquiries linked to it. Mark it Sold or Reserved instead of deleting, to preserve the audit trail.",
      },
      { status: 409 },
    );
  }

  await db.execute({ sql: "DELETE FROM listings WHERE id = ?", args: [id] });

  const user = await getRequestUser(request);
  await db.execute({
    sql: `INSERT INTO activity_log (actor_type, actor_id, action, target_type, target_id, source)
          VALUES (?, ?, ?, ?, ?, ?)`,
    args: [user ? "admin" : "system", user?.id ?? null, "listing_deleted", "listing", id, "businesses"],
  });

  return NextResponse.json({ ok: true });
}

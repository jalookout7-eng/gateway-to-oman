import { NextRequest, NextResponse } from "next/server";
import { requireAuth, getRequestUser } from "@/lib/auth/token";
import { getDb } from "@/lib/db/client";

export async function GET(request: NextRequest) {
  const authError = await requireAuth(request);
  if (authError) return authError;

  const db = getDb();
  const result = await db.execute(`
    SELECT
      s.id, s.name, s.email, s.phone, s.country_code, s.notes,
      s.active, s.lead_id, s.created_at, s.updated_at,
      l.email AS lead_email,
      l.source AS lead_source,
      (SELECT COUNT(*) FROM listings WHERE seller_id = s.id) AS listing_count
    FROM sellers s
    LEFT JOIN leads l ON l.id = s.lead_id
    ORDER BY s.active DESC, s.created_at DESC
  `);

  return NextResponse.json({
    sellers: result.rows.map((row) => ({
      id: row.id,
      name: row.name,
      email: row.email,
      phone: row.phone,
      country_code: row.country_code,
      notes: row.notes,
      active: Number(row.active) === 1,
      lead_id: row.lead_id,
      lead_email: row.lead_email,
      lead_source: row.lead_source,
      listing_count: Number(row.listing_count ?? 0),
      created_at: row.created_at,
      updated_at: row.updated_at,
    })),
  });
}

export async function POST(request: NextRequest) {
  const authError = await requireAuth(request);
  if (authError) return authError;

  const body = await request.json().catch(() => ({}));
  const name = String(body.name ?? "").trim();
  if (!name) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }
  const email = body.email ? String(body.email).trim() : null;
  const phone = body.phone ? String(body.phone).trim() : null;
  const country_code = body.country_code ? String(body.country_code).trim() : null;
  const notes = body.notes ? String(body.notes).trim() : null;
  const lead_id = body.lead_id ? String(body.lead_id) : null;

  const db = getDb();
  const inserted = await db.execute({
    sql: `INSERT INTO sellers (name, email, phone, country_code, notes, lead_id)
          VALUES (?, ?, ?, ?, ?, ?) RETURNING id`,
    args: [name, email, phone, country_code, notes, lead_id],
  });
  const sellerId = inserted.rows[0].id as string;

  const user = await getRequestUser(request);
  await db.execute({
    sql: `INSERT INTO activity_log (actor_type, actor_id, action, target_type, target_id, metadata_json)
          VALUES (?, ?, ?, ?, ?, ?)`,
    args: [
      user ? "admin" : "system",
      user?.id ?? null,
      "seller_created",
      "seller",
      sellerId,
      JSON.stringify({ name, email, linked_lead: lead_id }),
    ],
  });

  return NextResponse.json({ id: sellerId }, { status: 201 });
}

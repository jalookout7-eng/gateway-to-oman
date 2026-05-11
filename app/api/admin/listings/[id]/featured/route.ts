import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/token";
import { getDb } from "@/lib/db/client";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const authError = requireAuth(request);
  if (authError) return authError;

  const { id } = await params;
  let body: { featured?: boolean; featured_rank?: number | null };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (typeof body.featured !== "boolean") {
    return NextResponse.json({ error: "Missing or invalid 'featured' boolean" }, { status: 400 });
  }

  const db = getDb();
  const existing = await db.execute({
    sql: "SELECT id, featured FROM listings WHERE id = ?",
    args: [id],
  });
  if (existing.rows.length === 0) {
    return NextResponse.json({ error: "Listing not found" }, { status: 404 });
  }

  let nextRank: number | null;
  if (body.featured) {
    if (typeof body.featured_rank === "number") {
      nextRank = Math.max(1, Math.floor(body.featured_rank));
    } else {
      const count = await db.execute("SELECT COUNT(*) AS c FROM listings WHERE featured = 1");
      nextRank = (Number(count.rows[0]?.c) || 0) + 1;
    }
  } else {
    nextRank = null;
  }

  await db.execute({
    sql: `UPDATE listings SET featured = ?, featured_rank = ?, updated_at = datetime('now') WHERE id = ?`,
    args: [body.featured ? 1 : 0, nextRank, id],
  });

  await db.execute({
    sql: `INSERT INTO activity_log (actor_type, action, target_type, target_id, source, metadata_json)
          VALUES ('admin', ?, 'listings', ?, 'main', ?)`,
    args: [
      body.featured ? "listing_featured" : "listing_unfeatured",
      id,
      JSON.stringify({ featured: body.featured, featured_rank: nextRank }),
    ],
  });

  return NextResponse.json({ ok: true, id, featured: body.featured, featured_rank: nextRank });
}

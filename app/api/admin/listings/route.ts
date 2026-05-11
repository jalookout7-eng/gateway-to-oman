import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/token";
import { getDb } from "@/lib/db/client";

export async function GET(request: NextRequest) {
  const authError = requireAuth(request);
  if (authError) return authError;

  const db = getDb();
  const result = await db.execute(`
    SELECT
      l.id, l.title, l.slug, l.location_city, l.area,
      l.for_sale, l.for_rent, l.selling_price_omr, l.rental_price_omr,
      l.status, l.published, l.featured, l.featured_rank,
      l.age_years, l.employee_count,
      l.created_at, l.updated_at,
      c.slug AS category_slug, c.name AS category_name,
      (SELECT COUNT(*) FROM inquiries i WHERE i.listing_id = l.id) AS inquiry_count
    FROM listings l
    JOIN categories c ON c.id = l.category_id
    ORDER BY l.featured DESC, l.featured_rank ASC NULLS LAST, l.created_at DESC
  `);

  return NextResponse.json({
    listings: result.rows.map((row) => ({
      id: row.id,
      title: row.title,
      slug: row.slug,
      location_city: row.location_city,
      area: row.area,
      for_sale: Number(row.for_sale) === 1,
      for_rent: Number(row.for_rent) === 1,
      selling_price_omr: row.selling_price_omr,
      rental_price_omr: row.rental_price_omr,
      status: row.status,
      published: Number(row.published) === 1,
      featured: Number(row.featured ?? 0) === 1,
      featured_rank: row.featured_rank ?? null,
      age_years: row.age_years,
      employee_count: row.employee_count,
      created_at: row.created_at,
      updated_at: row.updated_at,
      category_slug: row.category_slug,
      category_name: row.category_name,
      inquiry_count: Number(row.inquiry_count),
    })),
  });
}

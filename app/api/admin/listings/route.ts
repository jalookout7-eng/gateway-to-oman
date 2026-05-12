import { NextRequest, NextResponse } from "next/server";
import { requireAuth, getRequestUser } from "@/lib/auth/token";
import { getDb } from "@/lib/db/client";

export async function GET(request: NextRequest) {
  const authError = await requireAuth(request);
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

function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export async function POST(request: NextRequest) {
  const authError = await requireAuth(request);
  if (authError) return authError;

  const body = await request.json().catch(() => ({}));
  const title = typeof body.title === "string" ? body.title.trim() : "";
  const categorySlug = typeof body.category_slug === "string" ? body.category_slug.trim() : "";
  if (!title) return NextResponse.json({ error: "title is required" }, { status: 400 });
  if (!categorySlug) return NextResponse.json({ error: "category_slug is required" }, { status: 400 });

  const db = getDb();
  const cat = await db.execute({
    sql: "SELECT id FROM categories WHERE slug = ?",
    args: [categorySlug],
  });
  if (cat.rows.length === 0) {
    return NextResponse.json({ error: `unknown category '${categorySlug}'` }, { status: 400 });
  }
  const categoryId = cat.rows[0].id as string;

  // Generate a unique slug — append a short suffix if the base is taken.
  let slug = slugify(title);
  if (!slug) slug = "listing";
  const existing = await db.execute({ sql: "SELECT slug FROM listings WHERE slug LIKE ?", args: [`${slug}%`] });
  const takenSlugs = new Set(existing.rows.map((r) => String(r.slug)));
  let uniqueSlug = slug;
  let n = 2;
  while (takenSlugs.has(uniqueSlug)) {
    uniqueSlug = `${slug}-${n++}`;
  }

  const forSale = body.for_sale === false ? 0 : 1;
  const forRent = body.for_rent === true ? 1 : 0;
  const sellingPrice = body.selling_price_omr ? Math.max(0, Number(body.selling_price_omr)) : null;
  const rentalPrice = body.rental_price_omr ? Math.max(0, Number(body.rental_price_omr)) : null;
  const ageYears = body.age_years ? Number(body.age_years) : null;
  const employeeCount = body.employee_count ? Math.max(0, parseInt(String(body.employee_count), 10)) : null;
  const locationCity = body.location_city ? String(body.location_city).trim() : null;
  const area = body.area ? String(body.area).trim() : null;
  const status = ["available", "reserved", "sold"].includes(body.status) ? body.status : "available";
  const published = body.published === false ? 0 : 1;
  const sellerId = body.seller_id ? String(body.seller_id) : null;
  const description = body.full_detail_text ? String(body.full_detail_text).trim() : null;

  const inserted = await db.execute({
    sql: `INSERT INTO listings (
            category_id, seller_id, title, slug, location_city, area,
            for_sale, for_rent, selling_price_omr, rental_price_omr,
            age_years, employee_count, status, published, full_detail_text
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          RETURNING id`,
    args: [
      categoryId, sellerId, title, uniqueSlug, locationCity, area,
      forSale, forRent, sellingPrice, rentalPrice,
      ageYears, employeeCount, status, published, description,
    ],
  });
  const listingId = inserted.rows[0].id as string;

  const user = await getRequestUser(request);
  await db.execute({
    sql: `INSERT INTO activity_log (actor_type, actor_id, action, target_type, target_id, source, metadata_json)
          VALUES (?, ?, ?, ?, ?, ?, ?)`,
    args: [
      user ? "admin" : "system",
      user?.id ?? null,
      "listing_created",
      "listing",
      listingId,
      "businesses",
      JSON.stringify({ title, slug: uniqueSlug, category_slug: categorySlug }),
    ],
  });

  return NextResponse.json({ id: listingId, slug: uniqueSlug }, { status: 201 });
}

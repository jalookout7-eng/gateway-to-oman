import { getDb } from "@/lib/db/client";
import type { Category, Listing, ListingFilters } from "./types";

function rowToListing(row: Record<string, unknown>): Listing {
  return {
    id: row.id as string,
    seller_id: (row.seller_id as string | null) ?? null,
    category_id: row.category_id as string,
    category_slug: row.category_slug as string,
    category_name: row.category_name as string,
    title: row.title as string,
    slug: row.slug as string,
    area: (row.area as string | null) ?? null,
    location_city: (row.location_city as string | null) ?? null,
    for_sale: Number(row.for_sale) === 1,
    for_rent: Number(row.for_rent) === 1,
    selling_price_omr: row.selling_price_omr as number | null,
    rental_price_omr: row.rental_price_omr as number | null,
    processing_fee_omr: Number(row.processing_fee_omr ?? 500),
    stock_value_omr: row.stock_value_omr as number | null,
    commercial_registration_included: Number(row.commercial_registration_included) === 1,
    age_years: row.age_years as number | null,
    employee_count: row.employee_count as number | null,
    financials_text: (row.financials_text as string | null) ?? null,
    pros_text: (row.pros_text as string | null) ?? null,
    cons_text: (row.cons_text as string | null) ?? null,
    full_detail_text: (row.full_detail_text as string | null) ?? null,
    cover_image_url: (row.cover_image_url as string | null) ?? null,
    gallery_json: (row.gallery_json as string | null) ?? null,
    video_url: (row.video_url as string | null) ?? null,
    status: row.status as Listing["status"],
    published: Number(row.published) === 1,
    featured: Number(row.featured ?? 0) === 1,
    featured_rank: (row.featured_rank as number | null) ?? null,
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
  };
}

export async function listCategories(): Promise<Category[]> {
  const db = getDb();
  const result = await db.execute(
    `SELECT id, slug, name, icon, active, sort_order
     FROM categories
     WHERE active = 1
     ORDER BY sort_order ASC, name ASC`,
  );
  return result.rows.map((row) => ({
    id: row.id as string,
    slug: row.slug as string,
    name: row.name as string,
    icon: (row.icon as string | null) ?? null,
    active: Number(row.active) === 1,
    sort_order: Number(row.sort_order),
  }));
}

export async function listListings(filters: ListingFilters = {}): Promise<Listing[]> {
  const db = getDb();
  const where: string[] = ["l.published = 1"];
  const args: (string | number)[] = [];

  if (filters.categorySlug) {
    where.push("c.slug = ?");
    args.push(filters.categorySlug);
  }
  if (filters.city) {
    where.push("l.location_city = ?");
    args.push(filters.city);
  }
  if (filters.minPrice !== undefined) {
    where.push("l.selling_price_omr >= ?");
    args.push(filters.minPrice);
  }
  if (filters.maxPrice !== undefined) {
    where.push("l.selling_price_omr <= ?");
    args.push(filters.maxPrice);
  }
  if (filters.status) {
    where.push("l.status = ?");
    args.push(filters.status);
  }
  if (filters.forRent !== undefined) {
    where.push("l.for_rent = ?");
    args.push(filters.forRent ? 1 : 0);
  }
  if (filters.search) {
    where.push("(l.title LIKE ? OR l.full_detail_text LIKE ? OR l.location_city LIKE ?)");
    const pattern = `%${filters.search}%`;
    args.push(pattern, pattern, pattern);
  }
  if (filters.featuredOnly) {
    where.push("l.featured = 1");
  }

  let orderBy = "l.featured DESC, l.featured_rank ASC NULLS LAST, l.created_at DESC";
  if (filters.sort === "price-asc") orderBy = "l.selling_price_omr ASC NULLS LAST, l.created_at DESC";
  else if (filters.sort === "price-desc") orderBy = "l.selling_price_omr DESC NULLS LAST, l.created_at DESC";

  const limitClause = filters.limit ? `LIMIT ${Math.max(1, Math.floor(filters.limit))}` : "";

  const sql = `
    SELECT l.*, c.slug AS category_slug, c.name AS category_name
    FROM listings l
    JOIN categories c ON c.id = l.category_id
    WHERE ${where.join(" AND ")}
    ORDER BY ${orderBy}
    ${limitClause}
  `;
  const result = await db.execute({ sql, args });
  return result.rows.map((row) => rowToListing(row as Record<string, unknown>));
}

export async function getListingBySlug(slug: string): Promise<Listing | null> {
  const db = getDb();
  const result = await db.execute({
    sql: `SELECT l.*, c.slug AS category_slug, c.name AS category_name
          FROM listings l
          JOIN categories c ON c.id = l.category_id
          WHERE l.slug = ? AND l.published = 1
          LIMIT 1`,
    args: [slug],
  });
  if (result.rows.length === 0) return null;
  return rowToListing(result.rows[0] as Record<string, unknown>);
}

export async function listCities(): Promise<string[]> {
  const db = getDb();
  const result = await db.execute(
    `SELECT DISTINCT location_city FROM listings
     WHERE published = 1 AND location_city IS NOT NULL
     ORDER BY location_city ASC`,
  );
  return result.rows.map((row) => row.location_city as string);
}

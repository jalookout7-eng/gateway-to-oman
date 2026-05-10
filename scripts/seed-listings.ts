import { createClient } from "@libsql/client";
import { readFileSync, existsSync } from "fs";
import { resolve } from "path";

const envPath = resolve(__dirname, "../.env");
if (existsSync(envPath)) {
  const envContent = readFileSync(envPath, "utf-8");
  for (const line of envContent.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const value = trimmed.slice(eqIdx + 1).trim();
    if (!process.env[key]) process.env[key] = value;
  }
}

type Seed = {
  slug: string;
  category_slug: string;
  title: string;
  area: string | null;
  location_city: string;
  for_sale: 0 | 1;
  for_rent: 0 | 1;
  selling_price_omr: number | null;
  rental_price_omr: number | null;
  processing_fee_omr: number;
  stock_value_omr: number | null;
  commercial_registration_included: 0 | 1;
  age_years: number | null;
  employee_count: number | null;
  financials_text: string;
  pros_text: string;
  cons_text: string;
  full_detail_text: string;
  status: "available" | "reserved" | "sold";
};

const seeds: Seed[] = [
  {
    slug: "muscat-bay-laundry",
    category_slug: "laundry",
    title: "Laundry — Muscat Bay",
    area: "Muscat Bay",
    location_city: "Muscat",
    for_sale: 1,
    for_rent: 0,
    selling_price_omr: null,
    rental_price_omr: null,
    processing_fee_omr: 500,
    stock_value_omr: null,
    commercial_registration_included: 1,
    age_years: 2,
    employee_count: 2,
    financials_text:
      "Average monthly revenue: OMR 550. Net monthly income: usually break-even. Shop rent: OMR 261 (grace period available). Electricity ~OMR 40/month. Water ~OMR 60/month. Salaries: OMR 180 (Indian — manager & driver), OMR 150 (Bangladeshi — cleaning supervisor). Financial records available.",
    pros_text:
      "2 years operating, established location in Muscat Bay, financial records available, grace period on rent.",
    cons_text:
      "Currently break-even. Buyer needs operational time and growth strategy to scale revenue.",
    full_detail_text:
      "42 sqm premises. 2 employees (Indian, Bangladeshi). Reason for sale: lack of time to manage and further develop the business.",
    status: "available",
  },
  {
    slug: "muscat-travel-agency",
    category_slug: "travel-agency",
    title: "Travel Agency — Muscat",
    area: null,
    location_city: "Muscat",
    for_sale: 1,
    for_rent: 0,
    selling_price_omr: 23000,
    rental_price_omr: null,
    processing_fee_omr: 500,
    stock_value_omr: null,
    commercial_registration_included: 1,
    age_years: null,
    employee_count: null,
    financials_text: "Asking OMR 23,000. 100% foreign ownership permitted under current regulations.",
    pros_text: "100% foreign ownership allowed. Established travel-agency licence. Muscat-based.",
    cons_text: "Owner must be physically based on the ground in Oman to operate.",
    full_detail_text:
      "Travel agency for sale in Muscat. 100% foreign ownership allowed. Owner-operator required to be on the ground to run it. Shortlist by direct inquiry.",
    status: "available",
  },
  {
    slug: "sohar-industrial-factory",
    category_slug: "industrial-commercial",
    title: "Industrial Factory — Sohar (Sale or Rent)",
    area: "Phase 7, Sohar Industrial Estate",
    location_city: "Sohar",
    for_sale: 1,
    for_rent: 1,
    selling_price_omr: 250000,
    rental_price_omr: 3500,
    processing_fee_omr: 500,
    stock_value_omr: null,
    commercial_registration_included: 1,
    age_years: null,
    employee_count: null,
    financials_text:
      "Independently valued at OMR 400,000 by Realty Gate LLC (2019). Asking OMR 250,000 (serious negotiation possible). Or rent at OMR 3,500/month.",
    pros_text:
      "Significant valuation gap (OMR 400K valuation vs OMR 250K asking). 10,000 sqm land, ~4,000 sqm built-up. Full utilities (electricity, water, gas, road access). 1 km from Oman Steel. Boundary wall and prayer hall with ablution.",
    cons_text:
      "Currently licensed for Furniture & Furnishings — change to other industrial activity is possible but requires regulatory action.",
    full_detail_text:
      "Industrial factory in Phase 7, Sohar Industrial Estate, Al Batinah. Land: 10,000 sqm. Built-up: ~4,000 sqm. Currently licensed for Furniture & Furnishings; licence change to other industrial activity possible. Strong opportunity for manufacturers, investors, or businesses seeking a ready industrial base in Sohar.",
    status: "available",
  },
  {
    slug: "athaibah-fastfood-cafe",
    category_slug: "cafe-restaurant",
    title: "Fast Food Restaurant & Café — Al Athaibah",
    area: "Al Athaibah, Elodia Complex (behind Al Meera Market)",
    location_city: "Muscat",
    for_sale: 1,
    for_rent: 0,
    selling_price_omr: 9500,
    rental_price_omr: null,
    processing_fee_omr: 500,
    stock_value_omr: null,
    commercial_registration_included: 1,
    age_years: 1,
    employee_count: 2,
    financials_text:
      "Asking OMR 9,500. No financial statements available. Monthly rent: OMR 500. Electricity: OMR 40. Water: OMR 10. Salaries: OMR 140 per employee (2 employees, Palestinian and Egyptian).",
    pros_text:
      "Fully equipped, complete, and ready for immediate operation. Established Instagram and TikTok accounts. Behind Al Meera Market — high-traffic location. Started January 2025.",
    cons_text: "No revenue records or financial statements available. Buyer must trust operator-supplied figures.",
    full_detail_text:
      "Fast food restaurant and café serving meals, fresh juices, and ice cream. 47 sqm shop. 2 employees. Reason for sale: owner's lack of time and travel to Palestine. Inventory and equipment included.",
    status: "available",
  },
  {
    slug: "ghala-car-paint-varnish",
    category_slug: "car-accessories",
    title: "Car Paint & Varnish Sales — Ghala Industrial Area",
    area: "Ghala Industrial Area (next to Sultan Qaboos Grand Mosque Road)",
    location_city: "Muscat",
    for_sale: 1,
    for_rent: 0,
    selling_price_omr: 8000,
    rental_price_omr: null,
    processing_fee_omr: 500,
    stock_value_omr: 1500,
    commercial_registration_included: 0,
    age_years: 11,
    employee_count: 3,
    financials_text:
      "Asking OMR 8,000 (without commercial registration). Stock value OMR 1,500 (can increase). Monthly income: OMR 2,000. Net monthly income: varies depending on demand. Shop rent: OMR 250. Electricity: OMR 20. Internet: OMR 20. Salaries total: OMR 500 (3 Indian workers).",
    pros_text:
      "11 years operating — long-established, with proven income. Income statements available. Stock included. Located on a high-traffic industrial road.",
    cons_text:
      "Sale without commercial registration — buyer must arrange their own. 3×4 metre shop is small. Net income varies with demand.",
    full_detail_text:
      "Car paint and varnish sales business. 3×4 metre shop in Ghala Industrial Area. 3 Indian workers. Reason for sale: expanding to a bigger project. Stock included; stock value OMR 1,500 (can increase).",
    status: "available",
  },
];

async function seed() {
  const client = createClient({
    url: process.env.TURSO_DATABASE_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN!,
  });

  // Build slug → category id map
  const cats = await client.execute("SELECT id, slug FROM categories");
  const catMap = new Map<string, string>();
  for (const row of cats.rows) catMap.set(row.slug as string, row.id as string);

  let inserted = 0;
  let skipped = 0;

  for (const s of seeds) {
    const categoryId = catMap.get(s.category_slug);
    if (!categoryId) {
      console.error(`No category found for slug: ${s.category_slug}`);
      continue;
    }

    const existing = await client.execute({
      sql: "SELECT id FROM listings WHERE slug = ?",
      args: [s.slug],
    });
    if (existing.rows.length > 0) {
      skipped++;
      continue;
    }

    await client.execute({
      sql: `INSERT INTO listings (
        category_id, title, slug, area, location_city,
        for_sale, for_rent, selling_price_omr, rental_price_omr,
        processing_fee_omr, stock_value_omr, commercial_registration_included,
        age_years, employee_count, financials_text, pros_text, cons_text, full_detail_text,
        status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        categoryId,
        s.title,
        s.slug,
        s.area,
        s.location_city,
        s.for_sale,
        s.for_rent,
        s.selling_price_omr,
        s.rental_price_omr,
        s.processing_fee_omr,
        s.stock_value_omr,
        s.commercial_registration_included,
        s.age_years,
        s.employee_count,
        s.financials_text,
        s.pros_text,
        s.cons_text,
        s.full_detail_text,
        s.status,
      ],
    });
    inserted++;
  }

  await client.execute({
    sql: `INSERT INTO activity_log (actor_type, action, target_type, metadata_json)
          VALUES ('system', 'listings_seeded', 'listings', ?)`,
    args: [JSON.stringify({ inserted, skipped, total_seeds: seeds.length })],
  });

  console.log(`Listings seeded: ${inserted} new, ${skipped} skipped (already existed).`);
  process.exit(0);
}

seed();

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

// Listing slugs in display priority. Lower rank = appears first in the
// "Editor's picks" row on /businesses.
const FEATURED_ORDER: string[] = [
  "sohar-industrial-factory",
  "athaibah-fastfood-cafe",
  "muscat-travel-agency",
  "ghala-car-paint-varnish",
  "muscat-bay-laundry",
];

(async () => {
  const client = createClient({
    url: process.env.TURSO_DATABASE_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN!,
  });

  let updated = 0;
  let missing = 0;

  for (let i = 0; i < FEATURED_ORDER.length; i++) {
    const slug = FEATURED_ORDER[i];
    const rank = i + 1;
    const result = await client.execute({
      sql: `UPDATE listings SET featured = 1, featured_rank = ?, updated_at = datetime('now') WHERE slug = ?`,
      args: [rank, slug],
    });
    if (result.rowsAffected > 0) {
      updated++;
      console.log(`  ✓ Featured ${slug} at rank ${rank}`);
    } else {
      missing++;
      console.log(`  ⚠ Listing not found for slug: ${slug}`);
    }
  }

  await client.execute({
    sql: `INSERT INTO activity_log (actor_type, action, target_type, source, metadata_json)
          VALUES ('system', 'featured_listings_seeded', 'listings', 'main', ?)`,
    args: [JSON.stringify({ updated, missing, order: FEATURED_ORDER })],
  });

  console.log(`\nFeatured seed complete: ${updated} updated, ${missing} missing.`);
  process.exit(0);
})();

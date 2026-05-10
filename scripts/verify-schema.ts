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

async function verify() {
  const client = createClient({
    url: process.env.TURSO_DATABASE_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN!,
  });

  console.log("Tables present:");
  const tables = await client.execute(
    "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name",
  );
  for (const row of tables.rows) console.log(`  - ${row.name}`);

  console.log("\nCategories seeded:");
  const cats = await client.execute("SELECT slug, name FROM categories ORDER BY sort_order");
  for (const row of cats.rows) console.log(`  - ${row.slug}: ${row.name}`);

  console.log("\nLeads columns:");
  const leadCols = await client.execute("PRAGMA table_info(leads)");
  for (const row of leadCols.rows) console.log(`  - ${row.name} (${row.type})`);

  console.log("\nIndex count by table:");
  const indexes = await client.execute(
    "SELECT tbl_name, COUNT(*) as cnt FROM sqlite_master WHERE type='index' AND name NOT LIKE 'sqlite_%' GROUP BY tbl_name ORDER BY tbl_name",
  );
  for (const row of indexes.rows) console.log(`  - ${row.tbl_name}: ${row.cnt}`);

  process.exit(0);
}

verify();

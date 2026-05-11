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

(async () => {
  const client = createClient({
    url: process.env.TURSO_DATABASE_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN!,
  });
  const cols = await client.execute("PRAGMA table_info(listings)");
  const featuredCols = cols.rows.filter((r) =>
    String(r.name).includes("featured"),
  );
  console.log("Featured-related columns on listings:");
  for (const r of featuredCols) {
    console.log(`  - ${r.name} (${r.type}, default=${r.dflt_value ?? "null"}, notnull=${r.notnull})`);
  }
  process.exit(0);
})();

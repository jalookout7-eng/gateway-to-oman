import { createClient } from "@libsql/client";
import { readFileSync, existsSync } from "fs";
import { resolve } from "path";

// Load .env file if present
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

async function migrate() {
  const url = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;

  if (!url) {
    console.error("Error: TURSO_DATABASE_URL is not set");
    process.exit(1);
  }

  const client = createClient({
    url,
    authToken: authToken || undefined,
  });

  const schemaPath = resolve(__dirname, "../lib/db/schema.sql");
  const schema = readFileSync(schemaPath, "utf-8");

  // Split on semicolons, filter empty statements
  const statements = schema
    .split(";")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  console.log(`Running ${statements.length} migration statements...`);

  for (const statement of statements) {
    try {
      await client.execute(statement);
      console.log(`  ✓ ${statement.slice(0, 60)}...`);
    } catch (error) {
      console.error(`  ✗ Failed: ${statement.slice(0, 60)}...`);
      console.error(`    ${error}`);
      process.exit(1);
    }
  }

  console.log("\nMigration complete!");
  process.exit(0);
}

migrate();

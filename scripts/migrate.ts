import { createClient } from "@libsql/client";
import { readFileSync } from "fs";
import { resolve } from "path";

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

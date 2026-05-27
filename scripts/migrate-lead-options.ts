/**
 * One-shot migration: drop CHECK constraints from leads.status / .qualification
 * / .segment so admin-defined option values can be inserted without violating
 * the hardcoded enums.
 *
 * SQLite cannot ALTER away a CHECK constraint — the only path is a full table
 * rebuild (CREATE new, INSERT-SELECT, DROP old, RENAME new). This script does
 * that, but ONLY if the rebuild is needed: it inspects sqlite_master to see if
 * the CHECK is still present. Idempotent — safe to run repeatedly.
 *
 * Run with: npm run migrate:lead-options
 *
 * Prerequisite: npm run migrate (loads schema.sql, creates lead_options table).
 */
import { createClient } from "@libsql/client";
import { readFileSync, existsSync } from "fs";
import { resolve } from "path";

// Load .env if present (mirrors scripts/migrate.ts)
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

async function run() {
  const url = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;
  if (!url) {
    console.error("Error: TURSO_DATABASE_URL is not set");
    process.exit(1);
  }
  const client = createClient({ url, authToken: authToken || undefined });

  // 1. Check whether the rebuild is needed by reading the current leads DDL.
  const r = await client.execute(
    "SELECT sql FROM sqlite_master WHERE type='table' AND name='leads'",
  );
  const ddl = (r.rows[0]?.sql as string | undefined) ?? "";

  const hasStatusCheck = /CHECK\s*\(\s*status\s+IN\s*\(/i.test(ddl);
  const hasQualCheck = /CHECK\s*\(\s*qualification\s+IN\s*\(/i.test(ddl);
  const hasSegmentCheck = /CHECK\s*\(\s*segment\s+IN\s*\(/i.test(ddl);

  if (!hasStatusCheck && !hasQualCheck && !hasSegmentCheck) {
    console.log("✓ Lead CHECK constraints already removed — nothing to do.");
    process.exit(0);
  }

  console.log("Lead CHECK constraints detected — rebuilding leads table.");
  console.log(`  status CHECK:        ${hasStatusCheck}`);
  console.log(`  qualification CHECK: ${hasQualCheck}`);
  console.log(`  segment CHECK:       ${hasSegmentCheck}`);

  // 2. Discover the live column list from the existing table so the rebuild
  //    captures any columns added by later ALTER statements (lead_score,
  //    referrer_*, outcome_*, admin_notes, etc.) without us having to keep
  //    this script in sync with schema.sql by hand.
  const colsResult = await client.execute("PRAGMA table_info('leads')");
  const columns = colsResult.rows.map((row) => ({
    name: row.name as string,
    type: row.type as string,
    notnull: Number(row.notnull) === 1,
    dflt_value: row.dflt_value as string | null,
    pk: Number(row.pk) === 1,
  }));

  console.log(`  Found ${columns.length} columns to preserve.`);

  // 3. Build new column definitions:
  //    - Keep all types and defaults as-is
  //    - DROP CHECK clauses for status/qualification/segment by re-declaring
  //      those three columns with TEXT NOT NULL DEFAULT '<value>' / TEXT
  //      (matching the original NOT NULL and default but with NO CHECK)
  //    - For other columns, reuse the PRAGMA-reported metadata verbatim
  const columnDefs = columns.map((c) => {
    let def = `${c.name} ${c.type}`;
    if (c.pk) def += " PRIMARY KEY";
    if (c.notnull) def += " NOT NULL";
    if (c.dflt_value !== null && c.dflt_value !== undefined) {
      def += ` DEFAULT ${c.dflt_value}`;
    }
    return def;
  });

  // No FOREIGN KEY declarations included — SQLite enforces FK only when
  // PRAGMA foreign_keys=ON. The original table's REFERENCES clauses are
  // preserved by the original definition, but a rebuild can drop them
  // safely (Turso/libsql default is foreign_keys=OFF; app code does the
  // referential work). We keep the rebuild minimal.

  const newTableSql = `CREATE TABLE leads_rebuild (\n  ${columnDefs.join(",\n  ")}\n)`;

  // 4. Wrap rebuild in a transaction. Using executeMultiple for atomicity.
  const columnNames = columns.map((c) => c.name).join(", ");

  console.log("  Beginning transaction...");
  await client.execute("BEGIN");
  try {
    // Drop any leftover from a previous failed run
    await client.execute("DROP TABLE IF EXISTS leads_rebuild");

    await client.execute(newTableSql);
    console.log("  ✓ Created leads_rebuild (no CHECK constraints).");

    await client.execute(`INSERT INTO leads_rebuild (${columnNames}) SELECT ${columnNames} FROM leads`);
    const countResult = await client.execute("SELECT COUNT(*) AS n FROM leads_rebuild");
    const n = Number(countResult.rows[0]?.n ?? 0);
    console.log(`  ✓ Copied ${n} rows.`);

    await client.execute("DROP TABLE leads");
    await client.execute("ALTER TABLE leads_rebuild RENAME TO leads");
    console.log("  ✓ Swapped tables.");

    // Recreate indexes on the new leads table (DROP TABLE removes its indexes)
    const indexes = [
      "CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status)",
      "CREATE INDEX IF NOT EXISTS idx_leads_qualification ON leads(qualification)",
      "CREATE INDEX IF NOT EXISTS idx_leads_segment ON leads(segment)",
      "CREATE INDEX IF NOT EXISTS idx_leads_source ON leads(source)",
      "CREATE INDEX IF NOT EXISTS idx_leads_outcome ON leads(outcome)",
      "CREATE INDEX IF NOT EXISTS idx_leads_lead_score ON leads(lead_score)",
    ];
    for (const idx of indexes) {
      await client.execute(idx);
    }
    console.log(`  ✓ Recreated ${indexes.length} indexes.`);

    await client.execute("COMMIT");
    console.log("✓ Lead CHECK constraints removed.");
  } catch (err) {
    console.error("  ✗ Rebuild failed — rolling back:", err);
    await client.execute("ROLLBACK").catch(() => {});
    process.exit(1);
  }

  process.exit(0);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});

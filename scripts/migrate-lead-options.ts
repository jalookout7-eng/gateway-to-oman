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

  // 2. Hardcode the rebuild DDL — mirrors lib/db/schema.sql for the leads
  //    table BUT drops the three CHECK constraints we want gone
  //    (status/qualification/segment). Other CHECK constraints
  //    (special_filter_triggered, outcome) are intentionally KEPT — those
  //    are not admin-editable.
  //
  //    PRAGMA-introspection was attempted first but proved unreliable on
  //    libsql/Turso (some `dflt_value` cells came back as the literal
  //    string "None", which breaks the regenerated DDL). A hand-mirrored
  //    schema is brittle to maintain but predictable.
  //
  //    REFERENCES clauses on conversation_id are dropped intentionally —
  //    Turso/libsql defaults to foreign_keys=OFF, app code does the
  //    referential work, and dropping them simplifies the rebuild.
  const LEADS_COLUMNS = [
    "id",
    "conversation_id",
    "name",
    "email",
    "phone",
    "country_code",
    "segment",
    "interests",
    "qualification",
    "status",
    "created_at",
    "updated_at",
    "ai_summary",
    "booking_id",
    "source",
    "lead_score",
    "referrer_name",
    "referrer_url",
    "qualification_path",
    "chatbot_responses",
    "special_filter_triggered",
    "score_breakdown",
    "outcome",
    "outcome_updated_at",
    "admin_notes",
    "session_duration_seconds",
    "device_type",
    "outcome_reason",
    "omar_grade_correct",
  ];

  const newTableSql = `CREATE TABLE leads_rebuild (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    conversation_id TEXT,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    country_code TEXT,
    segment TEXT,
    interests TEXT,
    qualification TEXT NOT NULL DEFAULT 'warm',
    status TEXT NOT NULL DEFAULT 'new',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    ai_summary TEXT,
    booking_id TEXT,
    source TEXT NOT NULL DEFAULT 'main',
    lead_score INTEGER,
    referrer_name TEXT,
    referrer_url TEXT,
    qualification_path TEXT,
    chatbot_responses TEXT,
    special_filter_triggered INTEGER NOT NULL DEFAULT 0 CHECK (special_filter_triggered IN (0, 1)),
    score_breakdown TEXT,
    outcome TEXT NOT NULL DEFAULT 'pending' CHECK (outcome IN ('pending', 'contacted', 'converted', 'nurture', 'rejected')),
    outcome_updated_at TEXT,
    admin_notes TEXT,
    session_duration_seconds INTEGER,
    device_type TEXT,
    outcome_reason TEXT,
    omar_grade_correct TEXT
  )`;

  // Verify column-count parity with PRAGMA — the script bails if the live
  // table doesn't match this hardcoded list (extra columns added by a later
  // migration would otherwise silently lose data).
  const pragmaResult = await client.execute("PRAGMA table_info('leads')");
  const liveColumns = pragmaResult.rows.map((row) => String(row.name));
  const missingInLive = LEADS_COLUMNS.filter((c) => !liveColumns.includes(c));
  const extraInLive = liveColumns.filter((c) => !LEADS_COLUMNS.includes(c));
  if (missingInLive.length > 0 || extraInLive.length > 0) {
    console.error("✗ Column-list mismatch between this script and the live leads table:");
    if (missingInLive.length > 0) console.error(`    missing in live: ${missingInLive.join(", ")}`);
    if (extraInLive.length > 0) console.error(`    extra in live:   ${extraInLive.join(", ")}`);
    console.error("  Update the LEADS_COLUMNS list and the CREATE TABLE in this script and try again.");
    process.exit(1);
  }
  console.log(`  ✓ Column list matches live table (${LEADS_COLUMNS.length} columns).`);

  // 4. Wrap rebuild in a transaction.
  const columnNames = LEADS_COLUMNS.join(", ");

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

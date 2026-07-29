/**
 * One-off import of the previous developer's CRM into the leads table.
 *
 *   npx tsx scripts/import-legacy-clients.ts "<glob-or-dir>"            # dry run
 *   npx tsx scripts/import-legacy-clients.ts "<glob-or-dir>" --apply    # writes
 *
 * Dry run is the default and prints exactly what would be written. Nothing
 * touches the database without --apply.
 *
 * Idempotent: every row carries the old CRM's uuid in leads.legacy_id, and
 * rows whose legacy_id already exists are skipped. Re-running is a no-op,
 * so a partial run can simply be run again.
 *
 * JA decisions (2026-07-29): source = 'import' (keeps historical records out
 * of intake and Omar reporting), qualification = 'intake' (they did fill the
 * previous developer's intake form).
 */
import { createClient } from "@libsql/client";
import { readFileSync, existsSync, readdirSync, statSync } from "fs";
import { resolve, join } from "path";
import { dedupe, toRecords, type MappedLead } from "../lib/import/legacy-clients";

const SOURCE = "import";
const QUALIFICATION = "intake";
const STATUS = "new";

function loadEnv() {
  const envPath = resolve(__dirname, "../.env");
  if (!existsSync(envPath)) return;
  for (const line of readFileSync(envPath, "utf-8").split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i === -1) continue;
    const k = t.slice(0, i).trim();
    if (!process.env[k]) process.env[k] = t.slice(i + 1).trim();
  }
}

function collectFiles(target: string): string[] {
  if (!existsSync(target)) {
    console.error(`Path not found: ${target}`);
    process.exit(1);
  }
  if (statSync(target).isDirectory()) {
    return readdirSync(target)
      .filter((f) => f.toLowerCase().endsWith(".csv"))
      .map((f) => join(target, f))
      .sort();
  }
  return [target];
}

async function main() {
  const args = process.argv.slice(2);
  const apply = args.includes("--apply");
  const target = args.find((a) => !a.startsWith("--"));

  if (!target) {
    console.error('Usage: npx tsx scripts/import-legacy-clients.ts "<dir-or-file>" [--apply]');
    process.exit(1);
  }

  const files = collectFiles(target);
  if (files.length === 0) {
    console.error(`No .csv files found under ${target}`);
    process.exit(1);
  }

  const records: Record<string, string>[] = [];
  console.log("Reading:");
  for (const f of files) {
    const recs = toRecords(readFileSync(f, "utf-8"));
    console.log(`  ${String(recs.length).padStart(4)} rows  ${f.split("/").pop()}`);
    records.push(...recs);
  }

  const result = dedupe(records);
  console.log(`\n  ${result.totalRows} raw rows`);
  console.log(`  ${result.duplicateRowsDropped} dropped as repeat scrapes of the same record`);
  console.log(`  ${result.skippedIncomplete} skipped for missing id, name or email`);
  for (const s of result.skippedTestRecords) {
    console.log(`  skipped as a known test record: ${s}`);
  }
  console.log(`  ${result.leads.length} unique people to import\n`);

  if (result.sharedEmails.length > 0) {
    console.log("Emails held by more than one record (imported separately, merge by hand if wanted):");
    for (const s of result.sharedEmails) {
      console.log(`  ${s.email}  ->  ${s.names.join(" | ")}`);
    }
    console.log();
  }

  loadEnv();
  const url = process.env.TURSO_DATABASE_URL;
  if (!url) {
    console.error("TURSO_DATABASE_URL is not set");
    process.exit(1);
  }
  const db = createClient({ url, authToken: process.env.TURSO_AUTH_TOKEN || undefined });

  // Which of these are already in the database from an earlier run?
  const existing = new Set<string>();
  const existingRows = await db.execute("SELECT legacy_id FROM leads WHERE legacy_id IS NOT NULL");
  for (const r of existingRows.rows) existing.add(String(r.legacy_id));

  const pending = result.leads.filter((l) => !existing.has(l.legacyId));
  const alreadyImported = result.leads.length - pending.length;

  const totalBefore = await db.execute("SELECT COUNT(*) AS c FROM leads");
  console.log(`Database: ${String(totalBefore.rows[0].c)} leads currently, ${alreadyImported} of these already imported.`);
  console.log(`${pending.length} would be inserted.\n`);

  if (pending.length > 0) {
    console.log("Sample of what will be written (first 3):");
    for (const l of pending.slice(0, 3)) {
      console.log(`  ${l.name} <${l.email}>`);
      console.log(`    country=${l.countryOfResidence}  segment=${l.segment}  submitted=${l.createdAt}`);
      console.log(`    timeline=${l.investmentTimeline}`);
      console.log(`    purpose=${l.investmentPurpose}`);
      console.log(`    location=${l.preferredLocation}`);
      console.log(`    services=${JSON.stringify(l.servicesNeeded)}`);
    }
    console.log();
  }

  if (!apply) {
    console.log("DRY RUN. Nothing was written. Re-run with --apply to import.");
    process.exit(0);
  }

  let inserted = 0;
  for (const l of pending) {
    await insertLead(db, l);
    inserted++;
  }

  const totalAfter = await db.execute("SELECT COUNT(*) AS c FROM leads");
  console.log(`Inserted ${inserted}. Leads table: ${String(totalBefore.rows[0].c)} -> ${String(totalAfter.rows[0].c)}.`);
  process.exit(0);
}

async function insertLead(db: ReturnType<typeof createClient>, l: MappedLead) {
  await db.execute({
    sql: `INSERT INTO leads
            (name, email, phone, country_of_residence, segment, interests,
             qualification, status, source, legacy_id,
             investment_timeline, investment_purpose, preferred_location,
             residency_interest, services_needed, additional_comments, admin_notes,
             created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
                  COALESCE(?, datetime('now')), COALESCE(?, datetime('now')))`,
    args: [
      l.name, l.email, l.phone, l.countryOfResidence, l.segment, l.interests,
      QUALIFICATION, STATUS, SOURCE, l.legacyId,
      l.investmentTimeline, l.investmentPurpose, l.preferredLocation,
      l.residencyInterest,
      l.servicesNeeded.length > 0 ? JSON.stringify(l.servicesNeeded) : null,
      l.additionalComments, l.adminNotes,
      l.createdAt, l.updatedAt,
    ],
  });
}

main();

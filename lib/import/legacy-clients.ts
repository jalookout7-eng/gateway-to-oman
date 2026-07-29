import { PURPOSE_TO_SEGMENT } from "@/lib/intake/constants";

/**
 * Mapping layer for the one-off import of the previous developer's CRM
 * (scraped exports, `~/Downloads/gto-clients-export-2026-07-20-*.csv`).
 *
 * Everything here is pure: no filesystem, no database, no Next.js. The
 * script in scripts/import-legacy-clients.ts supplies the IO.
 *
 * Why not the admin CSV uploader: it maps three columns (name, email,
 * phone), splits on bare commas, and never strips quotes. These exports
 * carry 24 columns and embed commas inside quoted values, for example
 * "Salalah (Coastal, peaceful, retirement-friendly)", so that parser would
 * shred rows into the wrong columns without raising an error.
 */

/** Placeholder strings the old CRM wrote in place of an empty value. */
const EMPTY_TOKENS = new Set(["", "none", "no notes yet.", "n/a", "-"]);

function clean(raw: string | undefined): string | null {
  const v = (raw ?? "").trim();
  if (EMPTY_TOKENS.has(v.toLowerCase())) return null;
  return v;
}

/**
 * RFC 4180 CSV reader: handles quoted fields, doubled quotes ("" inside a
 * quoted value), and commas or newlines inside quotes. Written by hand
 * rather than pulling in a dependency for a single migration.
 */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  // Normalise line endings first so CRLF files behave identically.
  const src = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (inQuotes) {
      if (c === '"') {
        if (src[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else {
        field += c;
      }
      continue;
    }
    if (c === '"') { inQuotes = true; continue; }
    if (c === ",") { row.push(field); field = ""; continue; }
    if (c === "\n") { row.push(field); rows.push(row); row = []; field = ""; continue; }
    field += c;
  }
  // Trailing field/row when the file does not end in a newline.
  if (field !== "" || row.length > 0) { row.push(field); rows.push(row); }
  // Drop rows that are entirely empty (blank trailing lines).
  return rows.filter((r) => r.some((cell) => cell.trim() !== ""));
}

export function toRecords(text: string): Record<string, string>[] {
  const rows = parseCsv(text);
  if (rows.length === 0) return [];
  const headers = rows[0].map((h) => h.trim());
  return rows.slice(1).map((cells) => {
    const rec: Record<string, string> = {};
    headers.forEach((h, i) => { rec[h] = cells[i] ?? ""; });
    return rec;
  });
}

/**
 * The export carries both a truncated display column and the full value
 * (`purpose_short` shows "Exploring Investment Opportu…"). Always read the
 * full one. 18 of 95 purposes and 46 of 95 timelines differ.
 */
export function normaliseTimeline(raw: string | null): string | null {
  if (!raw) return null;
  // Our option list banned en and em dashes, so the export's
  // "Within 1–3 months" must become "Within 1 to 3 months" or it will not
  // match the allowlist in lib/intake/constants.ts.
  return raw.replace(/\s*[–—]\s*/g, " to ");
}

const MONTHS = [
  "jan", "feb", "mar", "apr", "may", "jun",
  "jul", "aug", "sep", "oct", "nov", "dec",
];

/**
 * "Jun 8, 2026" to "2026-06-08 00:00:00" (SQLite's datetime text format).
 *
 * Parsed from the string's own components, deliberately without going
 * through Date. `Date.parse("Mar 29, 2025")` yields LOCAL midnight, so
 * reading it back with getUTC* shifts the date by a day for anyone not on
 * UTC, and reading it with local getters makes the result depend on the
 * machine running the import. Neither is acceptable when the output is a
 * stored business date, so no timezone is involved at all.
 */
export function parseLegacyDate(raw: string | null): string | null {
  if (!raw) return null;
  const m = /^([A-Za-z]{3})[a-z]* (\d{1,2}),? (\d{4})$/.exec(raw.trim());
  if (!m) return null;
  const month = MONTHS.indexOf(m[1].toLowerCase());
  if (month === -1) return null;
  const day = Number(m[2]);
  if (day < 1 || day > 31) return null;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${m[3]}-${pad(month + 1)}-${pad(day)} 00:00:00`;
}

export interface MappedLead {
  legacyId: string;
  name: string;
  email: string;
  phone: string | null;
  countryOfResidence: string | null;
  segment: string | null;
  interests: string | null;
  investmentTimeline: string | null;
  investmentPurpose: string | null;
  preferredLocation: string | null;
  residencyInterest: string | null;
  servicesNeeded: string[];
  additionalComments: string | null;
  adminNotes: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}

export function mapRow(rec: Record<string, string>): MappedLead | null {
  const legacyId = clean(rec.id);
  const name = clean(rec.name);
  // Both `email` and `Email` exist and agree on all 95 records; prefer the
  // capitalised one and fall back, so a future export with only one works.
  const email = clean(rec.Email) ?? clean(rec.email);
  if (!legacyId || !name || !email) return null;

  const purpose = clean(rec.Purpose);

  return {
    legacyId,
    name,
    email,
    // Phones arrive as full E.164 ("+201200946666"). Deliberately left whole
    // in `phone` with `country_code` null: splitting them would need a dial
    // code table and risks mangling numbers for no gain, and the admin
    // renders phone alone when country_code is absent.
    phone: clean(rec.Phone),
    countryOfResidence: clean(rec.Country) ?? clean(rec.country),
    // Same merges the live intake route performs, so imported records work
    // with the existing segment filters and dashboard charts.
    segment: purpose ? (PURPOSE_TO_SEGMENT[purpose] ?? null) : null,
    interests: purpose,
    investmentTimeline: normaliseTimeline(clean(rec.Timeline)),
    investmentPurpose: purpose,
    // Preferred Location, Residency Interest and Services Needed are stored
    // verbatim, including answers outside our option lists ("All", "Still
    // exploring", and roughly 20 free-text services). The columns are plain
    // TEXT with no constraint, and rewriting what a real person said into
    // the nearest tick box would destroy information for no benefit.
    preferredLocation: clean(rec["Preferred Location"]),
    residencyInterest: clean(rec["Residency Interest"]),
    servicesNeeded: (rec["Services Needed"] ?? "")
      .split(";")
      .map((s) => s.trim())
      .filter((s) => s !== ""),
    additionalComments: clean(rec["Additional Comments"]),
    adminNotes: clean(rec.Notes),
    // "Form Submitted" is when the person actually enquired; "Created" is
    // when the old CRM's row was made (often a bulk import date). They
    // differ on 92 of 95 records, so the business date is the right one.
    createdAt: parseLegacyDate(clean(rec["Form Submitted"]) ?? clean(rec.Created)),
    updatedAt: parseLegacyDate(clean(rec["Last Updated"])),
  };
}

/**
 * Test records left behind in the old CRM. Kept as an explicit list in code,
 * rather than a heuristic on the word "test", so the exclusion is reviewable
 * and cannot silently swallow a real person called Testa or an address at a
 * legitimate domain. Matched on the full email, case-insensitively.
 */
export const SKIP_EMAILS = new Set(["test@testmail.com"]);

export interface DedupeResult {
  leads: MappedLead[];
  totalRows: number;
  skippedIncomplete: number;
  skippedTestRecords: string[];
  duplicateRowsDropped: number;
  /** Emails held by more than one distinct legacy id. */
  sharedEmails: { email: string; names: string[] }[];
}

/**
 * Collapse the scraped pages to one record per legacy id.
 *
 * Safe to take the first occurrence: every repeated row for a given id was
 * verified byte-identical across the nine export files, so there is no
 * "which copy is newer" question.
 */
export function dedupe(records: Record<string, string>[]): DedupeResult {
  const byId = new Map<string, MappedLead>();
  const skippedTest = new Set<string>();
  let skippedIncomplete = 0;
  let duplicateRowsDropped = 0;

  for (const rec of records) {
    const mapped = mapRow(rec);
    if (!mapped) { skippedIncomplete++; continue; }
    if (byId.has(mapped.legacyId)) { duplicateRowsDropped++; continue; }
    if (SKIP_EMAILS.has(mapped.email.toLowerCase())) {
      skippedTest.add(`${mapped.name} <${mapped.email}>`);
      continue;
    }
    byId.set(mapped.legacyId, mapped);
  }

  const leads = Array.from(byId.values());
  const byEmail = new Map<string, string[]>();
  for (const l of leads) {
    const key = l.email.toLowerCase();
    byEmail.set(key, [...(byEmail.get(key) ?? []), l.name]);
  }

  return {
    leads,
    totalRows: records.length,
    skippedIncomplete,
    skippedTestRecords: Array.from(skippedTest),
    duplicateRowsDropped,
    sharedEmails: Array.from(byEmail.entries())
      .filter(([, names]) => names.length > 1)
      .map(([email, names]) => ({ email, names })),
  };
}

# Intake Form + Timed Popup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a structured intake form (standalone `/intake` page + a 15-second timed popup on the two home pages) that writes first-class qualification fields onto the existing Turso `leads` table, plus an admin lead-detail page that shows everything about a lead on one screen.

**Architecture:** The previous developer's standalone CRM (`~/Downloads/gateway_to_oman_dashboard`, security-reviewed clean 2026-07-25) supplies the field set, the validation approach (honeypot + allowlist + explicit column whitelist on INSERT) and the lead-detail layout. **Its Supabase backend is not used at all.** Everything lands in our Turso `leads` table via a new `POST /api/intake` route, deliberately separate from `/api/leads` so the browser can never choose its own `source` value. New columns are additive `ALTER TABLE ADD COLUMN` statements in `lib/db/schema.sql`, the pattern this schema has used throughout its history (idempotent, `npm run migrate` skips duplicates).

**Tech Stack:** Next.js 14.2 App Router, Turso/libSQL, Tailwind, vitest + @testing-library/react. **No new npm dependencies.**

## Global Constraints

Every task's requirements implicitly include this section.

- **No em dashes or en dashes anywhere**, in code comments, UI copy, or option labels. Use commas, periods, or parentheses. The ex-developer's `INVESTMENT_TIMELINES` contains `'Within 1–3 months'` (en dash) — it must be re-spelled as `"Within 1 to 3 months"`. Hyphens inside words (`business-friendly`) are fine.
- **No new npm packages.** Zod is not installed and must not be added; validation is hand-rolled, matching the manual-validation style already used across `app/api/`.
- **No `dangerouslySetInnerHTML`** anywhere.
- **Brand:** navy `#1A1A2E` (`bg-navy` / `text-navy`), gold `#C99B3C` (`text-gold`, `gold-gradient`), warm white `#F8F5F0` (`bg-warm-white`). Headings `font-heading`, body `font-body`.
- **Mobile input sizing:** every `<input>`, `<select>` and `<textarea>` a visitor can focus must render at ≥16px on small screens. Use `text-base sm:text-sm`. Do NOT add `maximum-scale=1` or `user-scalable=no` to any viewport meta.
- **SQL:** every value parameterised. INSERT column lists are hardcoded literals; never spread raw request input into a query.
- **Popup scope is exact and narrow:** `pathname === "/"` and `pathname === "/businesses"` only. Never any other path, never `/admin`.
- Reuse `lib/rate-limit.ts` (`rateLimit(key, ip, limit, windowSec)` → `{ allowed, retryAfterSec }`, `getClientIp(request)`). Do not write a new limiter.
- Tests live under `tests/`, run with `npm test -- --run`. Component tests use `@testing-library/react` (already configured via `@vitejs/plugin-react`).
- Commit with explicit paths only. **Never `git add -A`. Never stage `HANDOVER.md`.**

---

## File Structure

**Create**
| Path | Responsibility |
|---|---|
| `lib/intake/constants.ts` | The five option lists, the services list, and the purpose→segment map. Single source of truth shared by the form, the validator, and the admin detail page. |
| `lib/intake/validate.ts` | Pure parse + validate of an intake payload. No DB, no Next.js imports, fully unit-testable. |
| `lib/intake/popup.ts` | Pure popup gating predicate + storage-key constants + `markChatEngaged()`. No React. |
| `app/api/intake/route.ts` | `POST` handler: rate limit → validate → dedupe → INSERT → summary + push. |
| `components/intake/IntakeForm.tsx` | The form itself. Used by both `/intake` and the popup. |
| `app/intake/page.tsx` | Standalone shareable page (noindex). |
| `components/intake/IntakePopup.tsx` | 15s timed modal wrapper around `IntakeForm`. |
| `app/admin/leads/[id]/page.tsx` | Admin lead-detail page. |

**Modify**
| Path | Change |
|---|---|
| `lib/db/schema.sql` | Seven additive `ALTER TABLE leads ADD COLUMN` statements. |
| `app/api/admin/leads/[id]/route.ts` | Add a `GET` handler. |
| `app/admin/leads/page.tsx` | Row click navigates to the detail page; remove the two inline expanders; add Source column + `intake` filter option. |
| `app/layout.tsx` | Mount `<IntakePopup />`. |
| `components/chat/ChatWidget.tsx` | One import + one call: `markChatEngaged()` when the panel opens. |

---

## Design decisions (already made, do not re-litigate)

1. **Seven new columns, not five.** JA specified five structured columns. The ex-developer's form also carries "Country of Residence" and "Additional Comments or Questions", which have no home in our schema: `leads.country_code` is a dial code (`+968`) rendered next to the phone number, and `leads.interests` is a short descriptor rendered in a table column, so a prose paragraph would corrupt both. They become `country_of_residence` and `additional_comments`. All seven are nullable TEXT.
2. **`services_needed` is a JSON array string.** It is genuinely multi-value. The "not a JSON blob" instruction was about not collapsing all five answers into one column, which this does not do.
3. **Intake leads get `source = 'intake'`**, `qualification = 'connect'`, `status = 'new'`. Connect is correct: the visitor asked to be contacted before anything graded them, and it stops the tier reading as a misleading cold. `source` keeps them separable from Omar-captured connect leads in reporting.
4. **Real merges into existing columns:** `investment_purpose` also sets `interests` (so the existing "Interest" column in the leads table is populated) and maps to `segment` via `PURPOSE_TO_SEGMENT` (so existing segment filters and charts work on intake leads for free).
5. **A separate `/api/intake` route, not a `source` parameter on `/api/leads`.** A browser-supplied source is a trust boundary we do not need to open, and the intake payload has seven extra fields with their own allowlists.
6. **Popup renders at `z-[60]`**, above the consent banner (`z-40`) and the chat (`z-50`). It is a dismissible modal; the consent banner is interactive again the moment it closes. Gating the popup on a consent decision was considered and rejected: the banner persists until clicked, so indifferent visitors would never see the popup at all.
7. **A visitor who has opened Omar never gets the popup.** Interrupting a live chat with a form is actively harmful. Signalled by a single `sessionStorage` marker set when the chat panel opens.

**Out of scope (log, do not build):** scoring intake leads from their structured answers (the scorer is transcript-based); an auto-draft follow-up email on intake submission (existing backlog item); editing intake fields from the admin UI (read-only on the detail page in this batch).

---

## Task 1: Schema columns + intake constants

**Files:**
- Create: `lib/intake/constants.ts`
- Modify: `lib/db/schema.sql` (append to the end of the file, after the existing final `ALTER TABLE` block)
- Test: `tests/db/intake-schema.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `INVESTMENT_TIMELINES`, `INVESTMENT_PURPOSES`, `PREFERRED_LOCATIONS`, `RESIDENCY_OPTIONS`, `SERVICES_OPTIONS` (all `readonly string[]` via `as const`), `PURPOSE_TO_SEGMENT: Record<string, string>`, and seven new nullable TEXT columns on `leads`: `country_of_residence`, `investment_timeline`, `investment_purpose`, `preferred_location`, `residency_interest`, `services_needed`, `additional_comments`.

- [ ] **Step 1: Write the failing test**

Create `tests/db/intake-schema.test.ts`:

```ts
import { describe, it, expect, beforeAll } from "vitest";
import { createClient, type Client } from "@libsql/client";
import { readFileSync } from "fs";
import { resolve } from "path";

let db: Client;

async function makeTestDb(): Promise<Client> {
  const client = createClient({ url: "file::memory:" });
  const schema = readFileSync(resolve(__dirname, "../../lib/db/schema.sql"), "utf-8");
  for (const stmt of schema.split(";").map((s) => s.trim()).filter(Boolean)) {
    try {
      await client.execute(stmt);
    } catch (err) {
      const m = String(err);
      if (m.includes("duplicate column") || m.includes("already exists")) continue;
      throw err;
    }
  }
  return client;
}

beforeAll(async () => {
  db = await makeTestDb();
});

const NEW_COLUMNS = [
  "country_of_residence",
  "investment_timeline",
  "investment_purpose",
  "preferred_location",
  "residency_interest",
  "services_needed",
  "additional_comments",
];

describe("intake columns on leads", () => {
  it("adds every intake column", async () => {
    const info = await db.execute("PRAGMA table_info(leads)");
    const names = info.rows.map((r) => String(r.name));
    for (const col of NEW_COLUMNS) {
      expect(names).toContain(col);
    }
  });

  it("leaves the new columns nullable so existing rows are unaffected", async () => {
    await db.execute({
      sql: "INSERT INTO leads (name, email) VALUES (?, ?)",
      args: ["Legacy Row", "legacy@example.com"],
    });
    const row = await db.execute("SELECT * FROM leads WHERE email = 'legacy@example.com'");
    expect(row.rows.length).toBe(1);
    expect(row.rows[0].investment_timeline).toBeNull();
    expect(row.rows[0].services_needed).toBeNull();
  });

  it("round-trips a full intake row", async () => {
    await db.execute({
      sql: `INSERT INTO leads
              (name, email, source, qualification, country_of_residence, investment_timeline,
               investment_purpose, preferred_location, residency_interest, services_needed,
               additional_comments)
            VALUES (?, ?, 'intake', 'connect', ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        "Full Row", "full@example.com", "United Kingdom", "Within 6 months",
        "Business Setup", "Open / Flexible", "Yes, for myself only",
        JSON.stringify(["Business Registration and Licensing"]), "Some comments.",
      ],
    });
    const row = await db.execute("SELECT * FROM leads WHERE email = 'full@example.com'");
    expect(String(row.rows[0].source)).toBe("intake");
    expect(JSON.parse(String(row.rows[0].services_needed))).toEqual([
      "Business Registration and Licensing",
    ]);
  });
});

describe("intake constants", () => {
  it("contains no em dashes or en dashes in any option label", async () => {
    const c = await import("@/lib/intake/constants");
    const all = [
      ...c.INVESTMENT_TIMELINES,
      ...c.INVESTMENT_PURPOSES,
      ...c.PREFERRED_LOCATIONS,
      ...c.RESIDENCY_OPTIONS,
      ...c.SERVICES_OPTIONS,
    ];
    for (const label of all) {
      expect(label).not.toMatch(/[–—]/);
    }
  });

  it("maps every investment purpose to a valid lead segment", async () => {
    const c = await import("@/lib/intake/constants");
    const validSegments = ["entrepreneur", "investor", "professional", "retiree"];
    for (const purpose of c.INVESTMENT_PURPOSES) {
      expect(validSegments).toContain(c.PURPOSE_TO_SEGMENT[purpose]);
    }
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- --run tests/db/intake-schema.test.ts`
Expected: FAIL — columns missing from `PRAGMA table_info`, and `@/lib/intake/constants` cannot be resolved.

- [ ] **Step 3: Append the columns to `lib/db/schema.sql`**

Append at the very end of the file:

```sql
-- ---------------------------------------------------------------------------
-- Intake form fields (spec 2026-07-26, plan 2026-07-27)
--
-- Additive and nullable: existing rows keep NULL, and `npm run migrate`
-- skips "duplicate column" errors so re-running is safe. First-class
-- columns rather than one JSON blob, so every answer is filterable.
--
-- services_needed is the one exception: it is genuinely multi-value, so it
-- stores a JSON array of strings (read it with JSON.parse, defaulting to []).
-- country_of_residence is distinct from country_code, which is a dial code
-- (+968) rendered beside the phone number.
-- ---------------------------------------------------------------------------
ALTER TABLE leads ADD COLUMN country_of_residence TEXT;
ALTER TABLE leads ADD COLUMN investment_timeline TEXT;
ALTER TABLE leads ADD COLUMN investment_purpose TEXT;
ALTER TABLE leads ADD COLUMN preferred_location TEXT;
ALTER TABLE leads ADD COLUMN residency_interest TEXT;
ALTER TABLE leads ADD COLUMN services_needed TEXT;
ALTER TABLE leads ADD COLUMN additional_comments TEXT;
```

- [ ] **Step 4: Create `lib/intake/constants.ts`**

```ts
/**
 * Intake form option lists (spec 2026-07-26).
 *
 * Field set adapted from the previous developer's standalone CRM
 * (~/Downloads/gateway_to_oman_dashboard). Only the labels and the option
 * sets were reused; none of its Supabase code is.
 *
 * These labels are BOTH the UI text and the stored value, so changing one
 * changes stored data. They are also the server-side allowlist in
 * lib/intake/validate.ts, so nothing outside these lists can ever be
 * written to the database.
 *
 * No em dashes or en dashes: the original list used "Within 1–3 months".
 */

export const INVESTMENT_TIMELINES = [
  "Within 1 to 3 months",
  "Within 6 months",
  "1 year or more",
  "Exploring options, no fixed timeline",
] as const;

export const INVESTMENT_PURPOSES = [
  "Business Setup",
  "Exploring Investment Opportunities",
  "Exploring Job opportunities",
  "Real Estate / ITC Property",
  "Residency Through Investment",
  "Retirement Planning in Oman",
] as const;

export const PREFERRED_LOCATIONS = [
  "Muscat (Urban, business-friendly environment)",
  "Salalah (Coastal, peaceful, retirement-friendly)",
  "Sohar (Industrial hub and growing opportunities)",
  "Open / Flexible",
  "Other",
] as const;

export const RESIDENCY_OPTIONS = [
  "No",
  "Yes, for myself only",
  "Yes, including spouse and dependents",
] as const;

export const SERVICES_OPTIONS = [
  "Business Registration and Licensing",
  "Real Estate Property Search",
  "Cultural Orientation and Relocation Assistance",
  "Retirement Planning",
  "Career/Job opportunity",
  "None of the above",
] as const;

/**
 * Maps the visitor's stated purpose onto the existing leads.segment enum
 * (entrepreneur | investor | professional | retiree). This is a real merge,
 * not decoration: it means intake leads show up correctly in the segment
 * filter, the segment donut on the dashboard, and the intelligence queries
 * without any of those needing to know intake exists.
 */
export const PURPOSE_TO_SEGMENT: Record<string, string> = {
  "Business Setup": "entrepreneur",
  "Exploring Investment Opportunities": "investor",
  "Exploring Job opportunities": "professional",
  "Real Estate / ITC Property": "investor",
  "Residency Through Investment": "investor",
  "Retirement Planning in Oman": "retiree",
};
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npm test -- --run tests/db/intake-schema.test.ts`
Expected: PASS (5 tests)

- [ ] **Step 6: Commit**

```bash
git add lib/db/schema.sql lib/intake/constants.ts tests/db/intake-schema.test.ts
git commit -m "feat(intake): add intake columns to leads + shared option constants"
```

---

## Task 2: Intake payload validation

**Files:**
- Create: `lib/intake/validate.ts`
- Test: `tests/intake/validate.test.ts`

**Interfaces:**
- Consumes: `lib/intake/constants.ts` (all five option lists).
- Produces: `parseIntakePayload(input: unknown): IntakeParseResult`, and the exported types `IntakeLead` and `IntakeParseResult` used by `app/api/intake/route.ts`.

- [ ] **Step 1: Write the failing test**

Create `tests/intake/validate.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { parseIntakePayload } from "@/lib/intake/validate";

const valid = {
  name: "Jane Smith",
  email: "jane@example.com",
  phone: "5550000",
  countryCode: "+44",
  countryOfResidence: "United Kingdom",
  investmentTimeline: "Within 6 months",
  investmentPurpose: "Business Setup",
  preferredLocation: "Open / Flexible",
  residencyInterest: "Yes, for myself only",
  servicesNeeded: ["Business Registration and Licensing"],
  additionalComments: "Looking to relocate.",
  _trap: "",
};

describe("parseIntakePayload", () => {
  it("accepts a fully populated valid payload", () => {
    const r = parseIntakePayload(valid);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data.name).toBe("Jane Smith");
    expect(r.data.servicesNeeded).toEqual(["Business Registration and Licensing"]);
  });

  it("accepts a minimal payload of name and email only", () => {
    const r = parseIntakePayload({ name: "Al Rashid", email: "a@b.co" });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data.phone).toBeNull();
    expect(r.data.investmentTimeline).toBeNull();
    expect(r.data.servicesNeeded).toEqual([]);
  });

  it("trims whitespace and lowercases nothing else", () => {
    const r = parseIntakePayload({ name: "  Jane  ", email: "  jane@example.com " });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data.name).toBe("Jane");
    expect(r.data.email).toBe("jane@example.com");
  });

  it("flags a filled honeypot as a bot", () => {
    const r = parseIntakePayload({ ...valid, _trap: "http://spam.example" });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.reason).toBe("bot");
  });

  it("rejects a missing name", () => {
    const r = parseIntakePayload({ email: "a@b.co" });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.reason).toBe("invalid");
  });

  it("rejects a one-character name", () => {
    const r = parseIntakePayload({ name: "J", email: "a@b.co" });
    expect(r.ok).toBe(false);
  });

  it("rejects a malformed email", () => {
    const r = parseIntakePayload({ name: "Jane", email: "not-an-email" });
    expect(r.ok).toBe(false);
  });

  it("rejects an over-long name", () => {
    const r = parseIntakePayload({ name: "x".repeat(121), email: "a@b.co" });
    expect(r.ok).toBe(false);
  });

  it("rejects comments over 2000 characters", () => {
    const r = parseIntakePayload({ ...valid, additionalComments: "x".repeat(2001) });
    expect(r.ok).toBe(false);
  });

  it("rejects a select value outside the allowlist", () => {
    const r = parseIntakePayload({ ...valid, investmentTimeline: "Whenever I feel like it" });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.reason).toBe("invalid");
  });

  it("rejects a service outside the allowlist", () => {
    const r = parseIntakePayload({ ...valid, servicesNeeded: ["Money Laundering"] });
    expect(r.ok).toBe(false);
  });

  it("treats an empty-string select as not answered", () => {
    const r = parseIntakePayload({ ...valid, investmentPurpose: "" });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data.investmentPurpose).toBeNull();
  });

  it("deduplicates repeated services", () => {
    const r = parseIntakePayload({
      ...valid,
      servicesNeeded: ["Retirement Planning", "Retirement Planning"],
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data.servicesNeeded).toEqual(["Retirement Planning"]);
  });

  it("rejects a non-array servicesNeeded", () => {
    const r = parseIntakePayload({ ...valid, servicesNeeded: "Retirement Planning" });
    expect(r.ok).toBe(false);
  });

  it("rejects a non-object input", () => {
    expect(parseIntakePayload(null).ok).toBe(false);
    expect(parseIntakePayload("string").ok).toBe(false);
  });

  it("ignores unknown extra keys rather than storing them", () => {
    const r = parseIntakePayload({ ...valid, is_admin: true, qualification: "hot" });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(Object.keys(r.data)).not.toContain("is_admin");
    expect(Object.keys(r.data)).not.toContain("qualification");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- --run tests/intake/validate.test.ts`
Expected: FAIL — `Cannot find module '@/lib/intake/validate'`

- [ ] **Step 3: Create `lib/intake/validate.ts`**

```ts
import {
  INVESTMENT_TIMELINES,
  INVESTMENT_PURPOSES,
  PREFERRED_LOCATIONS,
  RESIDENCY_OPTIONS,
  SERVICES_OPTIONS,
} from "@/lib/intake/constants";

/**
 * Pure validation for the intake payload. No DB, no Next.js imports, so the
 * whole surface is unit-testable.
 *
 * Two things this deliberately does:
 *
 * 1. Every select is checked against its allowlist rather than merely
 *    length-capped. The stored value IS the label, so an unchecked field
 *    would let anyone write arbitrary text into a column Ahmed reads as
 *    fact.
 * 2. It returns a fixed-shape object built field by field, never a spread
 *    of the input. Extra keys in the request body (`qualification`,
 *    `source`, `is_admin`) are structurally impossible to smuggle through.
 */

export interface IntakeLead {
  name: string;
  email: string;
  phone: string | null;
  countryCode: string | null;
  countryOfResidence: string | null;
  investmentTimeline: string | null;
  investmentPurpose: string | null;
  preferredLocation: string | null;
  residencyInterest: string | null;
  servicesNeeded: string[];
  additionalComments: string | null;
}

export type IntakeParseResult =
  | { ok: true; data: IntakeLead }
  | { ok: false; reason: "bot" }
  | { ok: false; reason: "invalid"; error: string };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function invalid(error: string): IntakeParseResult {
  return { ok: false, reason: "invalid", error };
}

/** Read an optional free-text field: missing/blank becomes null. */
function optionalText(
  raw: unknown,
  max: number,
  label: string,
): { ok: true; value: string | null } | { ok: false; error: string } {
  if (raw === undefined || raw === null || raw === "") return { ok: true, value: null };
  if (typeof raw !== "string") return { ok: false, error: `${label} must be text` };
  const trimmed = raw.trim();
  if (trimmed === "") return { ok: true, value: null };
  if (trimmed.length > max) return { ok: false, error: `${label} is too long` };
  return { ok: true, value: trimmed };
}

/** Read an optional select: blank becomes null, anything off-list is rejected. */
function optionalChoice(
  raw: unknown,
  allowed: readonly string[],
  label: string,
): { ok: true; value: string | null } | { ok: false; error: string } {
  if (raw === undefined || raw === null || raw === "") return { ok: true, value: null };
  if (typeof raw !== "string") return { ok: false, error: `${label} must be text` };
  if (!allowed.includes(raw)) return { ok: false, error: `${label} is not a valid choice` };
  return { ok: true, value: raw };
}

export function parseIntakePayload(input: unknown): IntakeParseResult {
  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    return invalid("Invalid submission");
  }
  const body = input as Record<string, unknown>;

  // Honeypot first: a bot that filled the hidden field never gets a reason to
  // retry with different values.
  const trap = body._trap;
  if (typeof trap === "string" && trap.trim() !== "") {
    return { ok: false, reason: "bot" };
  }

  if (typeof body.name !== "string") return invalid("Full name is required");
  const name = body.name.trim();
  if (name.length < 2) return invalid("Full name is required");
  if (name.length > 120) return invalid("Full name is too long");

  if (typeof body.email !== "string") return invalid("A valid email address is required");
  const email = body.email.trim();
  if (email.length > 200 || !EMAIL_RE.test(email)) {
    return invalid("A valid email address is required");
  }

  const phone = optionalText(body.phone, 30, "Phone number");
  if (!phone.ok) return invalid(phone.error);

  const countryCode = optionalText(body.countryCode, 8, "Country code");
  if (!countryCode.ok) return invalid(countryCode.error);

  const countryOfResidence = optionalText(body.countryOfResidence, 100, "Country of residence");
  if (!countryOfResidence.ok) return invalid(countryOfResidence.error);

  const investmentTimeline = optionalChoice(body.investmentTimeline, INVESTMENT_TIMELINES, "Timeline");
  if (!investmentTimeline.ok) return invalid(investmentTimeline.error);

  const investmentPurpose = optionalChoice(body.investmentPurpose, INVESTMENT_PURPOSES, "Purpose");
  if (!investmentPurpose.ok) return invalid(investmentPurpose.error);

  const preferredLocation = optionalChoice(body.preferredLocation, PREFERRED_LOCATIONS, "Preferred location");
  if (!preferredLocation.ok) return invalid(preferredLocation.error);

  const residencyInterest = optionalChoice(body.residencyInterest, RESIDENCY_OPTIONS, "Residency interest");
  if (!residencyInterest.ok) return invalid(residencyInterest.error);

  let servicesNeeded: string[] = [];
  if (body.servicesNeeded !== undefined && body.servicesNeeded !== null) {
    if (!Array.isArray(body.servicesNeeded)) return invalid("Services must be a list");
    if (body.servicesNeeded.length > SERVICES_OPTIONS.length) return invalid("Too many services selected");
    const seen = new Set<string>();
    for (const s of body.servicesNeeded) {
      if (typeof s !== "string" || !SERVICES_OPTIONS.includes(s as (typeof SERVICES_OPTIONS)[number])) {
        return invalid("Services contains an invalid choice");
      }
      seen.add(s);
    }
    servicesNeeded = Array.from(seen);
  }

  const additionalComments = optionalText(body.additionalComments, 2000, "Comments");
  if (!additionalComments.ok) return invalid(additionalComments.error);

  return {
    ok: true,
    data: {
      name,
      email,
      phone: phone.value,
      countryCode: countryCode.value,
      countryOfResidence: countryOfResidence.value,
      investmentTimeline: investmentTimeline.value,
      investmentPurpose: investmentPurpose.value,
      preferredLocation: preferredLocation.value,
      residencyInterest: residencyInterest.value,
      servicesNeeded,
      additionalComments: additionalComments.value,
    },
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- --run tests/intake/validate.test.ts`
Expected: PASS (16 tests)

- [ ] **Step 5: Commit**

```bash
git add lib/intake/validate.ts tests/intake/validate.test.ts
git commit -m "feat(intake): payload validation with option allowlists and honeypot"
```

---

## Task 3: `POST /api/intake`

**Files:**
- Create: `app/api/intake/route.ts`
- Test: `tests/api/intake-route.test.ts`

**Interfaces:**
- Consumes: `parseIntakePayload` (Task 2), `PURPOSE_TO_SEGMENT` (Task 1), `rateLimit`/`getClientIp` from `lib/rate-limit`, `sendPushNotification` from `lib/push/notify`, `summariseLead` from `lib/ai/lead-summary`.
- Produces: `POST /api/intake` returning `{ success: true, id: string }` with status 201, or `{ error: string }` with 400/429/500. Consumed by `IntakeForm` (Task 4).

- [ ] **Step 1: Write the failing test**

Create `tests/api/intake-route.test.ts`:

```ts
import { describe, it, expect, vi, beforeAll, beforeEach } from "vitest";
import { createClient, type Client } from "@libsql/client";
import { readFileSync } from "fs";
import { resolve } from "path";
import { NextRequest } from "next/server";

let db: Client;

async function makeTestDb(): Promise<Client> {
  const client = createClient({ url: "file::memory:" });
  const schema = readFileSync(resolve(__dirname, "../../lib/db/schema.sql"), "utf-8");
  for (const stmt of schema.split(";").map((s) => s.trim()).filter(Boolean)) {
    try {
      await client.execute(stmt);
    } catch (err) {
      const m = String(err);
      if (m.includes("duplicate column") || m.includes("already exists")) continue;
      throw err;
    }
  }
  return client;
}

vi.mock("@/lib/db/client", () => ({ getDb: () => db }));

const sendPushMock = vi.fn(async (..._args: unknown[]) => undefined);
vi.mock("@/lib/push/notify", () => ({
  sendPushNotification: (...args: unknown[]) => sendPushMock(...args),
}));

const summariseMock = vi.fn(async (..._args: unknown[]) => "summary text");
vi.mock("@/lib/ai/lead-summary", () => ({
  summariseLead: (...args: unknown[]) => summariseMock(...args),
}));

import { POST } from "@/app/api/intake/route";

function makeRequest(body: unknown, ip = "198.51.100.5"): NextRequest {
  return new NextRequest("http://localhost/api/intake", {
    method: "POST",
    headers: { "content-type": "application/json", "x-forwarded-for": ip },
    body: JSON.stringify(body),
  });
}

const base = {
  name: "Jane Smith",
  email: "jane@example.com",
  investmentPurpose: "Business Setup",
  investmentTimeline: "Within 6 months",
  servicesNeeded: ["Business Registration and Licensing"],
};

beforeAll(async () => {
  db = await makeTestDb();
});

beforeEach(async () => {
  await db.execute("DELETE FROM rate_limits");
  await db.execute("DELETE FROM leads");
  sendPushMock.mockClear();
  summariseMock.mockClear();
});

describe("POST /api/intake", () => {
  it("creates a lead with source intake and qualification connect", async () => {
    const res = await POST(makeRequest(base));
    expect(res.status).toBe(201);
    const rows = await db.execute("SELECT * FROM leads WHERE email = 'jane@example.com'");
    expect(rows.rows.length).toBe(1);
    expect(String(rows.rows[0].source)).toBe("intake");
    expect(String(rows.rows[0].qualification)).toBe("connect");
    expect(String(rows.rows[0].status)).toBe("new");
  });

  it("persists every intake column", async () => {
    await POST(
      makeRequest({
        ...base,
        countryOfResidence: "United Kingdom",
        preferredLocation: "Open / Flexible",
        residencyInterest: "Yes, for myself only",
        additionalComments: "Relocating next year.",
      }),
    );
    const row = (await db.execute("SELECT * FROM leads WHERE email = 'jane@example.com'")).rows[0];
    expect(String(row.country_of_residence)).toBe("United Kingdom");
    expect(String(row.investment_timeline)).toBe("Within 6 months");
    expect(String(row.investment_purpose)).toBe("Business Setup");
    expect(String(row.preferred_location)).toBe("Open / Flexible");
    expect(String(row.residency_interest)).toBe("Yes, for myself only");
    expect(JSON.parse(String(row.services_needed))).toEqual([
      "Business Registration and Licensing",
    ]);
    expect(String(row.additional_comments)).toBe("Relocating next year.");
  });

  it("derives segment and interests from the stated purpose", async () => {
    await POST(makeRequest(base));
    const row = (await db.execute("SELECT * FROM leads WHERE email = 'jane@example.com'")).rows[0];
    expect(String(row.segment)).toBe("entrepreneur");
    expect(String(row.interests)).toBe("Business Setup");
  });

  it("leaves segment null when no purpose was given", async () => {
    await POST(makeRequest({ name: "No Purpose", email: "np@example.com" }));
    const row = (await db.execute("SELECT * FROM leads WHERE email = 'np@example.com'")).rows[0];
    expect(row.segment).toBeNull();
  });

  it("sends a distinct intake push notification", async () => {
    await POST(makeRequest(base));
    expect(sendPushMock).toHaveBeenCalledTimes(1);
    const arg = sendPushMock.mock.calls[0][0] as { title: string; url: string };
    expect(arg.title).toContain("Intake");
    expect(arg.url).toBe("/admin/leads");
  });

  it("rejects an invalid payload with 400 and creates nothing", async () => {
    const res = await POST(makeRequest({ name: "J", email: "nope" }));
    expect(res.status).toBe(400);
    const rows = await db.execute("SELECT id FROM leads");
    expect(rows.rows.length).toBe(0);
  });

  it("returns success for a bot without creating a lead", async () => {
    const res = await POST(makeRequest({ ...base, _trap: "spam" }));
    expect(res.status).toBe(201);
    const rows = await db.execute("SELECT id FROM leads");
    expect(rows.rows.length).toBe(0);
    expect(sendPushMock).not.toHaveBeenCalled();
  });

  it("dedupes a repeat submission from the same email inside 24h", async () => {
    const first = await POST(makeRequest(base));
    const firstId = (await first.json()).id;
    sendPushMock.mockClear();

    const second = await POST(makeRequest(base));
    expect(second.status).toBe(201);
    expect((await second.json()).id).toBe(firstId);

    const rows = await db.execute("SELECT id FROM leads");
    expect(rows.rows.length).toBe(1);
    expect(sendPushMock).not.toHaveBeenCalled();
  });

  it("does not let an intake dedupe swallow a same-day lead from another source", async () => {
    await db.execute({
      sql: "INSERT INTO leads (name, email, source) VALUES (?, ?, 'main')",
      args: ["Chat Jane", "jane@example.com"],
    });
    const res = await POST(makeRequest(base));
    expect(res.status).toBe(201);
    const rows = await db.execute("SELECT source FROM leads WHERE email = 'jane@example.com'");
    expect(rows.rows.length).toBe(2);
  });

  it("caps burst submissions from one IP at 3 per 10 minutes", async () => {
    for (let i = 0; i < 3; i++) {
      const ok = await POST(makeRequest({ ...base, email: `burst${i}@example.com` }, "203.0.113.9"));
      expect(ok.status).toBe(201);
    }
    const blocked = await POST(makeRequest({ ...base, email: "burst4@example.com" }, "203.0.113.9"));
    expect(blocked.status).toBe(429);
    expect(blocked.headers.get("Retry-After")).toBeTruthy();
  });

  it("does not count a rate-limited attempt as a created lead", async () => {
    for (let i = 0; i < 4; i++) {
      await POST(makeRequest({ ...base, email: `x${i}@example.com` }, "203.0.113.10"));
    }
    const rows = await db.execute("SELECT id FROM leads");
    expect(rows.rows.length).toBe(3);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- --run tests/api/intake-route.test.ts`
Expected: FAIL — `Cannot find module '@/app/api/intake/route'`

- [ ] **Step 3: Create `app/api/intake/route.ts`**

```ts
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db/client";
import { rateLimit, getClientIp } from "@/lib/rate-limit";
import { sendPushNotification } from "@/lib/push/notify";
import { summariseLead, type LeadFacts } from "@/lib/ai/lead-summary";
import { parseIntakePayload } from "@/lib/intake/validate";
import { PURPOSE_TO_SEGMENT } from "@/lib/intake/constants";

/**
 * Public intake endpoint (spec 2026-07-26).
 *
 * Deliberately separate from /api/leads rather than adding a `source`
 * parameter there: source must never be browser-controlled, and this
 * payload carries seven extra fields with their own allowlists.
 *
 * Every intake lead is written as qualification 'connect'. The visitor
 * asked to be contacted before anything graded them, so a hot/warm/cold
 * label would be fiction, and 'Cold' in particular would push a real
 * inbound enquiry down Ahmed's triage list. `source = 'intake'` keeps them
 * separable from Omar-captured connect leads in reporting.
 */

async function generateIntakeSummary(leadId: string, facts: LeadFacts, extras: string) {
  try {
    // No conversation exists, so the structured answers stand in for the
    // transcript. summariseLead already accepts a null transcript; passing
    // the answers instead gives it something real to summarise.
    const summary = await summariseLead(facts, extras || null);
    const db = getDb();
    await db.execute({
      sql: "UPDATE leads SET ai_summary = ? WHERE id = ?",
      args: [summary, leadId],
    });
  } catch (err) {
    console.error("[intake] summary generation failed:", err);
  }
}

export async function POST(request: NextRequest) {
  try {
    // Public, unauthenticated, and it fans out to an AI call plus a push on
    // every accepted submission. Two windows, same shape as /api/leads but
    // tighter: an intake form is a considered action, not a chat reply.
    const ip = getClientIp(request);
    const burst = await rateLimit("intake_form", ip, 3, 600);
    if (!burst.allowed) {
      return NextResponse.json(
        { error: "Too many submissions. Please try again shortly." },
        { status: 429, headers: { "Retry-After": String(burst.retryAfterSec) } },
      );
    }
    const daily = await rateLimit("intake_form_day", ip, 10, 86400);
    if (!daily.allowed) {
      return NextResponse.json(
        { error: "Too many submissions. Please try again shortly." },
        { status: 429, headers: { "Retry-After": String(daily.retryAfterSec) } },
      );
    }

    let raw: unknown;
    try {
      raw = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid submission" }, { status: 400 });
    }

    const parsed = parseIntakePayload(raw);

    if (!parsed.ok && parsed.reason === "bot") {
      // Silent success: a bot that gets a 400 learns the trap exists.
      return NextResponse.json({ success: true, id: "" }, { status: 201 });
    }
    if (!parsed.ok) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }

    const data = parsed.data;
    const db = getDb();

    // Merges into existing columns so intake leads work with the filters,
    // charts and intelligence queries that already exist.
    const segment = data.investmentPurpose
      ? (PURPOSE_TO_SEGMENT[data.investmentPurpose] ?? null)
      : null;
    const interests = data.investmentPurpose;

    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)
      .toISOString().replace("T", " ").slice(0, 19);

    // Dedupe scoped to source = 'intake'. Unscoped, a same-day Omar chat
    // lead or marketplace signup on the same email would silently swallow
    // this submission (the exact bug caught in review during Batch 16).
    // Guard and INSERT are one statement so two racing submissions cannot
    // both land.
    const result = await db.execute({
      sql: `INSERT INTO leads
              (name, email, phone, country_code, country_of_residence, segment, interests,
               qualification, status, source, investment_timeline, investment_purpose,
               preferred_location, residency_interest, services_needed, additional_comments)
            SELECT ?, ?, ?, ?, ?, ?, ?, 'connect', 'new', 'intake', ?, ?, ?, ?, ?, ?
            WHERE NOT EXISTS (
              SELECT 1 FROM leads WHERE email = ? AND source = 'intake' AND created_at >= ?
            )
            RETURNING id`,
      args: [
        data.name,
        data.email,
        data.phone,
        data.countryCode,
        data.countryOfResidence,
        segment,
        interests,
        data.investmentTimeline,
        data.investmentPurpose,
        data.preferredLocation,
        data.residencyInterest,
        data.servicesNeeded.length > 0 ? JSON.stringify(data.servicesNeeded) : null,
        data.additionalComments,
        data.email,
        oneDayAgo,
      ],
    });

    // Zero rows means the guard fired: this email already submitted inside
    // 24h. Return the existing id in the normal success shape and skip the
    // AI and push fan-out, so a repeat submit looks identical to the
    // visitor and costs us nothing.
    if (result.rows.length === 0) {
      const existing = await db.execute({
        sql: `SELECT id FROM leads
              WHERE email = ? AND source = 'intake' AND created_at >= ?
              ORDER BY created_at DESC LIMIT 1`,
        args: [data.email, oneDayAgo],
      });
      return NextResponse.json(
        { success: true, id: String(existing.rows[0]?.id ?? "") },
        { status: 201 },
      );
    }

    const leadId = String(result.rows[0].id);

    const answerLines = [
      data.countryOfResidence ? `Country of residence: ${data.countryOfResidence}` : null,
      data.investmentTimeline ? `Timeline: ${data.investmentTimeline}` : null,
      data.investmentPurpose ? `Purpose: ${data.investmentPurpose}` : null,
      data.preferredLocation ? `Preferred location: ${data.preferredLocation}` : null,
      data.residencyInterest ? `Residency interest: ${data.residencyInterest}` : null,
      data.servicesNeeded.length > 0 ? `Services needed: ${data.servicesNeeded.join(", ")}` : null,
      data.additionalComments ? `Their comments: ${data.additionalComments}` : null,
    ].filter(Boolean).join("\n");

    generateIntakeSummary(
      leadId,
      {
        name: data.name,
        email: data.email,
        phone: data.phone,
        country_code: data.countryCode,
        segment,
        interests,
      },
      answerLines,
    ).catch(console.error);

    sendPushNotification({
      title: "📋 Intake Form",
      body: `${data.name} · ${data.investmentPurpose ?? "purpose not stated"}`,
      url: "/admin/leads",
    }).catch(console.error);

    return NextResponse.json({ success: true, id: leadId }, { status: 201 });
  } catch (error) {
    console.error("[intake] submission failed:", error);
    return NextResponse.json({ error: "Failed to submit. Please try again." }, { status: 500 });
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- --run tests/api/intake-route.test.ts`
Expected: PASS (11 tests)

- [ ] **Step 5: Commit**

```bash
git add app/api/intake/route.ts tests/api/intake-route.test.ts
git commit -m "feat(intake): POST /api/intake with rate limits, source scoping and dedupe"
```

---

## Task 4: Intake form component + `/intake` page

**Files:**
- Create: `components/intake/IntakeForm.tsx`
- Create: `app/intake/page.tsx`
- Test: `tests/intake/intake-form.test.tsx`

**Interfaces:**
- Consumes: the constants from Task 1, `POST /api/intake` from Task 3, `trackEvent` from `lib/analytics/track`.
- Produces: `<IntakeForm variant="page" | "popup" onSubmitted={() => void} />`. The popup (Task 5) renders it with `variant="popup"` and passes `onSubmitted` to persist the never-re-prompt flag.

- [ ] **Step 1: Write the failing test**

Create `tests/intake/intake-form.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { IntakeForm } from "@/components/intake/IntakeForm";

const fetchMock = vi.fn();

beforeEach(() => {
  fetchMock.mockReset();
  fetchMock.mockResolvedValue({
    ok: true,
    status: 201,
    json: async () => ({ success: true, id: "lead-1" }),
  });
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

function fillRequired() {
  fireEvent.change(screen.getByLabelText(/full name/i), { target: { value: "Jane Smith" } });
  fireEvent.change(screen.getByLabelText(/email address/i), {
    target: { value: "jane@example.com" },
  });
}

describe("IntakeForm", () => {
  it("renders every option list", () => {
    render(<IntakeForm variant="page" />);
    expect(screen.getByLabelText(/investment timeline/i)).toBeTruthy();
    expect(screen.getByLabelText(/purpose/i)).toBeTruthy();
    expect(screen.getByLabelText(/preferred location/i)).toBeTruthy();
    expect(screen.getByLabelText(/residency/i)).toBeTruthy();
    expect(screen.getByText(/services needed/i)).toBeTruthy();
  });

  it("keeps the honeypot hidden from assistive tech", () => {
    const { container } = render(<IntakeForm variant="page" />);
    const trap = container.querySelector('input[name="_trap"]');
    expect(trap).not.toBeNull();
    expect(trap?.getAttribute("aria-hidden")).toBe("true");
    expect(trap?.getAttribute("tabindex")).toBe("-1");
  });

  it("posts the collected answers to /api/intake", async () => {
    render(<IntakeForm variant="page" />);
    fillRequired();
    fireEvent.change(screen.getByLabelText(/investment timeline/i), {
      target: { value: "Within 6 months" },
    });
    fireEvent.click(screen.getByLabelText("Retirement Planning"));
    fireEvent.click(screen.getByRole("button", { name: /submit/i }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/intake");
    const body = JSON.parse((init as RequestInit).body as string);
    expect(body.name).toBe("Jane Smith");
    expect(body.email).toBe("jane@example.com");
    expect(body.investmentTimeline).toBe("Within 6 months");
    expect(body.servicesNeeded).toEqual(["Retirement Planning"]);
  });

  it("shows a thank-you state and calls onSubmitted after success", async () => {
    const onSubmitted = vi.fn();
    render(<IntakeForm variant="page" onSubmitted={onSubmitted} />);
    fillRequired();
    fireEvent.click(screen.getByRole("button", { name: /submit/i }));

    await waitFor(() => expect(screen.getByText(/thank you/i)).toBeTruthy());
    expect(onSubmitted).toHaveBeenCalledTimes(1);
  });

  it("surfaces a server error instead of pretending to succeed", async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 400,
      json: async () => ({ error: "A valid email address is required" }),
    });
    render(<IntakeForm variant="page" />);
    fillRequired();
    fireEvent.click(screen.getByRole("button", { name: /submit/i }));

    await waitFor(() =>
      expect(screen.getByText(/a valid email address is required/i)).toBeTruthy(),
    );
    expect(screen.queryByText(/thank you/i)).toBeNull();
  });

  it("does not double-submit while a request is in flight", async () => {
    let resolveFetch: (v: unknown) => void = () => {};
    fetchMock.mockReturnValue(new Promise((r) => { resolveFetch = r; }));
    render(<IntakeForm variant="page" />);
    fillRequired();
    const button = screen.getByRole("button", { name: /submit/i });
    fireEvent.click(button);
    fireEvent.click(button);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    resolveFetch({ ok: true, status: 201, json: async () => ({ success: true, id: "x" }) });
  });

  it("uses 16px inputs on mobile so iOS does not auto-zoom", () => {
    const { container } = render(<IntakeForm variant="page" />);
    const fields = container.querySelectorAll("input:not([type=checkbox]), select, textarea");
    expect(fields.length).toBeGreaterThan(0);
    fields.forEach((f) => {
      expect(f.className).toContain("text-base");
    });
  });

  it("contains no em dashes or en dashes in its rendered copy", () => {
    const { container } = render(<IntakeForm variant="page" />);
    expect(container.textContent ?? "").not.toMatch(/[–—]/);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- --run tests/intake/intake-form.test.tsx`
Expected: FAIL — `Cannot find module '@/components/intake/IntakeForm'`

- [ ] **Step 3: Create `components/intake/IntakeForm.tsx`**

```tsx
"use client";

import { useState } from "react";
import { Loader2, CheckCircle2 } from "lucide-react";
import {
  INVESTMENT_TIMELINES,
  INVESTMENT_PURPOSES,
  PREFERRED_LOCATIONS,
  RESIDENCY_OPTIONS,
  SERVICES_OPTIONS,
} from "@/lib/intake/constants";
import { trackEvent } from "@/lib/analytics/track";

type FormState = "idle" | "submitting" | "success" | "error";

/**
 * Shared intake form. Rendered full-width on /intake and inside the timed
 * popup, which is why sizing is driven by the parent container rather than
 * fixed widths here.
 *
 * `text-base sm:text-sm` on every focusable field is deliberate: iOS
 * auto-zooms on focus when a field is under 16px and never zooms back out.
 */

// Shared field styling. Repeated as a constant rather than a component so
// the native <select> and <textarea> semantics stay untouched.
const FIELD_CLASS =
  "w-full rounded-lg border border-gray-200 bg-warm-white px-3 py-2.5 text-base sm:text-sm " +
  "text-navy focus:border-gold focus:ring-2 focus:ring-gold/20 outline-none transition-all";

const LABEL_CLASS = "block text-sm font-medium text-gray-700 mb-1";

export interface IntakeFormProps {
  variant: "page" | "popup";
  onSubmitted?: () => void;
}

export function IntakeForm({ variant, onSubmitted }: IntakeFormProps) {
  const [state, setState] = useState<FormState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [services, setServices] = useState<string[]>([]);

  function toggleService(service: string) {
    setServices((prev) =>
      prev.includes(service) ? prev.filter((s) => s !== service) : [...prev, service],
    );
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (state === "submitting") return;
    setState("submitting");
    setError(null);

    const fd = new FormData(e.currentTarget);
    const payload = {
      name: String(fd.get("name") ?? ""),
      email: String(fd.get("email") ?? ""),
      phone: String(fd.get("phone") ?? ""),
      countryCode: String(fd.get("countryCode") ?? ""),
      countryOfResidence: String(fd.get("countryOfResidence") ?? ""),
      investmentTimeline: String(fd.get("investmentTimeline") ?? ""),
      investmentPurpose: String(fd.get("investmentPurpose") ?? ""),
      preferredLocation: String(fd.get("preferredLocation") ?? ""),
      residencyInterest: String(fd.get("residencyInterest") ?? ""),
      servicesNeeded: services,
      additionalComments: String(fd.get("additionalComments") ?? ""),
      _trap: String(fd.get("_trap") ?? ""),
    };

    try {
      const res = await fetch("/api/intake", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Something went wrong. Please try again.");
        setState("error");
        return;
      }
      trackEvent("intake_submit", { location: variant });
      setState("success");
      onSubmitted?.();
    } catch {
      setError("Connection error. Please try again.");
      setState("error");
    }
  }

  if (state === "success") {
    return (
      <div className="flex flex-col items-center gap-4 py-10 text-center">
        <div className="w-14 h-14 rounded-full bg-gold/15 flex items-center justify-center">
          <CheckCircle2 className="w-7 h-7 text-gold" />
        </div>
        <h2 className="font-heading text-2xl text-navy">Thank you</h2>
        <p className="text-sm text-gray-600 max-w-sm">
          Your enquiry has reached the Gateway to Oman team. We will review it and get back to you
          shortly.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Honeypot. Real visitors never see or tab to this; bots fill it. */}
      <input
        type="text"
        name="_trap"
        autoComplete="off"
        tabIndex={-1}
        aria-hidden="true"
        className="hidden"
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="intake-name" className={LABEL_CLASS}>
            Full Name <span className="text-red-500">*</span>
          </label>
          <input id="intake-name" name="name" required maxLength={120}
            placeholder="Jane Smith" className={FIELD_CLASS} />
        </div>
        <div>
          <label htmlFor="intake-email" className={LABEL_CLASS}>
            Email Address <span className="text-red-500">*</span>
          </label>
          <input id="intake-email" name="email" type="email" required maxLength={200}
            placeholder="jane@example.com" className={FIELD_CLASS} />
        </div>
        <div>
          <label htmlFor="intake-code" className={LABEL_CLASS}>Country Code</label>
          <input id="intake-code" name="countryCode" maxLength={8}
            placeholder="+968" className={FIELD_CLASS} />
        </div>
        <div>
          <label htmlFor="intake-phone" className={LABEL_CLASS}>Phone Number</label>
          <input id="intake-phone" name="phone" type="tel" maxLength={30}
            placeholder="9123 4567" className={FIELD_CLASS} />
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="intake-country" className={LABEL_CLASS}>Country of Residence</label>
          <input id="intake-country" name="countryOfResidence" maxLength={100}
            placeholder="United Kingdom" className={FIELD_CLASS} />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="intake-timeline" className={LABEL_CLASS}>Investment Timeline</label>
          <select id="intake-timeline" name="investmentTimeline" className={FIELD_CLASS} defaultValue="">
            <option value="">Select an option</option>
            {INVESTMENT_TIMELINES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="intake-purpose" className={LABEL_CLASS}>Purpose</label>
          <select id="intake-purpose" name="investmentPurpose" className={FIELD_CLASS} defaultValue="">
            <option value="">Select an option</option>
            {INVESTMENT_PURPOSES.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="intake-location" className={LABEL_CLASS}>Preferred Location in Oman</label>
          <select id="intake-location" name="preferredLocation" className={FIELD_CLASS} defaultValue="">
            <option value="">Select an option</option>
            {PREFERRED_LOCATIONS.map((l) => <option key={l} value={l}>{l}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="intake-residency" className={LABEL_CLASS}>Residency or Sponsorship Interest</label>
          <select id="intake-residency" name="residencyInterest" className={FIELD_CLASS} defaultValue="">
            <option value="">Select an option</option>
            {RESIDENCY_OPTIONS.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>
      </div>

      <fieldset>
        <legend className={LABEL_CLASS}>Services Needed</legend>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {SERVICES_OPTIONS.map((s) => (
            <label key={s} className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer select-none">
              <input
                type="checkbox"
                aria-label={s}
                checked={services.includes(s)}
                onChange={() => toggleService(s)}
                className="h-4 w-4 rounded border-gray-300 text-gold focus:ring-gold/30"
              />
              {s}
            </label>
          ))}
        </div>
      </fieldset>

      <div>
        <label htmlFor="intake-comments" className={LABEL_CLASS}>
          Additional Comments or Questions
        </label>
        <textarea
          id="intake-comments"
          name="additionalComments"
          maxLength={2000}
          rows={variant === "popup" ? 3 : 4}
          placeholder="Anything else you would like us to know"
          className={`${FIELD_CLASS} resize-none`}
        />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={state === "submitting"}
        className="w-full gold-gradient text-white font-semibold rounded-lg px-6 py-3 inline-flex items-center justify-center gap-2 shadow-md shadow-gold/20 hover:shadow-lg transition-shadow disabled:opacity-60"
      >
        {state === "submitting" && <Loader2 className="w-4 h-4 animate-spin" />}
        {state === "submitting" ? "Submitting" : "Submit Enquiry"}
      </button>
    </form>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- --run tests/intake/intake-form.test.tsx`
Expected: PASS (8 tests)

- [ ] **Step 5: Create `app/intake/page.tsx`**

Before writing, look at `app/admin/layout.tsx` for the GTO logo used by the PWA loading screen and reuse the same `<Image>` source and dimensions so branding matches.

```tsx
import Image from "next/image";
import Link from "next/link";
import { IntakeForm } from "@/components/intake/IntakeForm";

export const metadata = {
  title: "Start Your Oman Journey — Gateway to Oman",
  description: "Tell the Gateway to Oman advisory team about your goals and we will be in touch.",
  // Unlisted: this is a link Ahmed shares directly with prospects, not a
  // page we want competing with the landing page in search results.
  robots: { index: false, follow: false },
};

export default function IntakePage() {
  return (
    <div className="min-h-screen bg-warm-white flex flex-col">
      <header className="border-b border-gray-200 bg-white">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <Link href="/" className="inline-flex items-center gap-3">
            {/* Use the same logo asset as the admin loading screen. */}
            <Image src="/icon-192.png" alt="Gateway to Oman" width={32} height={32} className="rounded" />
            <span className="font-heading text-lg text-navy">Gateway to Oman</span>
          </Link>
        </div>
      </header>

      <main className="flex-1 flex items-start justify-center px-4 py-10">
        <div className="w-full max-w-2xl bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sm:p-8">
          <div className="mb-8">
            <h1 className="font-heading text-3xl text-navy">Start Your Oman Journey</h1>
            <p className="mt-2 text-sm text-gray-600">
              Share a few details and our advisory team will be in touch to discuss your goals.
            </p>
          </div>
          <IntakeForm variant="page" />
        </div>
      </main>

      <footer className="text-center py-6 text-xs text-gray-500">
        <Link href="/privacy" className="hover:text-gold transition-colors">Privacy</Link>
        <span className="mx-2">·</span>
        <Link href="/terms" className="hover:text-gold transition-colors">Terms</Link>
      </footer>
    </div>
  );
}
```

- [ ] **Step 6: Verify the page builds and renders**

Run: `npm run build`
Expected: build succeeds, route count increases by two (`/intake` and `/api/intake`).

- [ ] **Step 7: Commit**

```bash
git add components/intake/IntakeForm.tsx app/intake/page.tsx tests/intake/intake-form.test.tsx
git commit -m "feat(intake): shareable /intake page and shared form component"
```

---

## Task 5: Timed popup

**Files:**
- Create: `lib/intake/popup.ts`
- Create: `components/intake/IntakePopup.tsx`
- Modify: `app/layout.tsx`
- Modify: `components/chat/ChatWidget.tsx` (one import, one call)
- Test: `tests/intake/popup.test.ts`, `tests/intake/intake-popup.test.tsx`

**Interfaces:**
- Consumes: `IntakeForm` (Task 4), `trackEvent`.
- Produces: `markChatEngaged()` (called by `ChatWidget`), `shouldArmIntakePopup(state)`, `INTAKE_POPUP_DELAY_MS`, and the three storage-key constants.

- [ ] **Step 1: Write the failing predicate test**

Create `tests/intake/popup.test.ts`:

```ts
import { describe, it, expect, beforeEach } from "vitest";
import {
  isIntakePopupPath,
  shouldArmIntakePopup,
  readPopupGateState,
  markIntakeDismissed,
  markIntakeSubmitted,
  markChatEngaged,
  INTAKE_POPUP_DELAY_MS,
} from "@/lib/intake/popup";

beforeEach(() => {
  window.sessionStorage.clear();
  window.localStorage.clear();
});

describe("isIntakePopupPath", () => {
  it("allows exactly the two home pages", () => {
    expect(isIntakePopupPath("/")).toBe(true);
    expect(isIntakePopupPath("/businesses")).toBe(true);
  });

  it("blocks every other path", () => {
    for (const p of [
      "/admin", "/admin/leads", "/intake", "/privacy", "/terms",
      "/businesses/listings", "/businesses/access", "/businesses/listing/abc", null,
    ]) {
      expect(isIntakePopupPath(p)).toBe(false);
    }
  });
});

describe("shouldArmIntakePopup", () => {
  const base = { pathname: "/", dismissed: false, submitted: false, chatEngaged: false };

  it("arms on a clean first visit to an allowed page", () => {
    expect(shouldArmIntakePopup(base)).toBe(true);
  });

  it("does not arm on a disallowed page", () => {
    expect(shouldArmIntakePopup({ ...base, pathname: "/admin" })).toBe(false);
  });

  it("does not arm after a dismissal this session", () => {
    expect(shouldArmIntakePopup({ ...base, dismissed: true })).toBe(false);
  });

  it("does not arm for someone who already submitted", () => {
    expect(shouldArmIntakePopup({ ...base, submitted: true })).toBe(false);
  });

  it("does not arm for someone who opened the chat", () => {
    expect(shouldArmIntakePopup({ ...base, chatEngaged: true })).toBe(false);
  });
});

describe("storage markers", () => {
  it("fires after fifteen seconds", () => {
    expect(INTAKE_POPUP_DELAY_MS).toBe(15000);
  });

  it("keeps dismissal to the session and submission beyond it", () => {
    markIntakeDismissed();
    markIntakeSubmitted();
    const state = readPopupGateState("/");
    expect(state.dismissed).toBe(true);
    expect(state.submitted).toBe(true);

    // A new session clears sessionStorage but not localStorage.
    window.sessionStorage.clear();
    const next = readPopupGateState("/");
    expect(next.dismissed).toBe(false);
    expect(next.submitted).toBe(true);
  });

  it("records chat engagement in session storage", () => {
    markChatEngaged();
    expect(readPopupGateState("/").chatEngaged).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- --run tests/intake/popup.test.ts`
Expected: FAIL — `Cannot find module '@/lib/intake/popup'`

- [ ] **Step 3: Create `lib/intake/popup.ts`**

```ts
/**
 * Gating logic for the timed intake popup (spec 2026-07-26).
 *
 * Kept free of React so every rule is unit-testable without rendering.
 *
 * Scope is deliberately narrow: the two home pages only. This is an
 * interruption, and an interruption on a listing detail page or a legal
 * page is just noise.
 */

export const INTAKE_POPUP_PATHS = ["/", "/businesses"] as const;
export const INTAKE_POPUP_DELAY_MS = 15_000;

/** Session-scoped: a dismissal lasts this visit only, per JA. */
export const INTAKE_DISMISSED_KEY = "gto_intake_dismissed";
/** Persistent: someone who submitted is never prompted again. */
export const INTAKE_SUBMITTED_KEY = "gto_intake_submitted";
/**
 * Session-scoped: set when the Omar panel opens. A visitor already talking
 * to Omar is engaged, and dropping a modal form over a live conversation
 * would interrupt the primary lead flow to sell them the secondary one.
 */
export const CHAT_ENGAGED_KEY = "gto_chat_engaged";

export interface PopupGateState {
  pathname: string | null;
  dismissed: boolean;
  submitted: boolean;
  chatEngaged: boolean;
}

export function isIntakePopupPath(pathname: string | null): boolean {
  if (!pathname) return false;
  return (INTAKE_POPUP_PATHS as readonly string[]).includes(pathname);
}

export function shouldArmIntakePopup(state: PopupGateState): boolean {
  return (
    isIntakePopupPath(state.pathname) &&
    !state.dismissed &&
    !state.submitted &&
    !state.chatEngaged
  );
}

// Storage access is wrapped: Safari private mode throws on write, and a
// thrown error here would take down the page that hosts the popup.
function safeSet(store: "session" | "local", key: string): void {
  if (typeof window === "undefined") return;
  try {
    (store === "session" ? window.sessionStorage : window.localStorage).setItem(key, "1");
  } catch {
    // storage unavailable: the popup simply behaves as if never dismissed
  }
}

function safeHas(store: "session" | "local", key: string): boolean {
  if (typeof window === "undefined") return false;
  try {
    return (store === "session" ? window.sessionStorage : window.localStorage).getItem(key) !== null;
  } catch {
    return false;
  }
}

export function markIntakeDismissed(): void { safeSet("session", INTAKE_DISMISSED_KEY); }
export function markIntakeSubmitted(): void { safeSet("local", INTAKE_SUBMITTED_KEY); }
export function markChatEngaged(): void { safeSet("session", CHAT_ENGAGED_KEY); }

export function readPopupGateState(pathname: string | null): PopupGateState {
  return {
    pathname,
    dismissed: safeHas("session", INTAKE_DISMISSED_KEY),
    submitted: safeHas("local", INTAKE_SUBMITTED_KEY),
    chatEngaged: safeHas("session", CHAT_ENGAGED_KEY),
  };
}
```

- [ ] **Step 4: Run the predicate test to verify it passes**

Run: `npm test -- --run tests/intake/popup.test.ts`
Expected: PASS (10 tests)

- [ ] **Step 5: Write the failing component test**

Create `tests/intake/intake-popup.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act, fireEvent } from "@testing-library/react";
import { IntakePopup } from "@/components/intake/IntakePopup";
import { markIntakeSubmitted, markChatEngaged, INTAKE_DISMISSED_KEY } from "@/lib/intake/popup";

let pathname = "/";
vi.mock("next/navigation", () => ({ usePathname: () => pathname }));

beforeEach(() => {
  pathname = "/";
  window.sessionStorage.clear();
  window.localStorage.clear();
  vi.useFakeTimers();
  vi.stubGlobal("fetch", vi.fn());
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

function advance(ms: number) {
  act(() => { vi.advanceTimersByTime(ms); });
}

describe("IntakePopup", () => {
  it("stays hidden before fifteen seconds", () => {
    render(<IntakePopup />);
    advance(14_000);
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("opens at fifteen seconds on the main home page", () => {
    render(<IntakePopup />);
    advance(15_000);
    expect(screen.getByRole("dialog")).toBeTruthy();
  });

  it("opens on the marketplace home page", () => {
    pathname = "/businesses";
    render(<IntakePopup />);
    advance(15_000);
    expect(screen.getByRole("dialog")).toBeTruthy();
  });

  it("never opens on admin", () => {
    pathname = "/admin/leads";
    render(<IntakePopup />);
    advance(60_000);
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("never opens on a listing page", () => {
    pathname = "/businesses/listings";
    render(<IntakePopup />);
    advance(60_000);
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("never opens for a visitor who already submitted", () => {
    markIntakeSubmitted();
    render(<IntakePopup />);
    advance(60_000);
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("never opens for a visitor who opened the chat", () => {
    markChatEngaged();
    render(<IntakePopup />);
    advance(60_000);
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("closes on the close button and records a session dismissal", () => {
    render(<IntakePopup />);
    advance(15_000);
    fireEvent.click(screen.getByRole("button", { name: /close/i }));
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(window.sessionStorage.getItem(INTAKE_DISMISSED_KEY)).toBe("1");
  });

  it("closes on Escape", () => {
    render(<IntakePopup />);
    advance(15_000);
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("closes on a backdrop click", () => {
    render(<IntakePopup />);
    advance(15_000);
    fireEvent.click(screen.getByTestId("intake-popup-backdrop"));
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("stacks above the consent banner and the chat", () => {
    render(<IntakePopup />);
    advance(15_000);
    expect(screen.getByTestId("intake-popup-backdrop").className).toContain("z-[60]");
  });
});
```

- [ ] **Step 6: Run it to verify it fails**

Run: `npm test -- --run tests/intake/intake-popup.test.tsx`
Expected: FAIL — `Cannot find module '@/components/intake/IntakePopup'`

- [ ] **Step 7: Create `components/intake/IntakePopup.tsx`**

```tsx
"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { X } from "lucide-react";
import { IntakeForm } from "@/components/intake/IntakeForm";
import { trackEvent } from "@/lib/analytics/track";
import {
  INTAKE_POPUP_DELAY_MS,
  readPopupGateState,
  shouldArmIntakePopup,
  markIntakeDismissed,
  markIntakeSubmitted,
} from "@/lib/intake/popup";

/**
 * Timed intake popup (spec 2026-07-26): fires 15 seconds into a visit, on
 * the main home page and the marketplace home page only.
 *
 * z-[60] is above the consent banner (z-40) and the Omar chat (z-50). That
 * is intentional for a modal, and safe: this closes in one click and the
 * banner is interactive again immediately. Gating on a consent decision was
 * rejected, because the banner persists until clicked and indifferent
 * visitors would then never see the popup at all.
 */
export function IntakePopup() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    // Storage is only readable after mount, so arming happens here rather
    // than during render (the same constraint the consent banner has).
    if (!shouldArmIntakePopup(readPopupGateState(pathname))) return;

    const timer = window.setTimeout(() => {
      // Re-check at fire time: the visitor may have opened the chat or
      // submitted the form during the 15 seconds.
      if (!shouldArmIntakePopup(readPopupGateState(pathname))) return;
      setOpen(true);
      trackEvent("intake_popup_shown", { path: pathname });
    }, INTAKE_POPUP_DELAY_MS);

    return () => window.clearTimeout(timer);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") close();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  });

  function close() {
    markIntakeDismissed();
    trackEvent("intake_popup_dismissed", { path: pathname });
    setOpen(false);
  }

  function handleSubmitted() {
    // Persistent, unlike the dismissal: someone who submitted is never
    // prompted again, on this visit or any later one.
    markIntakeSubmitted();
  }

  if (!open) return null;

  return (
    <div
      data-testid="intake-popup-backdrop"
      onClick={close}
      className="fixed inset-0 z-[60] bg-navy/60 backdrop-blur-sm flex items-start sm:items-center justify-center p-4 overflow-y-auto"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="intake-popup-title"
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl my-8 p-5 sm:p-7"
      >
        <button
          type="button"
          onClick={close}
          aria-label="Close"
          className="absolute top-3 right-3 p-1.5 rounded-lg text-gray-400 hover:text-navy hover:bg-gray-100 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <h2 id="intake-popup-title" className="font-heading text-2xl text-navy pr-8">
          Planning a move to Oman?
        </h2>
        <p className="mt-1.5 mb-5 text-sm text-gray-600">
          Tell us what you are exploring and our advisory team will be in touch.
        </p>

        <IntakeForm variant="popup" onSubmitted={handleSubmitted} />
      </div>
    </div>
  );
}
```

- [ ] **Step 8: Run the component test to verify it passes**

Run: `npm test -- --run tests/intake/intake-popup.test.tsx`
Expected: PASS (11 tests)

- [ ] **Step 9: Mount the popup in `app/layout.tsx`**

Add the import beside the existing `ConsentBanner` import:

```tsx
import { IntakePopup } from "@/components/intake/IntakePopup";
```

and render it directly after `<ConsentBanner />`:

```tsx
        <GoogleAnalytics />
        <ConsentBanner />
        {/* Timed intake popup (spec 2026-07-26). Mounted globally like the
            consent banner; it gates itself to "/" and "/businesses" and
            renders nothing anywhere else, including /admin. */}
        <IntakePopup />
```

- [ ] **Step 10: Signal chat engagement from `ChatWidget`**

In `components/chat/ChatWidget.tsx`, add the import:

```tsx
import { markChatEngaged } from "@/lib/intake/popup";
```

Then find the handler that opens the panel from the floating button (the one that sets the widget's open state to true) and call `markChatEngaged();` as its first statement. Add this comment above the call:

```tsx
      // A visitor who opens Omar is already engaged: suppress the timed
      // intake popup for the rest of this session so a modal form never
      // lands on top of a live conversation.
      markChatEngaged();
```

Do not change any other behaviour in this file.

- [ ] **Step 11: Verify nothing regressed in the chat suite**

Run: `npm test -- --run tests/chat`
Expected: PASS, same count as before this task.

- [ ] **Step 12: Commit**

```bash
git add lib/intake/popup.ts components/intake/IntakePopup.tsx app/layout.tsx components/chat/ChatWidget.tsx tests/intake/popup.test.ts tests/intake/intake-popup.test.tsx
git commit -m "feat(intake): 15s timed popup scoped to the two home pages"
```

---

## Task 6: Admin lead detail page

**Files:**
- Modify: `app/api/admin/leads/[id]/route.ts` (add `GET`)
- Create: `app/admin/leads/[id]/page.tsx`
- Test: `tests/api/admin-lead-detail.test.ts`

**Interfaces:**
- Consumes: `requireAuth` from `lib/auth/token`, `LeadNotesTimeline` from `components/admin/LeadNotesTimeline`, the constants from Task 1.
- Produces: `GET /api/admin/leads/:id` returning `{ lead, messages, pendingEmail }`, consumed by the detail page and by the leads list (Task 7) for navigation only.

- [ ] **Step 1: Write the failing test**

Create `tests/api/admin-lead-detail.test.ts`:

```ts
import { describe, it, expect, vi, beforeAll, beforeEach } from "vitest";
import { createClient, type Client } from "@libsql/client";
import { readFileSync } from "fs";
import { resolve } from "path";
import { NextRequest } from "next/server";

let db: Client;
let authed = true;

async function makeTestDb(): Promise<Client> {
  const client = createClient({ url: "file::memory:" });
  const schema = readFileSync(resolve(__dirname, "../../lib/db/schema.sql"), "utf-8");
  for (const stmt of schema.split(";").map((s) => s.trim()).filter(Boolean)) {
    try {
      await client.execute(stmt);
    } catch (err) {
      const m = String(err);
      if (m.includes("duplicate column") || m.includes("already exists")) continue;
      throw err;
    }
  }
  return client;
}

vi.mock("@/lib/db/client", () => ({ getDb: () => db }));
vi.mock("@/lib/auth/token", () => ({
  requireAuth: async () =>
    authed ? null : new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 }),
  getRequestUser: async () => (authed ? { id: "admin-1", role: "owner" } : null),
}));

import { GET } from "@/app/api/admin/leads/[id]/route";

function makeRequest(id: string): NextRequest {
  return new NextRequest(`http://localhost/api/admin/leads/${id}`);
}

async function seedLead(): Promise<string> {
  const r = await db.execute({
    sql: `INSERT INTO leads
            (name, email, source, qualification, investment_timeline, investment_purpose,
             services_needed, score_breakdown)
          VALUES (?, ?, 'intake', 'connect', ?, ?, ?, ?)
          RETURNING id`,
    args: [
      "Jane Smith", "jane@example.com", "Within 6 months", "Business Setup",
      JSON.stringify(["Retirement Planning"]), JSON.stringify({ total: 55 }),
    ],
  });
  return String(r.rows[0].id);
}

beforeAll(async () => {
  db = await makeTestDb();
});

beforeEach(async () => {
  authed = true;
  await db.execute("DELETE FROM leads");
  await db.execute("DELETE FROM messages");
  await db.execute("DELETE FROM conversations");
});

describe("GET /api/admin/leads/[id]", () => {
  it("requires authentication", async () => {
    authed = false;
    const id = await seedLead();
    const res = await GET(makeRequest(id), { params: Promise.resolve({ id }) });
    expect(res.status).toBe(401);
  });

  it("returns the lead with every intake field", async () => {
    const id = await seedLead();
    const res = await GET(makeRequest(id), { params: Promise.resolve({ id }) });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.lead.name).toBe("Jane Smith");
    expect(body.lead.investment_timeline).toBe("Within 6 months");
    expect(body.lead.investment_purpose).toBe("Business Setup");
    expect(body.lead.source).toBe("intake");
  });

  it("does not leak score_breakdown to the browser", async () => {
    const id = await seedLead();
    const res = await GET(makeRequest(id), { params: Promise.resolve({ id }) });
    const body = await res.json();
    expect(body.lead.score_breakdown).toBeUndefined();
  });

  it("returns 404 for an unknown lead", async () => {
    const res = await GET(makeRequest("nope"), { params: Promise.resolve({ id: "nope" }) });
    expect(res.status).toBe(404);
  });

  it("returns an empty transcript when the lead has no conversation", async () => {
    const id = await seedLead();
    const res = await GET(makeRequest(id), { params: Promise.resolve({ id }) });
    const body = await res.json();
    expect(body.messages).toEqual([]);
  });

  it("returns the transcript in order when a conversation exists", async () => {
    const conv = await db.execute({
      sql: "INSERT INTO conversations (source) VALUES ('main') RETURNING id",
      args: [],
    });
    const convId = String(conv.rows[0].id);
    for (const [role, content] of [["user", "Hello"], ["assistant", "Hi there"]]) {
      await db.execute({
        sql: "INSERT INTO messages (conversation_id, role, content) VALUES (?, ?, ?)",
        args: [convId, role, content],
      });
    }
    const r = await db.execute({
      sql: "INSERT INTO leads (name, email, conversation_id) VALUES (?, ?, ?) RETURNING id",
      args: ["Chat Lead", "chat@example.com", convId],
    });
    const id = String(r.rows[0].id);

    const res = await GET(makeRequest(id), { params: Promise.resolve({ id }) });
    const body = await res.json();
    expect(body.messages.length).toBe(2);
    expect(body.messages[0].role).toBe("user");
    expect(body.messages[0].content).toBe("Hello");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- --run tests/api/admin-lead-detail.test.ts`
Expected: FAIL — `GET` is not exported from the route module.

- [ ] **Step 3: Add the `GET` handler to `app/api/admin/leads/[id]/route.ts`**

Insert immediately after the imports, before the existing `isValidOption` helper:

```ts
/**
 * Single-lead read for the admin detail page (/admin/leads/[id]).
 *
 * Returns the lead, its transcript, and any pending draft email in one
 * round trip so the page does not waterfall three requests.
 *
 * score_breakdown is stripped: it is internal scoring state that the
 * browser has no use for (closes audit finding C-1 for this route; the
 * list endpoint still selects it and is tracked separately).
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const authError = await requireAuth(request);
  if (authError) return authError;

  const { id: leadId } = await params;
  const db = getDb();

  const leadRow = await db.execute({
    sql: "SELECT * FROM leads WHERE id = ?",
    args: [leadId],
  });
  if (leadRow.rows.length === 0) {
    return NextResponse.json({ error: "Lead not found" }, { status: 404 });
  }

  const { score_breakdown: _omit, ...lead } = leadRow.rows[0] as unknown as Record<string, unknown>;

  let messages: { role: string; content: string; created_at: string }[] = [];
  if (lead.conversation_id) {
    const msgRows = await db.execute({
      sql: "SELECT role, content, created_at FROM messages WHERE conversation_id = ? ORDER BY created_at ASC",
      args: [String(lead.conversation_id)],
    });
    messages = msgRows.rows.map((m) => ({
      role: String(m.role),
      content: String(m.content),
      created_at: String(m.created_at),
    }));
  }

  const emailRow = await db.execute({
    sql: "SELECT id, subject FROM emails WHERE lead_id = ? AND status = 'draft' ORDER BY created_at DESC LIMIT 1",
    args: [leadId],
  });
  const pendingEmail = emailRow.rows[0]
    ? { id: String(emailRow.rows[0].id), subject: String(emailRow.rows[0].subject) }
    : null;

  return NextResponse.json({ lead, messages, pendingEmail });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- --run tests/api/admin-lead-detail.test.ts`
Expected: PASS (6 tests)

- [ ] **Step 5: Create `app/admin/leads/[id]/page.tsx`**

Layout mirrors the previous developer's client-detail page, which JA explicitly asked to reproduce: a wide left column of read-only information cards and a narrow right sidebar of CRM controls, notes, and the delete action.

```tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, Mail, Phone, Globe, Calendar, MapPin, TrendingUp, Users, Trash2,
} from "lucide-react";
import { LeadNotesTimeline } from "@/components/admin/LeadNotesTimeline";

interface LeadDetail {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  country_code: string | null;
  country_of_residence: string | null;
  segment: string | null;
  interests: string | null;
  qualification: string | null;
  status: string | null;
  source: string | null;
  lead_score: number | null;
  ai_summary: string | null;
  conversation_id: string | null;
  created_at: string;
  updated_at: string | null;
  investment_timeline: string | null;
  investment_purpose: string | null;
  preferred_location: string | null;
  residency_interest: string | null;
  services_needed: string | null;
  additional_comments: string | null;
}

interface LeadOption { slug: string; label: string }
type LeadOptionsByKind = { status: LeadOption[]; qualification: LeadOption[]; segment: LeadOption[] };
const EMPTY_OPTIONS: LeadOptionsByKind = { status: [], qualification: [], segment: [] };

/** services_needed is stored as a JSON array string; never trust it to parse. */
function parseServices(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((s) => typeof s === "string") : [];
  } catch {
    return [];
  }
}

function InfoRow({
  icon: Icon, label, value,
}: {
  icon: typeof Mail; label: string; value?: string | null;
}) {
  return (
    <div className="flex items-start gap-2.5">
      <Icon className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
      <div className="min-w-0">
        <p className="text-xs text-gray-500">{label}</p>
        <p className="text-sm text-navy font-medium break-words">{value || "Not provided"}</p>
      </div>
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl shadow-sm p-5">
      <h2 className="text-base font-semibold text-navy mb-4">{title}</h2>
      {children}
    </div>
  );
}

export default function LeadDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const leadId = params.id;

  const [lead, setLead] = useState<LeadDetail | null>(null);
  const [messages, setMessages] = useState<{ role: string; content: string }[]>([]);
  const [options, setOptions] = useState<LeadOptionsByKind>(EMPTY_OPTIONS);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    async function load() {
      const [detailRes, optionsRes] = await Promise.all([
        fetch(`/api/admin/leads/${leadId}`, { credentials: "include" }),
        fetch("/api/admin/lead-options", { credentials: "include" }),
      ]);
      if (detailRes.status === 404) { setNotFound(true); setLoading(false); return; }
      if (detailRes.ok) {
        const data = await detailRes.json();
        setLead(data.lead);
        setMessages(data.messages ?? []);
      }
      if (optionsRes.ok) {
        const data = (await optionsRes.json()) as {
          options: { kind: "status" | "qualification" | "segment"; slug: string; label: string }[];
        };
        const grouped: LeadOptionsByKind = { status: [], qualification: [], segment: [] };
        for (const o of data.options) {
          if (o.kind in grouped) grouped[o.kind].push({ slug: o.slug, label: o.label });
        }
        setOptions(grouped);
      }
      setLoading(false);
    }
    load();
  }, [leadId]);

  const patch = useCallback(
    async (field: "status" | "qualification" | "segment", value: string) => {
      setLead((prev) => (prev ? { ...prev, [field]: value } : prev));
      await fetch(`/api/admin/leads/${leadId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ [field]: value }),
      });
    },
    [leadId],
  );

  async function handleDelete() {
    if (!lead) return;
    if (!window.confirm(`Delete lead "${lead.name}" (${lead.email})? This also wipes their chat transcript and any inquiries. Cannot be undone.`)) return;
    const res = await fetch(`/api/admin/leads/${leadId}`, { method: "DELETE", credentials: "include" });
    if (!res.ok) { window.alert("Delete failed."); return; }
    router.push("/admin/leads");
  }

  if (loading) return <div className="p-8 text-center text-gray-400">Loading lead...</div>;
  if (notFound || !lead) {
    return (
      <div className="p-8 text-center space-y-3">
        <p className="text-gray-500">Lead not found.</p>
        <Link href="/admin/leads" className="text-gold text-sm hover:underline">Back to leads</Link>
      </div>
    );
  }

  const services = parseServices(lead.services_needed);
  const hasIntakeAnswers =
    Boolean(lead.investment_timeline || lead.investment_purpose || lead.preferred_location ||
      lead.residency_interest || lead.additional_comments) || services.length > 0;

  const selectClass =
    "w-full rounded-lg border border-gray-200 bg-white px-2 py-2 text-base sm:text-sm text-navy";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <Link href="/admin/leads" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-navy">
          <ArrowLeft className="w-4 h-4" /> Back to leads
        </Link>
        <div className="text-right">
          <h1 className="text-2xl font-bold text-navy">{lead.name}</h1>
          <p className="text-sm text-gray-500">{lead.country_of_residence ?? lead.email}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-5">
          <Card title="Contact Information">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <InfoRow icon={Mail} label="Email" value={lead.email} />
              <InfoRow icon={Phone} label="Phone"
                value={lead.country_code && lead.phone ? `${lead.country_code} ${lead.phone}` : lead.phone} />
              <InfoRow icon={Globe} label="Country of Residence" value={lead.country_of_residence} />
              <InfoRow icon={Calendar} label="Submitted"
                value={new Date(lead.created_at).toLocaleString()} />
            </div>
          </Card>

          {hasIntakeAnswers && (
            <Card title="Investment Profile">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <InfoRow icon={Calendar} label="Timeline" value={lead.investment_timeline} />
                <InfoRow icon={TrendingUp} label="Purpose" value={lead.investment_purpose} />
                <InfoRow icon={MapPin} label="Preferred Location" value={lead.preferred_location} />
                <InfoRow icon={Users} label="Residency Interest" value={lead.residency_interest} />
              </div>
              {services.length > 0 && (
                <div className="mt-4">
                  <p className="text-xs text-gray-500 mb-1.5">Services Needed</p>
                  <div className="flex flex-wrap gap-1.5">
                    {services.map((s) => (
                      <span key={s} className="text-xs bg-gold/10 text-gold rounded-full px-2.5 py-1">{s}</span>
                    ))}
                  </div>
                </div>
              )}
              {lead.additional_comments && (
                <div className="mt-4">
                  <p className="text-xs text-gray-500 mb-1">Additional Comments</p>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">{lead.additional_comments}</p>
                </div>
              )}
            </Card>
          )}

          <Card title="AI Summary">
            {lead.ai_summary
              ? <p className="text-sm text-gray-700 whitespace-pre-line leading-relaxed">{lead.ai_summary}</p>
              : <p className="text-sm text-gray-400 italic">No summary yet.</p>}
          </Card>

          <Card title="Conversation Transcript">
            {messages.length === 0 ? (
              <p className="text-sm text-gray-400 italic">No conversation recorded.</p>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {messages.map((m, i) => (
                  <div key={i}
                    className={`text-xs p-2.5 rounded-lg max-w-[85%] ${m.role === "user" ? "bg-gold/10 ml-auto" : "bg-gray-50"}`}>
                    <span className="font-semibold text-gray-500">
                      {m.role === "user" ? "Visitor" : "Omar"}:
                    </span>{" "}
                    {m.content}
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        <div className="space-y-5">
          <Card title="CRM Details">
            <div className="space-y-3">
              <div>
                <label htmlFor="detail-status" className="text-xs text-gray-500">Status</label>
                <select id="detail-status" value={lead.status ?? ""} className={selectClass}
                  onChange={(e) => patch("status", e.target.value)}>
                  <option value="">Not set</option>
                  {options.status.map((o) => <option key={o.slug} value={o.slug}>{o.label}</option>)}
                </select>
              </div>
              <div>
                <label htmlFor="detail-qual" className="text-xs text-gray-500">Qualification</label>
                <select id="detail-qual" value={lead.qualification ?? ""} className={selectClass}
                  onChange={(e) => patch("qualification", e.target.value)}>
                  <option value="">Not set</option>
                  {options.qualification.map((o) => <option key={o.slug} value={o.slug}>{o.label}</option>)}
                </select>
              </div>
              <div>
                <label htmlFor="detail-segment" className="text-xs text-gray-500">Segment</label>
                <select id="detail-segment" value={lead.segment ?? ""} className={selectClass}
                  onChange={(e) => patch("segment", e.target.value)}>
                  <option value="">Not set</option>
                  {options.segment.map((o) => <option key={o.slug} value={o.slug}>{o.label}</option>)}
                </select>
              </div>
              <div>
                <p className="text-xs text-gray-500">Source</p>
                <p className="text-sm text-navy font-medium capitalize">{lead.source ?? "main"}</p>
              </div>
              {lead.lead_score !== null && (
                <div>
                  <p className="text-xs text-gray-500">Lead Score</p>
                  <p className="text-sm text-navy font-medium">{lead.lead_score}</p>
                </div>
              )}
              <div>
                <p className="text-xs text-gray-500">Last Updated</p>
                <p className="text-sm text-gray-700">
                  {lead.updated_at ? new Date(lead.updated_at).toLocaleString() : "Never"}
                </p>
              </div>
            </div>
          </Card>

          <Card title="Notes">
            <LeadNotesTimeline leadId={lead.id} />
          </Card>

          <div className="bg-white rounded-xl shadow-sm p-5">
            <h2 className="text-sm font-semibold text-red-600 mb-3">Danger Zone</h2>
            <button type="button" onClick={handleDelete}
              className="w-full inline-flex items-center justify-center gap-1.5 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded-lg px-3 py-2 transition-colors">
              <Trash2 className="w-4 h-4" /> Delete Lead
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 6: Verify the build**

Run: `npm run build`
Expected: succeeds, `/admin/leads/[id]` appears in the route list.

- [ ] **Step 7: Commit**

```bash
git add app/api/admin/leads/\[id\]/route.ts app/admin/leads/\[id\]/page.tsx tests/api/admin-lead-detail.test.ts
git commit -m "feat(admin): lead detail page and single-lead read endpoint"
```

---

## Task 7: Leads list wire-up and full verification

**Files:**
- Modify: `app/admin/leads/page.tsx`
- Test: full suite

**Interfaces:**
- Consumes: `/admin/leads/[id]` (Task 6), `source = 'intake'` (Task 3).
- Produces: nothing new.

- [ ] **Step 1: Make the row navigate to the detail page**

In `app/admin/leads/page.tsx`:

1. Add `import { useRouter } from "next/navigation";` and `const router = useRouter();` inside `LeadsPage`.
2. Replace the row's `onClick={() => handleExpand(lead)}` with `onClick={() => router.push(`/admin/leads/${lead.id}`)}`.
3. Delete the now-unused inline expanders and their state, because the detail page supersedes them and JA's instruction was to merge rather than duplicate:
   - state: `expandedId`, `conversation`, `expandedLead`, `regenerating`
   - functions: `handleExpand`, `regenerateSummary`
   - the two conditional `<tr>` blocks (`expandedLead === lead.id` and `expandedId === lead.id`)
   - the chevron toggle button in the actions cell (keep the delete button)
   - the now-unused `LeadNotesTimeline` import
4. `sendDraftEmail` and the `pendingEmail` fetch stay: leave them in place only if still referenced. If removing the expanders orphans them, delete `sendDraftEmail` too and keep the `pendingEmail` field on the `Lead` interface, since the detail endpoint returns it.

Add a comment above the row:

```tsx
                  {/* Row click opens the full lead detail page. The old
                      inline transcript and AI-summary expanders were removed
                      when that page landed: same information, one place. */}
```

- [ ] **Step 2: Add the Source column**

In `<thead>`, after the Status header:

```tsx
                <th className="text-left px-4 py-3 font-medium text-gray-600 hidden sm:table-cell">Source</th>
```

In the row, after the status cell:

```tsx
                    <td className="px-4 py-3 text-gray-600 capitalize hidden sm:table-cell">
                      {lead.source ?? "main"}
                    </td>
```

Add `source: string | null;` to the `Lead` interface. Update the two `colSpan` values if any conditional rows remain (there should be none after Step 1).

- [ ] **Step 3: Add intake to the source filter**

In the source filter `<select>`, after the businesses option:

```tsx
          <option value="intake">Intake form</option>
```

- [ ] **Step 4: Include source in the CSV export**

In `handleExportCSV`, change the header to
`"Name,Email,Phone,Segment,Qualification,Status,Source,Date\n"`
and add `"${l.source ?? "main"}",` before the date field in the row template.

- [ ] **Step 5: Run the full suite**

Run: `npm test -- --run`
Expected: PASS. Baseline before this batch was 324 tests across 50 files; expect roughly 385+ across 56 files. **Zero failures.**

- [ ] **Step 6: Typecheck and build**

Run: `npx tsc --noEmit`
Expected: exactly the 3 pre-existing test-file errors (undici `Response`/`Request` vs Next.js wrappers). **Any new error must be fixed before committing.**

Run: `npm run build`
Expected: clean, route count 85 + 3 new routes (`/intake`, `/api/intake`, `/admin/leads/[id]`) = 88.

- [ ] **Step 7: Grep for banned characters across everything this batch touched**

Run:
```bash
grep -rn $'[–—]' lib/intake components/intake app/intake app/admin/leads app/api/intake
```
Expected: no output.

- [ ] **Step 8: Commit**

```bash
git add app/admin/leads/page.tsx
git commit -m "feat(admin): leads row opens detail page, add source column and intake filter"
```

- [ ] **Step 9: Apply the migration to production**

The new columns must exist in Turso before the deploy serves `/api/intake`.

Run: `npm run migrate`
Expected: the seven `ALTER TABLE leads ADD COLUMN` statements report as applied (or skipped if re-run). Every other statement reports as skipped.

Then confirm:
```bash
npx tsx scripts/verify-schema.ts
```
Expected: `leads` lists all seven new columns.

> ⚠️ `.env` points at production Turso. This is intended here: the migration is additive and nullable, so it cannot affect existing rows, and it must land before the code that writes to those columns.

---

## Deployment gate (JA action, not an implementer step)

This batch stacks on top of five already-built but undeployed features. The deploy sequence stays as recorded in HANDOVER item P: one `vercel deploy --yes` preview, click-test, then `vercel deploy --prod --yes`.

Click-test list specific to this batch:
1. `/intake` on desktop and phone. Submit. Confirm the lead appears in `/admin/leads` with source `intake` and qualification `connect`.
2. Home page, wait 15 seconds, popup appears. Close it, reload, confirm it does not reappear this session.
3. Open Omar within 15 seconds. Confirm the popup never fires.
4. `/businesses`, same 15-second check.
5. Any other page (a listing, `/privacy`, `/admin`): confirm no popup, ever.
6. Submit from the popup, then open a new tab on the home page: confirm no re-prompt.
7. Click a lead row in admin: full detail page opens; status, qualification and segment dropdowns save; delete works.
8. Phone check: tapping any intake field must not zoom the page.

---

## Self-review notes

**Spec coverage against the HANDOVER brief:** schema columns (Task 1), `/intake` page (Task 4), 15-second popup with the exact two-page scope and session-only dismissal (Task 5), never-re-prompt after submit (Task 5), admin detail page modelled on the ex-developer's layout with merged fields (Task 6), and the open item on `source` resolved as `source = 'intake'` plus GA events `intake_popup_shown` / `intake_popup_dismissed` / `intake_submit` (Tasks 3-5).

**Deviations from the brief, deliberate and flagged:** seven columns rather than five (reason in Design decisions §1); removal of the two inline expanders on the leads list (reason: JA's "merge, don't duplicate" instruction, and the detail page shows strictly more).

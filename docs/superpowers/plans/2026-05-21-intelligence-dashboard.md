# Intelligence Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a JA-internal `/admin/intelligence` dashboard that surfaces lead-scoring calibration (precision, tier re-grading, category calibration), system state (Omar version, data coverage, hypotheses/learnings), and a template one-pager export — automating the data-pull half of the monthly intelligence process.

**Architecture:** A pure logic layer (`lib/intelligence/*`, `lib/ai/version.ts`) computes everything from the `leads` table; functions take a libSQL `Client` for testability. Two auth'd API routes (stats GET + notes CRUD) expose it. The page + one-pager are client components (matching the existing admin pattern: localStorage `admin_token` + `credentials: include`) that fetch those APIs and render with the existing navy/gold admin styling. One new `intelligence_notes` table.

**Tech Stack:** Next.js 14 (App Router), TypeScript, @libsql/client (Turso), Tailwind, Recharts (already present), Vitest, lucide-react.

**Spec:** `docs/superpowers/specs/2026-05-21-intelligence-dashboard-design.md`

**Repo root (run all commands here):** `C:\Users\ADMIN\Documents\JA\JALAI-Workspaces\delivery\clients\gateway-to-oman\delivery\stages\04-build\output\gateway-to-oman`

---

## File Structure

**Create**
- `lib/intelligence/effective-tier.ts` — pure outcome→tier mapping + movement classification
- `lib/intelligence/queries.ts` — SQL aggregation (precision, re-grading, calibration, coverage, conversion, top source)
- `lib/intelligence/notes.ts` — CRUD over `intelligence_notes`
- `lib/intelligence/one-pager.ts` — pure: build the monthly one-pager Markdown from computed stats
- `lib/ai/version.ts` — `OMAR_VERSION` + `OMAR_CHANGELOG`
- `app/api/admin/intelligence/route.ts` — GET stats (requireAuth)
- `app/api/admin/intelligence/notes/route.ts` — GET/POST/PATCH/DELETE notes (requireAuth)
- `app/admin/intelligence/page.tsx` — dashboard (client component)
- `app/admin/intelligence/one-pager/page.tsx` — one-pager (client component, print + copy-markdown)
- `components/admin/intelligence/PrecisionCards.tsx`
- `components/admin/intelligence/ReGradingMatrix.tsx`
- `components/admin/intelligence/CalibrationBars.tsx`
- `components/admin/intelligence/CoverageCard.tsx`
- `components/admin/intelligence/VersionCard.tsx`
- `components/admin/intelligence/NotesPanel.tsx`
- `tests/intelligence/helpers.ts` — in-memory DB + lead seeding for tests
- `tests/intelligence/effective-tier.test.ts`
- `tests/intelligence/queries.test.ts`
- `tests/intelligence/notes.test.ts`
- `tests/intelligence/one-pager.test.ts`
- `tests/db/intelligence-notes.test.ts`

**Modify**
- `lib/db/schema.sql` — add `intelligence_notes` table
- `app/admin/layout.tsx` — add "Intelligence" sidebar nav item (desktop only; mobile bottom nav stays at 5)

---

## Task 1: Schema — `intelligence_notes` table

**Files:**
- Modify: `lib/db/schema.sql` (append a new table block)
- Test: `tests/db/intelligence-notes.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// tests/db/intelligence-notes.test.ts
import { describe, it, expect, beforeAll } from "vitest";
import { createClient, type Client } from "@libsql/client";
import { readFileSync } from "fs";
import { resolve } from "path";

let db: Client;

async function applySchema(client: Client) {
  const schema = readFileSync(resolve(__dirname, "../../lib/db/schema.sql"), "utf-8");
  for (const stmt of schema.split(";").map((s) => s.trim()).filter(Boolean)) {
    try { await client.execute(stmt); }
    catch (err) {
      const m = String(err);
      if (m.includes("duplicate column") || m.includes("already exists")) continue;
      throw err;
    }
  }
}

describe("intelligence_notes schema", () => {
  beforeAll(async () => {
    db = createClient({ url: "file::memory:" });
    await applySchema(db);
  });

  it("has the expected columns", async () => {
    const cols = await db.execute("PRAGMA table_info(intelligence_notes)");
    const names = cols.rows.map((r) => r.name);
    for (const c of ["id", "kind", "title", "body", "status", "created_at", "updated_at"]) {
      expect(names).toContain(c);
    }
  });

  it("rejects an invalid kind and accepts a valid one", async () => {
    await expect(
      db.execute({ sql: "INSERT INTO intelligence_notes (kind, title) VALUES ('bogus','x')", args: [] })
    ).rejects.toThrow();
    await db.execute({ sql: "INSERT INTO intelligence_notes (kind, title) VALUES ('hypothesis','x')", args: [] });
    const rows = await db.execute("SELECT status FROM intelligence_notes");
    expect(rows.rows[0].status).toBe("open"); // default
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/db/intelligence-notes.test.ts`
Expected: FAIL — `PRAGMA table_info(intelligence_notes)` returns no rows / insert does not reject.

- [ ] **Step 3: Add the table to `lib/db/schema.sql`** (append at end of file)

```sql
-- ----------------------------------------------------------------------------
-- 14. Intelligence notes (JA-internal: hypotheses, confirmed learnings,
-- monthly analysis-run log). Powers the /admin/intelligence Group D panel.
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS intelligence_notes (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  kind TEXT NOT NULL CHECK (kind IN ('hypothesis', 'learning', 'analysis_run')),
  title TEXT NOT NULL,
  body TEXT,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'confirmed', 'archived')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_intel_notes_kind ON intelligence_notes(kind, status);
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/db/intelligence-notes.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Apply the migration to the live Turso DB**

Run: `npm run migrate`
Expected: completes without error (the migrate script skips comment-only chunks and `IF NOT EXISTS` is idempotent).

- [ ] **Step 6: Commit**

```bash
git add lib/db/schema.sql tests/db/intelligence-notes.test.ts
git commit -m "feat(intel): add intelligence_notes table"
```

---

## Task 2: Pure effective-tier mapping

**Files:**
- Create: `lib/intelligence/effective-tier.ts`
- Test: `tests/intelligence/effective-tier.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// tests/intelligence/effective-tier.test.ts
import { describe, it, expect } from "vitest";
import { outcomeToEffectiveTier, isResolved, movementOf } from "@/lib/intelligence/effective-tier";

describe("outcomeToEffectiveTier", () => {
  it("maps outcomes per the v1 rule", () => {
    expect(outcomeToEffectiveTier("converted")).toBe("hot");
    expect(outcomeToEffectiveTier("contacted")).toBe("warm");
    expect(outcomeToEffectiveTier("nurture")).toBe("warm");
    expect(outcomeToEffectiveTier("rejected")).toBe("cold");
    expect(outcomeToEffectiveTier("pending")).toBeNull();
    expect(outcomeToEffectiveTier("anything-else")).toBeNull();
  });
});

describe("isResolved", () => {
  it("is true for every non-pending recognized outcome", () => {
    expect(isResolved("converted")).toBe(true);
    expect(isResolved("rejected")).toBe(true);
    expect(isResolved("nurture")).toBe(true);
    expect(isResolved("contacted")).toBe(true);
    expect(isResolved("pending")).toBe(false);
    expect(isResolved("")).toBe(false);
  });
});

describe("movementOf", () => {
  it("classifies promotions, holds and demotions", () => {
    expect(movementOf("cold", "hot")).toBe("promoted");
    expect(movementOf("warm", "hot")).toBe("promoted");
    expect(movementOf("warm", "warm")).toBe("held");
    expect(movementOf("hot", "warm")).toBe("demoted");
    expect(movementOf("hot", "cold")).toBe("demoted");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/intelligence/effective-tier.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

```ts
// lib/intelligence/effective-tier.ts
export type Tier = "hot" | "warm" | "cold";
export type Movement = "promoted" | "held" | "demoted";

const RANK: Record<Tier, number> = { cold: 1, warm: 2, hot: 3 };

/** v1: effective tier inferred from the resolved outcome. pending/unknown → null. */
export function outcomeToEffectiveTier(outcome: string): Tier | null {
  switch (outcome) {
    case "converted": return "hot";
    case "contacted":
    case "nurture": return "warm";
    case "rejected": return "cold";
    default: return null; // pending or unrecognized — no ground truth yet
  }
}

/** A lead is resolved once it has any non-pending recognized outcome. */
export function isResolved(outcome: string): boolean {
  return outcomeToEffectiveTier(outcome) !== null;
}

/** Direction from Omar's predicted tier to the effective tier. */
export function movementOf(predicted: Tier, effective: Tier): Movement {
  if (RANK[effective] > RANK[predicted]) return "promoted";
  if (RANK[effective] < RANK[predicted]) return "demoted";
  return "held";
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/intelligence/effective-tier.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/intelligence/effective-tier.ts tests/intelligence/effective-tier.test.ts
git commit -m "feat(intel): effective-tier mapping + movement classification"
```

---

## Task 3: Test DB helper + tier precision query

**Files:**
- Create: `tests/intelligence/helpers.ts`, `lib/intelligence/queries.ts`
- Test: `tests/intelligence/queries.test.ts`

- [ ] **Step 1: Write the test DB helper**

```ts
// tests/intelligence/helpers.ts
import { createClient, type Client } from "@libsql/client";
import { readFileSync } from "fs";
import { resolve } from "path";

export async function makeTestDb(): Promise<Client> {
  const db = createClient({ url: "file::memory:" });
  const schema = readFileSync(resolve(__dirname, "../../lib/db/schema.sql"), "utf-8");
  for (const stmt of schema.split(";").map((s) => s.trim()).filter(Boolean)) {
    try { await db.execute(stmt); }
    catch (err) {
      const m = String(err);
      if (m.includes("duplicate column") || m.includes("already exists")) continue;
      throw err;
    }
  }
  return db;
}

/** Insert a lead with the fields the intelligence queries read. */
export async function seedLead(
  db: Client,
  opts: { qualification: string; outcome: string; source?: string; createdAt?: string; breakdown?: Record<string, number> },
) {
  await db.execute({
    sql: `INSERT INTO leads (name, email, qualification, outcome, source, created_at, score_breakdown)
          VALUES (?, ?, ?, ?, ?, ?, ?)`,
    args: [
      "Test", "t" + Math.random().toString(36).slice(2) + "@x.com",
      opts.qualification, opts.outcome, opts.source ?? "main",
      opts.createdAt ?? "2026-05-15 10:00:00",
      opts.breakdown ? JSON.stringify(opts.breakdown) : null,
    ],
  });
}
```

> Note: `outcome`, `source`, and `score_breakdown` are Layer-3 columns added to `leads` via `ALTER TABLE` in `schema.sql`; they are nullable, so the insert above is valid. `name`/`email` are NOT NULL and supplied.

- [ ] **Step 2: Write the failing test for precision**

```ts
// tests/intelligence/queries.test.ts
import { describe, it, expect } from "vitest";
import { makeTestDb, seedLead } from "./helpers";
import { getTierPrecision } from "@/lib/intelligence/queries";

describe("getTierPrecision", () => {
  it("computes strict (converted) and engaged (converted+contacted) per tier over resolved leads", async () => {
    const db = await makeTestDb();
    // hot: 2 converted, 1 contacted, 1 rejected, 1 pending(excluded) => resolved=4
    await seedLead(db, { qualification: "hot", outcome: "converted" });
    await seedLead(db, { qualification: "hot", outcome: "converted" });
    await seedLead(db, { qualification: "hot", outcome: "contacted" });
    await seedLead(db, { qualification: "hot", outcome: "rejected" });
    await seedLead(db, { qualification: "hot", outcome: "pending" });

    const rows = await getTierPrecision(db);
    const hot = rows.find((r) => r.tier === "hot")!;
    expect(hot.resolved).toBe(4);
    expect(hot.convertedPct).toBe(50); // 2/4
    expect(hot.engagedPct).toBe(75);   // 3/4

    const cold = rows.find((r) => r.tier === "cold")!;
    expect(cold.resolved).toBe(0);
    expect(cold.convertedPct).toBeNull();
    expect(cold.engagedPct).toBeNull();
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npm test -- tests/intelligence/queries.test.ts`
Expected: FAIL — `getTierPrecision` not found.

- [ ] **Step 4: Implement `getTierPrecision` (start `queries.ts`)**

```ts
// lib/intelligence/queries.ts
import type { Client } from "@libsql/client";
import { type Tier, outcomeToEffectiveTier, isResolved, movementOf } from "./effective-tier";

const TIERS: Tier[] = ["hot", "warm", "cold"];
const ENGAGED = new Set(["converted", "contacted"]);

/** Build the optional month filter ("YYYY-MM") as a SQL fragment + args. */
function monthClause(month?: string): { where: string; args: string[] } {
  if (!month) return { where: "", args: [] };
  return { where: " WHERE created_at LIKE ?", args: [month + "%"] };
}

export interface TierPrecision {
  tier: Tier;
  resolved: number;
  convertedPct: number | null; // strict
  engagedPct: number | null;   // engaged
}

export async function getTierPrecision(db: Client, month?: string): Promise<TierPrecision[]> {
  const { where, args } = monthClause(month);
  const res = await db.execute({ sql: `SELECT qualification, outcome FROM leads${where}`, args });
  return TIERS.map((tier) => {
    const rows = res.rows.filter((r) => r.qualification === tier && isResolved(String(r.outcome)));
    const resolved = rows.length;
    if (resolved === 0) return { tier, resolved, convertedPct: null, engagedPct: null };
    const converted = rows.filter((r) => r.outcome === "converted").length;
    const engaged = rows.filter((r) => ENGAGED.has(String(r.outcome))).length;
    return {
      tier,
      resolved,
      convertedPct: Math.round((converted / resolved) * 100),
      engagedPct: Math.round((engaged / resolved) * 100),
    };
  });
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npm test -- tests/intelligence/queries.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add lib/intelligence/queries.ts tests/intelligence/helpers.ts tests/intelligence/queries.test.ts
git commit -m "feat(intel): tier precision query + test harness"
```

---

## Task 4: Re-grading matrix query

**Files:**
- Modify: `lib/intelligence/queries.ts`
- Test: `tests/intelligence/queries.test.ts` (append)

- [ ] **Step 1: Append the failing test**

```ts
// tests/intelligence/queries.test.ts  (append)
import { getReGradingMatrix } from "@/lib/intelligence/queries";

describe("getReGradingMatrix", () => {
  it("counts predicted x effective and summarises movement", async () => {
    const db = await makeTestDb();
    await seedLead(db, { qualification: "warm", outcome: "converted" }); // warm->hot promoted
    await seedLead(db, { qualification: "warm", outcome: "rejected" });  // warm->cold demoted
    await seedLead(db, { qualification: "warm", outcome: "contacted" }); // warm->warm held
    await seedLead(db, { qualification: "hot", outcome: "rejected" });   // hot->cold demoted
    await seedLead(db, { qualification: "cold", outcome: "pending" });   // excluded

    const { matrix, summary } = await getReGradingMatrix(db);
    expect(matrix.warm.hot).toBe(1);
    expect(matrix.warm.cold).toBe(1);
    expect(matrix.warm.warm).toBe(1);
    expect(matrix.hot.cold).toBe(1);

    expect(summary.warm).toEqual({ promoted: 1, held: 1, demoted: 1, total: 3 });
    expect(summary.hot).toEqual({ promoted: 0, held: 0, demoted: 1, total: 1 });
    expect(summary.cold).toEqual({ promoted: 0, held: 0, demoted: 0, total: 0 });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/intelligence/queries.test.ts`
Expected: FAIL — `getReGradingMatrix` not found.

- [ ] **Step 3: Implement (append to `queries.ts`)**

```ts
// lib/intelligence/queries.ts  (append)
export type TierCounts = Record<Tier, number>;
export interface ReGrading {
  matrix: Record<Tier, TierCounts>; // matrix[predicted][effective]
  summary: Record<Tier, { promoted: number; held: number; demoted: number; total: number }>;
}

function emptyCounts(): TierCounts { return { hot: 0, warm: 0, cold: 0 }; }

export async function getReGradingMatrix(db: Client, month?: string): Promise<ReGrading> {
  const { where, args } = monthClause(month);
  const res = await db.execute({ sql: `SELECT qualification, outcome FROM leads${where}`, args });
  const matrix: Record<Tier, TierCounts> = { hot: emptyCounts(), warm: emptyCounts(), cold: emptyCounts() };
  const summary: ReGrading["summary"] = {
    hot: { promoted: 0, held: 0, demoted: 0, total: 0 },
    warm: { promoted: 0, held: 0, demoted: 0, total: 0 },
    cold: { promoted: 0, held: 0, demoted: 0, total: 0 },
  };
  for (const r of res.rows) {
    const predicted = String(r.qualification) as Tier;
    if (!TIERS.includes(predicted)) continue;
    const effective = outcomeToEffectiveTier(String(r.outcome));
    if (!effective) continue; // pending excluded
    matrix[predicted][effective] += 1;
    summary[predicted][movementOf(predicted, effective)] += 1;
    summary[predicted].total += 1;
  }
  return { matrix, summary };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/intelligence/queries.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/intelligence/queries.ts tests/intelligence/queries.test.ts
git commit -m "feat(intel): tier re-grading matrix + movement summary"
```

---

## Task 5: Score-category calibration query

**Files:**
- Modify: `lib/intelligence/queries.ts`
- Test: `tests/intelligence/queries.test.ts` (append)

- [ ] **Step 1: Append the failing test**

```ts
// tests/intelligence/queries.test.ts  (append)
import { getCategoryCalibration } from "@/lib/intelligence/queries";

describe("getCategoryCalibration", () => {
  it("averages category points for successes vs non-successes", async () => {
    const db = await makeTestDb();
    // success = converted/contacted ; non-success = rejected/nurture ; pending excluded
    await seedLead(db, { qualification: "hot", outcome: "converted", breakdown: { budget: 30, timeline: 25, decisionAuthority: 15, objectiveClarity: 15, mindsetIndicator: 15 } });
    await seedLead(db, { qualification: "warm", outcome: "contacted", breakdown: { budget: 20, timeline: 15, decisionAuthority: 8, objectiveClarity: 8, mindsetIndicator: 0 } });
    await seedLead(db, { qualification: "cold", outcome: "rejected", breakdown: { budget: 0, timeline: 0, decisionAuthority: 8, objectiveClarity: 0, mindsetIndicator: 0 } });
    await seedLead(db, { qualification: "warm", outcome: "pending", breakdown: { budget: 99 } }); // excluded

    const rows = await getCategoryCalibration(db);
    const budget = rows.find((r) => r.category === "budget")!;
    expect(budget.successAvg).toBe(25);     // (30+20)/2
    expect(budget.nonSuccessAvg).toBe(0);   // (0)/1
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/intelligence/queries.test.ts`
Expected: FAIL — `getCategoryCalibration` not found.

- [ ] **Step 3: Implement (append to `queries.ts`)**

```ts
// lib/intelligence/queries.ts  (append)
const CATEGORIES = ["budget", "timeline", "decisionAuthority", "objectiveClarity", "mindsetIndicator"] as const;
const SUCCESS = new Set(["converted", "contacted"]);
const NON_SUCCESS = new Set(["rejected", "nurture"]);

export interface CategoryCalibration {
  category: (typeof CATEGORIES)[number];
  successAvg: number | null;
  nonSuccessAvg: number | null;
}

export async function getCategoryCalibration(db: Client, month?: string): Promise<CategoryCalibration[]> {
  const { where, args } = monthClause(month);
  const res = await db.execute({ sql: `SELECT outcome, score_breakdown FROM leads${where}`, args });
  const succ: Record<string, number[]> = {}, non: Record<string, number[]> = {};
  for (const c of CATEGORIES) { succ[c] = []; non[c] = []; }
  for (const r of res.rows) {
    const outcome = String(r.outcome);
    const bucket = SUCCESS.has(outcome) ? succ : NON_SUCCESS.has(outcome) ? non : null;
    if (!bucket || !r.score_breakdown) continue;
    let parsed: Record<string, unknown>;
    try { parsed = JSON.parse(String(r.score_breakdown)); } catch { continue; }
    for (const c of CATEGORIES) {
      const v = Number(parsed[c]);
      if (Number.isFinite(v)) bucket[c].push(v);
    }
  }
  const avg = (xs: number[]) => (xs.length ? Math.round((xs.reduce((a, b) => a + b, 0) / xs.length) * 10) / 10 : null);
  return CATEGORIES.map((c) => ({ category: c, successAvg: avg(succ[c]), nonSuccessAvg: avg(non[c]) }));
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/intelligence/queries.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/intelligence/queries.ts tests/intelligence/queries.test.ts
git commit -m "feat(intel): score-category calibration query"
```

---

## Task 6: Coverage, conversion, and top-source queries

**Files:**
- Modify: `lib/intelligence/queries.ts`
- Test: `tests/intelligence/queries.test.ts` (append)

- [ ] **Step 1: Append the failing test**

```ts
// tests/intelligence/queries.test.ts  (append)
import { getDataCoverage, getConversionStats, getTopSource } from "@/lib/intelligence/queries";

describe("coverage / conversion / top source", () => {
  it("summarises coverage, conversion rate and the leading source", async () => {
    const db = await makeTestDb();
    await seedLead(db, { qualification: "hot", outcome: "converted", source: "referral", createdAt: "2026-05-02 09:00:00" });
    await seedLead(db, { qualification: "warm", outcome: "rejected", source: "tiktok", createdAt: "2026-05-10 09:00:00" });
    await seedLead(db, { qualification: "warm", outcome: "pending", source: "tiktok", createdAt: "2026-05-20 09:00:00" });

    const cov = await getDataCoverage(db);
    expect(cov.total).toBe(3);
    expect(cov.resolved).toBe(2);
    expect(cov.pending).toBe(1);
    expect(cov.earliest).toBe("2026-05-02 09:00:00");
    expect(cov.latest).toBe("2026-05-20 09:00:00");

    const conv = await getConversionStats(db);
    expect(conv.leads).toBe(3);
    expect(conv.converted).toBe(1);
    expect(conv.ratePct).toBe(33); // 1/3

    const top = await getTopSource(db);
    expect(top).toEqual({ source: "tiktok", count: 2 });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/intelligence/queries.test.ts`
Expected: FAIL — functions not found.

- [ ] **Step 3: Implement (append to `queries.ts`)**

```ts
// lib/intelligence/queries.ts  (append)
export interface DataCoverage { total: number; resolved: number; pending: number; earliest: string | null; latest: string | null; }

export async function getDataCoverage(db: Client, month?: string): Promise<DataCoverage> {
  const { where, args } = monthClause(month);
  const res = await db.execute({ sql: `SELECT outcome, created_at FROM leads${where}`, args });
  const rows = res.rows;
  const dates = rows.map((r) => String(r.created_at)).filter(Boolean).sort();
  return {
    total: rows.length,
    resolved: rows.filter((r) => isResolved(String(r.outcome))).length,
    pending: rows.filter((r) => !isResolved(String(r.outcome))).length,
    earliest: dates[0] ?? null,
    latest: dates[dates.length - 1] ?? null,
  };
}

export interface ConversionStats { leads: number; converted: number; ratePct: number | null; }

export async function getConversionStats(db: Client, month?: string): Promise<ConversionStats> {
  const { where, args } = monthClause(month);
  const res = await db.execute({ sql: `SELECT outcome FROM leads${where}`, args });
  const leads = res.rows.length;
  const converted = res.rows.filter((r) => r.outcome === "converted").length;
  return { leads, converted, ratePct: leads ? Math.round((converted / leads) * 100) : null };
}

export interface TopSource { source: string; count: number; }

export async function getTopSource(db: Client, month?: string): Promise<TopSource | null> {
  const { where, args } = monthClause(month);
  const res = await db.execute({
    sql: `SELECT COALESCE(source,'main') AS source, COUNT(*) AS c FROM leads${where} GROUP BY COALESCE(source,'main') ORDER BY c DESC LIMIT 1`,
    args,
  });
  if (res.rows.length === 0) return null;
  return { source: String(res.rows[0].source), count: Number(res.rows[0].c) };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/intelligence/queries.test.ts`
Expected: PASS (all query tests green).

- [ ] **Step 5: Commit**

```bash
git add lib/intelligence/queries.ts tests/intelligence/queries.test.ts
git commit -m "feat(intel): coverage, conversion and top-source queries"
```

---

## Task 7: Omar version registry

**Files:**
- Create: `lib/ai/version.ts`
- Test: `tests/intelligence/one-pager.test.ts` will import it; add a tiny check here.

- [ ] **Step 1: Implement (no test-first needed — it's a constant; verified via typecheck + later use)**

```ts
// lib/ai/version.ts
export interface ChangelogEntry { version: string; date: string; summary: string; }

export const OMAR_VERSION = "1.0";

// Newest first. Bump OMAR_VERSION and prepend an entry whenever the prompt
// (lib/ai/prompts.ts) or scoring model (lib/ai/scoring.ts) changes.
export const OMAR_CHANGELOG: ChangelogEntry[] = [
  { version: "1.0", date: "2026-05", summary: "Initial 100-point scoring model + Omar prompt (main + businesses variants)." },
];
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no new errors from this file.

- [ ] **Step 3: Commit**

```bash
git add lib/ai/version.ts
git commit -m "feat(intel): Omar version registry + changelog"
```

---

## Task 8: Intelligence notes CRUD

**Files:**
- Create: `lib/intelligence/notes.ts`
- Test: `tests/intelligence/notes.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// tests/intelligence/notes.test.ts
import { describe, it, expect } from "vitest";
import { makeTestDb } from "./helpers";
import { createNote, listNotes, updateNote, deleteNote } from "@/lib/intelligence/notes";

describe("intelligence notes CRUD", () => {
  it("creates, lists, updates and deletes", async () => {
    const db = await makeTestDb();
    const id = await createNote(db, { kind: "hypothesis", title: "Referrals score higher", body: "watch month 1" });
    let all = await listNotes(db);
    expect(all).toHaveLength(1);
    expect(all[0].title).toBe("Referrals score higher");
    expect(all[0].status).toBe("open");

    await updateNote(db, id, { status: "confirmed", title: "Referrals DO score higher" });
    all = await listNotes(db);
    expect(all[0].status).toBe("confirmed");
    expect(all[0].title).toBe("Referrals DO score higher");

    await deleteNote(db, id);
    expect(await listNotes(db)).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/intelligence/notes.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

```ts
// lib/intelligence/notes.ts
import type { Client } from "@libsql/client";

export type NoteKind = "hypothesis" | "learning" | "analysis_run";
export type NoteStatus = "open" | "confirmed" | "archived";

export interface IntelNote {
  id: string; kind: NoteKind; title: string; body: string | null;
  status: NoteStatus; created_at: string; updated_at: string;
}

export async function listNotes(db: Client): Promise<IntelNote[]> {
  const res = await db.execute("SELECT id, kind, title, body, status, created_at, updated_at FROM intelligence_notes ORDER BY updated_at DESC");
  return res.rows.map((r) => ({
    id: String(r.id), kind: r.kind as NoteKind, title: String(r.title),
    body: (r.body as string | null) ?? null, status: r.status as NoteStatus,
    created_at: String(r.created_at), updated_at: String(r.updated_at),
  }));
}

export async function createNote(db: Client, input: { kind: NoteKind; title: string; body?: string | null }): Promise<string> {
  const res = await db.execute({
    sql: "INSERT INTO intelligence_notes (kind, title, body) VALUES (?, ?, ?) RETURNING id",
    args: [input.kind, input.title.trim(), input.body ?? null],
  });
  return String(res.rows[0].id);
}

export async function updateNote(db: Client, id: string, patch: { title?: string; body?: string | null; status?: NoteStatus }): Promise<void> {
  const sets: string[] = []; const args: (string | null)[] = [];
  if (patch.title !== undefined) { sets.push("title = ?"); args.push(patch.title.trim()); }
  if (patch.body !== undefined) { sets.push("body = ?"); args.push(patch.body); }
  if (patch.status !== undefined) { sets.push("status = ?"); args.push(patch.status); }
  if (sets.length === 0) return;
  sets.push("updated_at = datetime('now')");
  args.push(id);
  await db.execute({ sql: `UPDATE intelligence_notes SET ${sets.join(", ")} WHERE id = ?`, args });
}

export async function deleteNote(db: Client, id: string): Promise<void> {
  await db.execute({ sql: "DELETE FROM intelligence_notes WHERE id = ?", args: [id] });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/intelligence/notes.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/intelligence/notes.ts tests/intelligence/notes.test.ts
git commit -m "feat(intel): intelligence_notes CRUD"
```

---

## Task 9: One-pager Markdown builder (pure)

**Files:**
- Create: `lib/intelligence/one-pager.ts`
- Test: `tests/intelligence/one-pager.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// tests/intelligence/one-pager.test.ts
import { describe, it, expect } from "vitest";
import { renderOnePagerMarkdown } from "@/lib/intelligence/one-pager";

const base = {
  period: "May 2026",
  coverage: { total: 12, resolved: 8, pending: 4, earliest: "2026-05-01 09:00:00", latest: "2026-05-28 09:00:00" },
  precision: [
    { tier: "hot" as const, resolved: 4, convertedPct: 50, engagedPct: 75 },
    { tier: "warm" as const, resolved: 3, convertedPct: 33, engagedPct: 66 },
    { tier: "cold" as const, resolved: 1, convertedPct: 0, engagedPct: 0 },
  ],
  topSource: { source: "referral", count: 5 },
  conversion: { current: { leads: 12, converted: 4, ratePct: 33 }, previous: { leads: 10, converted: 2, ratePct: 20 } },
  changelog: [{ version: "1.0", date: "2026-05", summary: "Initial model." }],
  learnings: [{ title: "Referrals convert best", body: "5/5 referrals engaged." }],
  prose: { happened: "Strong month.", omar: "Hot tier holding.", next: "Watch cold tier." },
};

describe("renderOnePagerMarkdown", () => {
  it("includes the exact numbers and the conversion delta", () => {
    const md = renderOnePagerMarkdown(base);
    expect(md).toContain("# Gateway to Oman — Intelligence Summary (May 2026)");
    expect(md).toContain("12 leads");
    expect(md).toContain("referral");
    expect(md).toContain("Hot");
    expect(md).toContain("50%"); // hot converted
    expect(md).toContain("+13"); // 33 - 20 delta
    expect(md).toContain("Referrals convert best");
  });

  it("shows a baseline note when there is no previous period", () => {
    const md = renderOnePagerMarkdown({ ...base, conversion: { current: base.conversion.current, previous: null } });
    expect(md).toContain("baseline month");
    expect(md).not.toContain("+13");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/intelligence/one-pager.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

```ts
// lib/intelligence/one-pager.ts
import type { TierPrecision, ConversionStats, DataCoverage, TopSource } from "./queries";
import type { ChangelogEntry } from "@/lib/ai/version";

export interface OnePagerInput {
  period: string;
  coverage: DataCoverage;
  precision: TierPrecision[];
  topSource: TopSource | null;
  conversion: { current: ConversionStats; previous: ConversionStats | null };
  changelog: ChangelogEntry[];
  learnings: { title: string; body: string | null }[];
  prose: { happened?: string; omar?: string; next?: string };
}

const cap = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);
const pct = (n: number | null) => (n === null ? "—" : `${n}%`);

export function renderOnePagerMarkdown(input: OnePagerInput): string {
  const { period, coverage, precision, topSource, conversion, changelog, learnings, prose } = input;
  const lines: string[] = [];
  lines.push(`# Gateway to Oman — Intelligence Summary (${period})`, "");

  lines.push("## What happened", "");
  lines.push(`- ${coverage.total} leads this period (${coverage.resolved} resolved, ${coverage.pending} pending).`);
  lines.push(`- Conversion rate: ${pct(conversion.current.ratePct)} (${conversion.current.converted}/${conversion.current.leads}).`);
  if (topSource) lines.push(`- Top source: ${topSource.source} (${topSource.count} leads).`);
  if (prose.happened) lines.push("", prose.happened);
  lines.push("");

  lines.push("## How Omar performed", "");
  for (const p of precision) {
    lines.push(`- ${cap(p.tier)}: ${pct(p.convertedPct)} converted · ${pct(p.engagedPct)} engaged (${p.resolved} resolved).`);
  }
  if (prose.omar) lines.push("", prose.omar);
  lines.push("");

  lines.push("## Conversion change", "");
  if (conversion.previous && conversion.previous.ratePct !== null && conversion.current.ratePct !== null) {
    const delta = conversion.current.ratePct - conversion.previous.ratePct;
    const sign = delta >= 0 ? "+" : "";
    lines.push(`- This period ${pct(conversion.current.ratePct)} vs last period ${pct(conversion.previous.ratePct)} (${sign}${delta} pts).`);
  } else {
    lines.push("- First period with data — treat as the baseline month; deltas start next period.");
  }
  lines.push("");

  lines.push("## What changed in the system", "");
  if (changelog.length) for (const c of changelog) lines.push(`- v${c.version} (${c.date}): ${c.summary}`);
  else lines.push("- No version changes this period.");
  lines.push("");

  lines.push("## What we're learning", "");
  if (learnings.length) for (const l of learnings) lines.push(`- ${l.title}${l.body ? ` — ${l.body}` : ""}`);
  else lines.push("- (none recorded yet)");
  lines.push("");

  lines.push("## What to expect next", "");
  lines.push(prose.next || "- (add your outlook)");
  lines.push("");

  return lines.join("\n");
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/intelligence/one-pager.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/intelligence/one-pager.ts tests/intelligence/one-pager.test.ts
git commit -m "feat(intel): one-pager markdown builder"
```

---

## Task 10: Stats API route

**Files:**
- Create: `app/api/admin/intelligence/route.ts`

- [ ] **Step 1: Implement**

```ts
// app/api/admin/intelligence/route.ts
import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/token";
import { getDb } from "@/lib/db/client";
import {
  getTierPrecision, getReGradingMatrix, getCategoryCalibration,
  getDataCoverage, getConversionStats, getTopSource,
} from "@/lib/intelligence/queries";
import { OMAR_VERSION, OMAR_CHANGELOG } from "@/lib/ai/version";

/** Previous calendar month for a "YYYY-MM" string, else null. */
function prevMonth(month: string): string {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 2, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

export async function GET(request: NextRequest) {
  const authError = await requireAuth(request);
  if (authError) return authError;
  const db = getDb();
  const month = request.nextUrl.searchParams.get("month") || undefined;

  const [precision, regrading, calibration, coverage, conversionCurrent, topSource] = await Promise.all([
    getTierPrecision(db, month), getReGradingMatrix(db, month), getCategoryCalibration(db, month),
    getDataCoverage(db, month), getConversionStats(db, month), getTopSource(db, month),
  ]);
  const conversionPrevious = month ? await getConversionStats(db, prevMonth(month)) : null;

  return NextResponse.json({
    month: month ?? null,
    precision, regrading, calibration, coverage, topSource,
    conversion: { current: conversionCurrent, previous: conversionPrevious },
    version: { current: OMAR_VERSION, changelog: OMAR_CHANGELOG },
  });
}
```

- [ ] **Step 2: Verify build + manual auth check**

Run: `npm run build`
Expected: exit 0; route `/api/admin/intelligence` listed as `ƒ` (dynamic).
Manual (after `npm run dev`): `curl http://localhost:3000/api/admin/intelligence` → 401 (no auth); with `-H "Authorization: Bearer <ADMIN_TOKEN>"` → 200 JSON.

- [ ] **Step 3: Commit**

```bash
git add app/api/admin/intelligence/route.ts
git commit -m "feat(intel): stats API route"
```

---

## Task 11: Notes API route

**Files:**
- Create: `app/api/admin/intelligence/notes/route.ts`

- [ ] **Step 1: Implement**

```ts
// app/api/admin/intelligence/notes/route.ts
import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/token";
import { getDb } from "@/lib/db/client";
import { listNotes, createNote, updateNote, deleteNote, type NoteKind, type NoteStatus } from "@/lib/intelligence/notes";

const KINDS = ["hypothesis", "learning", "analysis_run"];
const STATUSES = ["open", "confirmed", "archived"];

export async function GET(request: NextRequest) {
  const authError = await requireAuth(request);
  if (authError) return authError;
  return NextResponse.json({ notes: await listNotes(getDb()) });
}

export async function POST(request: NextRequest) {
  const authError = await requireAuth(request);
  if (authError) return authError;
  const body = await request.json().catch(() => ({}));
  if (!KINDS.includes(body.kind) || typeof body.title !== "string" || !body.title.trim()) {
    return NextResponse.json({ error: "kind and title required" }, { status: 400 });
  }
  const id = await createNote(getDb(), { kind: body.kind as NoteKind, title: body.title, body: body.body ?? null });
  return NextResponse.json({ id });
}

export async function PATCH(request: NextRequest) {
  const authError = await requireAuth(request);
  if (authError) return authError;
  const body = await request.json().catch(() => ({}));
  if (typeof body.id !== "string") return NextResponse.json({ error: "id required" }, { status: 400 });
  if (body.status && !STATUSES.includes(body.status)) return NextResponse.json({ error: "bad status" }, { status: 400 });
  await updateNote(getDb(), body.id, { title: body.title, body: body.body, status: body.status as NoteStatus });
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: NextRequest) {
  const authError = await requireAuth(request);
  if (authError) return authError;
  const id = request.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  await deleteNote(getDb(), id);
  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: exit 0; `/api/admin/intelligence/notes` listed as `ƒ`.

- [ ] **Step 3: Commit**

```bash
git add app/api/admin/intelligence/notes/route.ts
git commit -m "feat(intel): notes API route"
```

---

## Task 12: Dashboard components

**Files:**
- Create: `components/admin/intelligence/PrecisionCards.tsx`, `ReGradingMatrix.tsx`, `CalibrationBars.tsx`, `CoverageCard.tsx`, `VersionCard.tsx`, `NotesPanel.tsx`

These are presentational (props in, JSX out) except `NotesPanel` which is interactive. Types mirror the API. Use existing admin card styling (`rounded-xl bg-white ring-1 ring-gray-200 shadow-sm`, navy/gold).

- [ ] **Step 1: PrecisionCards**

```tsx
// components/admin/intelligence/PrecisionCards.tsx
type P = { tier: string; resolved: number; convertedPct: number | null; engagedPct: number | null };
const pct = (n: number | null) => (n === null ? "—" : `${n}%`);
const LABEL: Record<string, string> = { hot: "🔥 Hot", warm: "Warm", cold: "Cold" };

export function PrecisionCards({ precision }: { precision: P[] }) {
  const hasData = precision.some((p) => p.resolved > 0);
  return (
    <section>
      <h2 className="text-xs uppercase tracking-wide font-bold text-gray-500 mb-2">Omar precision · per tier (resolved leads)</h2>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {precision.map((p) => (
          <div key={p.tier} className="rounded-xl bg-white ring-1 ring-gray-200 shadow-sm p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{LABEL[p.tier] ?? p.tier}</p>
            <p className="mt-1 text-2xl font-heading font-semibold text-navy">
              {pct(p.convertedPct)} <span className="text-gold">|</span> {pct(p.engagedPct)}
            </p>
            <p className="text-xs text-gray-500 mt-0.5">converted | engaged · {p.resolved} resolved</p>
          </div>
        ))}
      </div>
      {!hasData && <p className="text-sm text-gray-400 italic mt-2">Not enough data yet — needs leads with resolved outcomes.</p>}
    </section>
  );
}
```

- [ ] **Step 2: ReGradingMatrix**

```tsx
// components/admin/intelligence/ReGradingMatrix.tsx
type Tier = "hot" | "warm" | "cold";
type Counts = Record<Tier, number>;
type Props = { matrix: Record<Tier, Counts> };
const TIERS: Tier[] = ["hot", "warm", "cold"];
const RANK: Record<Tier, number> = { cold: 1, warm: 2, hot: 3 };

function cellClass(pred: Tier, eff: Tier) {
  if (RANK[eff] > RANK[pred]) return "bg-emerald-50 text-emerald-700"; // promoted
  if (RANK[eff] < RANK[pred]) return "bg-red-50 text-red-700";          // demoted
  return "bg-amber-50 text-amber-700";                                   // held
}

export function ReGradingMatrix({ matrix }: Props) {
  const total = TIERS.reduce((s, p) => s + TIERS.reduce((t, e) => t + matrix[p][e], 0), 0);
  return (
    <div className="rounded-xl bg-white ring-1 ring-gray-200 shadow-sm p-4">
      <h2 className="text-xs uppercase tracking-wide font-bold text-gray-500 mb-3">Tier re-grading · predicted → effective</h2>
      <table className="w-full border-separate" style={{ borderSpacing: 4 }}>
        <thead>
          <tr><th></th>{TIERS.map((e) => <th key={e} className="text-[10px] uppercase text-gray-400 font-semibold">→ {e}</th>)}</tr>
        </thead>
        <tbody>
          {TIERS.map((pred) => (
            <tr key={pred}>
              <th className="text-[10px] uppercase text-gray-400 font-semibold pr-1 text-right">{pred}</th>
              {TIERS.map((eff) => (
                <td key={eff} className={`text-center rounded-lg py-3 font-bold ${cellClass(pred, eff)}`}>
                  {matrix[pred][eff] || "·"}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <div className="flex gap-3 text-[11px] text-gray-500 mt-2">
        <span><span className="inline-block w-2.5 h-2.5 rounded bg-emerald-100 align-middle mr-1" />promoted</span>
        <span><span className="inline-block w-2.5 h-2.5 rounded bg-amber-100 align-middle mr-1" />held</span>
        <span><span className="inline-block w-2.5 h-2.5 rounded bg-red-100 align-middle mr-1" />demoted</span>
      </div>
      {total === 0 && <p className="text-sm text-gray-400 italic mt-2">Not enough data yet — needs leads with resolved outcomes.</p>}
    </div>
  );
}
```

- [ ] **Step 3: CalibrationBars**

```tsx
// components/admin/intelligence/CalibrationBars.tsx
type C = { category: string; successAvg: number | null; nonSuccessAvg: number | null };
const MAX: Record<string, number> = { budget: 30, timeline: 25, decisionAuthority: 15, objectiveClarity: 15, mindsetIndicator: 15 };
const NAME: Record<string, string> = { budget: "Budget", timeline: "Timeline", decisionAuthority: "Decision auth", objectiveClarity: "Objective", mindsetIndicator: "Mindset" };

export function CalibrationBars({ calibration }: { calibration: C[] }) {
  const hasData = calibration.some((c) => c.successAvg !== null || c.nonSuccessAvg !== null);
  return (
    <div className="rounded-xl bg-white ring-1 ring-gray-200 shadow-sm p-4">
      <h2 className="text-xs uppercase tracking-wide font-bold text-gray-500 mb-1">Score-category calibration</h2>
      <p className="text-[11px] text-gray-400 mb-3">gold = avg points among successes · navy tick = among non-successes</p>
      {calibration.map((c) => {
        const max = MAX[c.category] ?? 30;
        const sw = c.successAvg === null ? 0 : (c.successAvg / max) * 100;
        const nw = c.nonSuccessAvg === null ? null : (c.nonSuccessAvg / max) * 100;
        return (
          <div key={c.category} className="mb-2">
            <div className="flex justify-between text-xs text-gray-600"><span>{NAME[c.category] ?? c.category}</span><span>{c.successAvg ?? "—"} / {c.nonSuccessAvg ?? "—"}</span></div>
            <div className="relative h-2.5 rounded bg-gray-100 mt-0.5">
              <div className="absolute inset-y-0 left-0 rounded bg-gold" style={{ width: `${sw}%` }} />
              {nw !== null && <div className="absolute inset-y-0 w-0.5 bg-navy" style={{ left: `${nw}%` }} />}
            </div>
          </div>
        );
      })}
      {!hasData && <p className="text-sm text-gray-400 italic mt-2">Not enough data yet.</p>}
    </div>
  );
}
```

- [ ] **Step 4: CoverageCard + VersionCard**

```tsx
// components/admin/intelligence/CoverageCard.tsx
type Cov = { total: number; resolved: number; pending: number; earliest: string | null; latest: string | null };
export function CoverageCard({ coverage }: { coverage: Cov }) {
  const fmt = (s: string | null) => (s ? s.slice(0, 10) : "—");
  return (
    <div className="rounded-xl bg-white ring-1 ring-gray-200 shadow-sm p-4">
      <h2 className="text-xs uppercase tracking-wide font-bold text-gray-500 mb-2">Data coverage</h2>
      <div className="grid grid-cols-3 gap-2 text-center">
        <div><p className="text-xl font-heading font-semibold text-navy">{coverage.total}</p><p className="text-[11px] text-gray-500">total</p></div>
        <div><p className="text-xl font-heading font-semibold text-emerald-600">{coverage.resolved}</p><p className="text-[11px] text-gray-500">resolved</p></div>
        <div><p className="text-xl font-heading font-semibold text-amber-600">{coverage.pending}</p><p className="text-[11px] text-gray-500">pending</p></div>
      </div>
      <p className="text-[11px] text-gray-500 mt-2">Range: {fmt(coverage.earliest)} → {fmt(coverage.latest)}</p>
    </div>
  );
}
```

```tsx
// components/admin/intelligence/VersionCard.tsx
type Entry = { version: string; date: string; summary: string };
export function VersionCard({ current, changelog }: { current: string; changelog: Entry[] }) {
  return (
    <div className="rounded-xl bg-white ring-1 ring-gray-200 shadow-sm p-4">
      <h2 className="text-xs uppercase tracking-wide font-bold text-gray-500 mb-2">Omar active version</h2>
      <p className="text-lg font-heading font-semibold text-navy">v{current} <span className="text-xs text-gray-400 font-body">· prompt + scoring</span></p>
      <ul className="mt-2 space-y-1">
        {changelog.map((c) => <li key={c.version} className="text-[11px] text-gray-500">v{c.version} ({c.date}) — {c.summary}</li>)}
      </ul>
    </div>
  );
}
```

- [ ] **Step 5: NotesPanel (interactive)**

```tsx
// components/admin/intelligence/NotesPanel.tsx
"use client";
import { useEffect, useState, useCallback } from "react";
import { Plus, Check, Archive, Trash2 } from "lucide-react";

type Note = { id: string; kind: string; title: string; body: string | null; status: string };
function authHeaders() {
  return { Authorization: `Bearer ${typeof window !== "undefined" ? localStorage.getItem("admin_token") ?? "" : ""}`, "Content-Type": "application/json" };
}

export function NotesPanel() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [kind, setKind] = useState("hypothesis");
  const [title, setTitle] = useState("");

  const load = useCallback(async () => {
    const r = await fetch("/api/admin/intelligence/notes", { headers: authHeaders(), credentials: "include" });
    if (r.ok) setNotes((await r.json()).notes);
  }, []);
  useEffect(() => { load(); }, [load]);

  async function add() {
    if (!title.trim()) return;
    await fetch("/api/admin/intelligence/notes", { method: "POST", headers: authHeaders(), credentials: "include", body: JSON.stringify({ kind, title }) });
    setTitle(""); load();
  }
  async function patch(id: string, status: string) {
    await fetch("/api/admin/intelligence/notes", { method: "PATCH", headers: authHeaders(), credentials: "include", body: JSON.stringify({ id, status }) });
    load();
  }
  async function remove(id: string) {
    await fetch(`/api/admin/intelligence/notes?id=${id}`, { method: "DELETE", headers: authHeaders(), credentials: "include" });
    load();
  }

  return (
    <div className="rounded-xl bg-white ring-1 ring-gray-200 shadow-sm p-4">
      <h2 className="text-xs uppercase tracking-wide font-bold text-gray-500 mb-3">Hypotheses & confirmed learnings</h2>
      <div className="flex gap-2 mb-3">
        <select value={kind} onChange={(e) => setKind(e.target.value)} className="rounded-md border border-gray-200 text-sm px-2 py-1.5">
          <option value="hypothesis">Hypothesis</option><option value="learning">Learning</option><option value="analysis_run">Analysis run</option>
        </select>
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="New note…" className="flex-1 rounded-md border border-gray-200 text-sm px-3 py-1.5" />
        <button onClick={add} className="inline-flex items-center gap-1 rounded-md bg-navy text-white text-sm px-3 py-1.5"><Plus className="h-4 w-4" />Add</button>
      </div>
      <ul className="divide-y divide-gray-100">
        {notes.map((n) => (
          <li key={n.id} className="py-2 flex items-center gap-2">
            <span className="text-[10px] uppercase font-semibold text-gray-400 w-20">{n.kind}</span>
            <span className={`flex-1 text-sm ${n.status === "archived" ? "line-through text-gray-400" : "text-navy"}`}>{n.title}</span>
            <span className="text-[10px] text-gray-400">{n.status}</span>
            <button title="Confirm" onClick={() => patch(n.id, "confirmed")} className="text-gray-400 hover:text-emerald-600"><Check className="h-4 w-4" /></button>
            <button title="Archive" onClick={() => patch(n.id, "archived")} className="text-gray-400 hover:text-amber-600"><Archive className="h-4 w-4" /></button>
            <button title="Delete" onClick={() => remove(n.id)} className="text-gray-400 hover:text-red-600"><Trash2 className="h-4 w-4" /></button>
          </li>
        ))}
        {notes.length === 0 && <li className="py-2 text-sm text-gray-400 italic">No notes yet — add a hypothesis to start.</li>}
      </ul>
    </div>
  );
}
```

- [ ] **Step 6: Typecheck + commit**

Run: `npx tsc --noEmit` → no new errors.
```bash
git add components/admin/intelligence
git commit -m "feat(intel): dashboard components"
```

---

## Task 13: Dashboard page

**Files:**
- Create: `app/admin/intelligence/page.tsx`

- [ ] **Step 1: Implement**

```tsx
// app/admin/intelligence/page.tsx
"use client";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { FileDown, Loader2 } from "lucide-react";
import { PrecisionCards } from "@/components/admin/intelligence/PrecisionCards";
import { ReGradingMatrix } from "@/components/admin/intelligence/ReGradingMatrix";
import { CalibrationBars } from "@/components/admin/intelligence/CalibrationBars";
import { CoverageCard } from "@/components/admin/intelligence/CoverageCard";
import { VersionCard } from "@/components/admin/intelligence/VersionCard";
import { NotesPanel } from "@/components/admin/intelligence/NotesPanel";

function authHeaders() {
  return { Authorization: `Bearer ${typeof window !== "undefined" ? localStorage.getItem("admin_token") ?? "" : ""}`, "Content-Type": "application/json" };
}

export default function IntelligencePage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/admin/intelligence", { headers: authHeaders(), credentials: "include" });
      if (r.ok) setData(await r.json());
    } finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  if (loading) return <div className="flex items-center gap-2 text-gray-400"><Loader2 className="h-4 w-4 animate-spin" />Loading intelligence…</div>;
  if (!data) return <p className="text-gray-500">Couldn&apos;t load intelligence data.</p>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-semibold text-navy">Intelligence</h1>
          <p className="text-sm text-gray-500">Calibration &amp; system learning · internal</p>
        </div>
        <Link href="/admin/intelligence/one-pager" className="inline-flex items-center gap-2 rounded-lg gold-gradient px-4 py-2 text-sm font-semibold text-white shadow-sm hover:shadow-md transition-shadow">
          <FileDown className="h-4 w-4" />Generate one-pager
        </Link>
      </div>

      <PrecisionCards precision={data.precision} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ReGradingMatrix matrix={data.regrading.matrix} />
        <CalibrationBars calibration={data.calibration} />
      </div>

      <h2 className="text-xs uppercase tracking-wide font-bold text-gold pt-2">System state &amp; workflow</h2>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <VersionCard current={data.version.current} changelog={data.version.changelog} />
        <CoverageCard coverage={data.coverage} />
      </div>
      <NotesPanel />
    </div>
  );
}
```

- [ ] **Step 2: Build + manual smoke**

Run: `npm run build` → exit 0; `/admin/intelligence` listed.
Manual (`npm run dev`): sign in at `/admin`, visit `/admin/intelligence` → renders empty states at Month 0; add a note → it persists on reload.

- [ ] **Step 3: Commit**

```bash
git add app/admin/intelligence/page.tsx
git commit -m "feat(intel): intelligence dashboard page"
```

---

## Task 14: One-pager page

**Files:**
- Create: `app/admin/intelligence/one-pager/page.tsx`

- [ ] **Step 1: Implement**

```tsx
// app/admin/intelligence/one-pager/page.tsx
"use client";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { ChevronLeft, Printer, Copy, Check } from "lucide-react";
import { renderOnePagerMarkdown } from "@/lib/intelligence/one-pager";

function authHeaders() {
  return { Authorization: `Bearer ${typeof window !== "undefined" ? localStorage.getItem("admin_token") ?? "" : ""}`, "Content-Type": "application/json" };
}
function periodLabel(month: string | null) {
  if (!month) return "All time";
  const [y, m] = month.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleString("en-US", { month: "long", year: "numeric", timeZone: "UTC" });
}

export default function OnePagerPage() {
  const [data, setData] = useState<any>(null);
  const [prose, setProse] = useState({ happened: "", omar: "", next: "" });
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    const r = await fetch("/api/admin/intelligence", { headers: authHeaders(), credentials: "include" });
    if (r.ok) setData(await r.json());
  }, []);
  useEffect(() => { load(); }, [load]);
  if (!data) return <p className="text-gray-400">Loading…</p>;

  const learnings: { title: string; body: string | null }[] = []; // populated below from notes fetch in a follow-up; empty is valid
  const input = {
    period: periodLabel(data.month),
    coverage: data.coverage,
    precision: data.precision,
    topSource: data.topSource,
    conversion: data.conversion,
    changelog: data.version.changelog,
    learnings,
    prose,
  };
  const md = renderOnePagerMarkdown(input);

  async function copy() {
    try { await navigator.clipboard.writeText(md); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { /* clipboard blocked */ }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between print:hidden">
        <Link href="/admin/intelligence" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gold"><ChevronLeft className="h-4 w-4" />Back</Link>
        <div className="flex gap-2">
          <button onClick={() => window.print()} className="inline-flex items-center gap-1.5 rounded-md bg-navy text-white text-sm px-3 py-2"><Printer className="h-4 w-4" />Print / Save PDF</button>
          <button onClick={copy} className="inline-flex items-center gap-1.5 rounded-md bg-gray-100 text-gray-700 text-sm px-3 py-2">{copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}{copied ? "Copied" : "Copy Markdown"}</button>
        </div>
      </div>

      {/* Editable prose (hidden in print) */}
      <div className="grid gap-2 print:hidden">
        {(["happened", "omar", "next"] as const).map((k) => (
          <textarea key={k} value={prose[k]} onChange={(e) => setProse((p) => ({ ...p, [k]: e.target.value }))}
            placeholder={`Prose for "${k}"…`} className="w-full rounded-md border border-gray-200 text-sm p-2" rows={2} />
        ))}
      </div>

      {/* Rendered one-pager (the printable surface) */}
      <article className="rounded-xl bg-white ring-1 ring-gray-200 shadow-sm p-8 whitespace-pre-wrap font-body text-sm leading-relaxed print:ring-0 print:shadow-none">
        {md}
      </article>
    </div>
  );
}
```

> The one-pager renders the Markdown verbatim in a `whitespace-pre-wrap` block — the same string the Copy button yields, so what you print equals what you copy. Confirmed-learnings selection is a small v1.1 enhancement (the `learnings` array is wired but starts empty).

- [ ] **Step 2: Build + manual**

Run: `npm run build` → exit 0; `/admin/intelligence/one-pager` listed.
Manual: from the dashboard click "Generate one-pager" → numbers populate; type prose → it appears in the rendered block; Print preview shows only the article; Copy Markdown copies the text.

- [ ] **Step 3: Commit**

```bash
git add app/admin/intelligence/one-pager/page.tsx
git commit -m "feat(intel): one-pager export page"
```

---

## Task 15: Sidebar nav entry

**Files:**
- Modify: `app/admin/layout.tsx` (the `NAV_ITEMS` array, after the "Activity" entry)

- [ ] **Step 1: Add the nav item**

In `app/admin/layout.tsx`, insert this object into `NAV_ITEMS` immediately after the `/admin/activity` entry (before `/admin/settings`):

```ts
  { href: "/admin/intelligence", label: "Intelligence", icon: "M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" },
```

Do **not** add it to `MOBILE_NAV_HREFS` (mobile bottom nav stays at 5; Intelligence is reachable via the desktop sidebar + direct URL — consistent with the existing pattern for Sellers/Users/Conversations/Activity/Settings).

- [ ] **Step 2: Build + manual**

Run: `npm run build` → exit 0.
Manual: sidebar shows "Intelligence" with the bar-chart icon; clicking navigates to the dashboard; active state highlights.

- [ ] **Step 3: Commit**

```bash
git add app/admin/layout.tsx
git commit -m "feat(intel): add Intelligence to admin sidebar"
```

---

## Task 16: Final verification

- [ ] **Step 1: Full test suite**

Run: `npm test`
Expected: all suites green, including the new `tests/intelligence/*` and `tests/db/intelligence-notes.test.ts` (≈ 80+ tests total).

- [ ] **Step 2: Production build**

Run: `npm run build`
Expected: exit 0; routes present: `/admin/intelligence`, `/admin/intelligence/one-pager`, `/api/admin/intelligence`, `/api/admin/intelligence/notes`.

- [ ] **Step 3: Manual end-to-end smoke (optional but recommended)**

With `npm run dev` and a few seeded leads (varied `qualification` + `outcome`):
- `/admin/intelligence` → precision cards, matrix cells coloured (promoted/held/demoted), calibration bars, coverage, version, notes all render; empty states show when no resolved leads.
- Add/confirm/archive/delete a note → persists.
- "Generate one-pager" → numbers match the dashboard; prose editing reflects in the rendered block; Print shows only the article; Copy Markdown works.

- [ ] **Step 4: Update build log + handover**

Add a Phase-9 entry to `delivery/stages/04-build/output/gto-build-log.md` and bump `HANDOVER.md` noting the intelligence dashboard shipped (v1: Groups A + D + one-pager).

```bash
git add HANDOVER.md
git commit -m "docs: intelligence dashboard v1 shipped"
```

---

## Self-Review Notes

- **Spec coverage:** Group A (precision T3, matrix T4, calibration T5, movement summary T4), Group D (version T7, coverage T6, notes T8/T11/T12), one-pager (T9/T14), schema (T1), effective-tier auto-from-outcome (T2), nav (T15), empty states (T12 components), month filter (queries accept `month`; surfaced via API in T10 — a month-selector UI control is a small v1.1 add). All spec sections map to tasks.
- **Type consistency:** `Tier`, `TierPrecision`, `ReGrading`, `CategoryCalibration`, `DataCoverage`, `ConversionStats`, `TopSource`, `ChangelogEntry`, `IntelNote` are defined once and imported; the one-pager + API + components consume those exact shapes.
- **Deferred (per spec):** Groups B & C, explicit manual re-grade/override, AI narrative, server-side PDF, confirmed-learnings picker in the one-pager (wired, empty in v1).

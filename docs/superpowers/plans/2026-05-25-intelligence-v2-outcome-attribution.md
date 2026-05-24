# Intelligence v2 — Outcome Attribution + Decoupled Omar Precision — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stop the intelligence dashboard from blaming Omar for deals that failed downstream — capture *why* a lead closed (`outcome_reason`) + an explicit *was-Omar-right* verdict (`omar_grade_correct`), and recompute Omar's precision to exclude non-Omar losses, keeping conversion as a separate funnel metric.

**Architecture:** Two nullable columns on `leads`; a pure `omarVerdict()` helper that maps (predicted tier, outcome, reason, grade-verdict) → `correct | wrong | excluded`; new intelligence queries built on it; the admin outcome UI captures the two fields; the dashboard shows an attribution-adjusted precision card + loss-reason panel; phase advancement uses the decoupled precision. Fully backward-compatible (untagged leads fall back to v1 inference).

**Tech Stack:** Next.js 14 App Router, TypeScript, `@libsql/client` (Turso), Vitest.

**Spec:** `docs/superpowers/specs/2026-05-25-intelligence-v2-outcome-attribution-design.md`

**Conventions:**
- Tests under `tests/intelligence/`. Run one file: `npx vitest run tests/intelligence/<file>.test.ts --no-file-parallelism` (the flag avoids vitest worker-spawn timeouts in this repo).
- Pure logic + queries → full TDD. Route + React components → verified via `npm run build`.
- Commit after each task with the message shown.

---

## File structure

| File | New/Edit | Responsibility |
|------|----------|----------------|
| `lib/db/schema.sql` | Edit | `ALTER TABLE leads ADD COLUMN outcome_reason / omar_grade_correct` |
| `tests/intelligence/helpers.ts` | Edit | `seedLead` accepts `outcomeReason` + `omarGradeCorrect` |
| `lib/intelligence/effective-tier.ts` | Edit | Add `OutcomeReason`/`GradeVerdict`/`OmarVerdict` types + `omarVerdict()` |
| `lib/intelligence/queries.ts` | Edit | Add `getOmarPrecision`, `getLossReasonBreakdown`; make `getReGradingMatrix` attribution-aware |
| `lib/ai/phase.ts` | Edit | `getPhaseProgress` uses decoupled precision (`precisionPct`) |
| `components/admin/intelligence/OmarRoadmap.tsx` | Edit | Read `precisionPct` (renamed from `hotPrecisionPct`) |
| `app/api/admin/inquiries/[leadId]/outcome/route.ts` | Edit | Accept + validate + persist the two new fields |
| `app/admin/inquiries/page.tsx` | Edit | Reason dropdown + grade selector; send in PATCH |
| `lib/intelligence/api-types.ts` | Edit | Add `omarPrecision` + `lossReasons` to `IntelligenceStats` |
| `app/api/admin/intelligence/route.ts` | Edit | Call the new queries, include in response |
| `components/admin/intelligence/OmarPrecisionCard.tsx` | New | Attribution-adjusted precision card |
| `components/admin/intelligence/LossReasonsPanel.tsx` | New | Loss-reason breakdown |
| `app/admin/intelligence/page.tsx` | Edit | Mount the two new components; relabel existing precision as "conversion" |

---

## Task 1: Schema columns + seedLead helper

**Files:**
- Modify: `lib/db/schema.sql`
- Modify: `tests/intelligence/helpers.ts`
- Test: `tests/intelligence/attribution-schema.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// tests/intelligence/attribution-schema.test.ts
import { describe, it, expect } from "vitest";
import { makeTestDb, seedLead } from "./helpers";

describe("attribution columns", () => {
  it("persists outcome_reason + omar_grade_correct via seedLead", async () => {
    const db = await makeTestDb();
    await seedLead(db, {
      qualification: "hot",
      outcome: "rejected",
      outcomeReason: "lost_execution",
      omarGradeCorrect: "yes",
    });
    const res = await db.execute("SELECT outcome_reason, omar_grade_correct FROM leads");
    expect(res.rows[0].outcome_reason).toBe("lost_execution");
    expect(res.rows[0].omar_grade_correct).toBe("yes");
  });
});
```

- [ ] **Step 2: Run it, verify it FAILS**

Run: `npx vitest run tests/intelligence/attribution-schema.test.ts --no-file-parallelism`
Expected: FAIL — `seedLead` doesn't accept those opts / columns don't exist.

- [ ] **Step 3a: Add columns to `lib/db/schema.sql`**

Find the block of `ALTER TABLE leads ADD COLUMN …` statements (the Layer-3 lead-intelligence additions). Add these two lines among them:

```sql
ALTER TABLE leads ADD COLUMN outcome_reason TEXT;
ALTER TABLE leads ADD COLUMN omar_grade_correct TEXT;
```

(`makeTestDb` loads `schema.sql` and the migrate runner both tolerate "duplicate column" on re-run, so this is idempotent.)

- [ ] **Step 3b: Extend `seedLead` in `tests/intelligence/helpers.ts`**

Replace the existing `seedLead` with this version (adds the two optional fields to the signature and the INSERT):

```ts
export async function seedLead(
  db: Client,
  opts: {
    qualification: string; outcome: string; source?: string; createdAt?: string;
    breakdown?: Record<string, number>; outcomeReason?: string; omarGradeCorrect?: string;
  },
) {
  await db.execute({
    sql: `INSERT INTO leads (name, email, qualification, outcome, source, created_at, score_breakdown, outcome_reason, omar_grade_correct)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      "Test", "t" + Math.random().toString(36).slice(2) + "@x.com",
      opts.qualification, opts.outcome, opts.source ?? "main",
      opts.createdAt ?? "2026-05-15 10:00:00",
      opts.breakdown ? JSON.stringify(opts.breakdown) : null,
      opts.outcomeReason ?? null,
      opts.omarGradeCorrect ?? null,
    ],
  });
}
```

- [ ] **Step 4: Run it, verify it PASSES**

Run: `npx vitest run tests/intelligence/attribution-schema.test.ts --no-file-parallelism`
Expected: PASS. Also confirm no regression: `npx vitest run tests/intelligence --no-file-parallelism`.

- [ ] **Step 5: Commit**

```bash
git add lib/db/schema.sql tests/intelligence/helpers.ts tests/intelligence/attribution-schema.test.ts
git commit -m "feat(intel): add outcome_reason + omar_grade_correct lead columns"
```

---

## Task 2: `omarVerdict()` attribution helper

**Files:**
- Modify: `lib/intelligence/effective-tier.ts`
- Test: `tests/intelligence/omar-verdict.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// tests/intelligence/omar-verdict.test.ts
import { describe, it, expect } from "vitest";
import { omarVerdict } from "@/lib/intelligence/effective-tier";

describe("omarVerdict", () => {
  it("explicit grade verdict wins over everything", () => {
    expect(omarVerdict({ predicted: "hot", outcome: "rejected", outcomeReason: "lost_not_qualified", omarGradeCorrect: "yes" })).toBe("correct");
    expect(omarVerdict({ predicted: "hot", outcome: "converted", outcomeReason: "won", omarGradeCorrect: "no" })).toBe("wrong");
    expect(omarVerdict({ predicted: "hot", outcome: "converted", omarGradeCorrect: "unsure" })).toBe("excluded");
  });

  it("attributes by outcome_reason when no explicit verdict", () => {
    expect(omarVerdict({ predicted: "warm", outcome: "converted", outcomeReason: "won" })).toBe("correct");
    expect(omarVerdict({ predicted: "hot", outcome: "rejected", outcomeReason: "lost_not_qualified" })).toBe("wrong");
  });

  it("KEY: a hot lead lost to execution is EXCLUDED, not wrong", () => {
    expect(omarVerdict({ predicted: "hot", outcome: "rejected", outcomeReason: "lost_execution" })).toBe("excluded");
    expect(omarVerdict({ predicted: "hot", outcome: "rejected", outcomeReason: "lost_external" })).toBe("excluded");
    expect(omarVerdict({ predicted: "hot", outcome: "rejected", outcomeReason: "lost_unresponsive" })).toBe("excluded");
    expect(omarVerdict({ predicted: "warm", outcome: "contacted", outcomeReason: "nurturing" })).toBe("excluded");
  });

  it("falls back to v1 outcome inference when untagged", () => {
    expect(omarVerdict({ predicted: "hot", outcome: "converted" })).toBe("correct");
    expect(omarVerdict({ predicted: "hot", outcome: "rejected" })).toBe("wrong");
    expect(omarVerdict({ predicted: "warm", outcome: "pending" })).toBe("excluded");
  });
});
```

- [ ] **Step 2: Run it, verify it FAILS**

Run: `npx vitest run tests/intelligence/omar-verdict.test.ts --no-file-parallelism`
Expected: FAIL — `omarVerdict` not exported.

- [ ] **Step 3: Append to `lib/intelligence/effective-tier.ts`** (keep all existing exports):

```ts
export type OutcomeReason =
  | "won" | "lost_not_qualified" | "lost_execution"
  | "lost_external" | "lost_unresponsive" | "nurturing";
export type GradeVerdict = "yes" | "no" | "unsure";
export type OmarVerdict = "correct" | "wrong" | "excluded";

/**
 * How a lead should count toward OMAR's precision — decoupled from the deal result.
 * Precedence: explicit grade verdict > structured outcome_reason > v1 outcome inference.
 */
export function omarVerdict(input: {
  predicted: Tier;
  outcome: string;
  outcomeReason?: string | null;
  omarGradeCorrect?: string | null;
}): OmarVerdict {
  // 1. Explicit human verdict wins.
  if (input.omarGradeCorrect === "yes") return "correct";
  if (input.omarGradeCorrect === "no") return "wrong";
  if (input.omarGradeCorrect === "unsure") return "excluded";

  // 2. Attribute by structured reason.
  switch (input.outcomeReason) {
    case "won": return "correct";
    case "lost_not_qualified": return "wrong";
    case "lost_execution":
    case "lost_external":
    case "lost_unresponsive":
    case "nurturing": return "excluded";
  }

  // 3. Legacy fallback (both fields null): infer from outcome vs predicted tier.
  const effective = outcomeToEffectiveTier(input.outcome);
  if (effective === null) return "excluded"; // pending / unknown — no ground truth
  return effective === input.predicted ? "correct" : "wrong";
}
```

- [ ] **Step 4: Run it, verify it PASSES**

Run: `npx vitest run tests/intelligence/omar-verdict.test.ts --no-file-parallelism`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add lib/intelligence/effective-tier.ts tests/intelligence/omar-verdict.test.ts
git commit -m "feat(intel): omarVerdict — attribution-aware correct/wrong/excluded"
```

---

## Task 3: `getOmarPrecision` + `getLossReasonBreakdown`

**Files:**
- Modify: `lib/intelligence/queries.ts`
- Test: `tests/intelligence/omar-precision.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// tests/intelligence/omar-precision.test.ts
import { describe, it, expect } from "vitest";
import { makeTestDb, seedLead } from "./helpers";
import { getOmarPrecision, getLossReasonBreakdown } from "@/lib/intelligence/queries";

describe("getOmarPrecision", () => {
  it("excludes sales/external losses from Omar's precision", async () => {
    const db = await makeTestDb();
    await seedLead(db, { qualification: "hot", outcome: "converted", outcomeReason: "won" });          // correct
    await seedLead(db, { qualification: "hot", outcome: "rejected", outcomeReason: "lost_not_qualified" }); // wrong
    await seedLead(db, { qualification: "hot", outcome: "rejected", outcomeReason: "lost_execution" });  // excluded
    await seedLead(db, { qualification: "hot", outcome: "rejected", outcomeReason: "lost_external" });   // excluded
    const p = await getOmarPrecision(db);
    expect(p.overall.correct).toBe(1);
    expect(p.overall.wrong).toBe(1);
    expect(p.overall.excluded).toBe(2);
    expect(p.overall.precisionPct).toBe(50); // 1 / (1+1)
  });

  it("explicit grade verdict overrides outcome", async () => {
    const db = await makeTestDb();
    await seedLead(db, { qualification: "hot", outcome: "rejected", outcomeReason: "lost_execution", omarGradeCorrect: "yes" });
    const p = await getOmarPrecision(db);
    expect(p.overall.correct).toBe(1);
    expect(p.overall.excluded).toBe(0);
  });
});

describe("getLossReasonBreakdown", () => {
  it("counts leads per outcome_reason", async () => {
    const db = await makeTestDb();
    await seedLead(db, { qualification: "hot", outcome: "rejected", outcomeReason: "lost_execution" });
    await seedLead(db, { qualification: "hot", outcome: "rejected", outcomeReason: "lost_execution" });
    await seedLead(db, { qualification: "warm", outcome: "rejected", outcomeReason: "lost_external" });
    const rows = await getLossReasonBreakdown(db);
    const exec = rows.find((r) => r.reason === "lost_execution");
    expect(exec?.count).toBe(2);
  });
});
```

- [ ] **Step 2: Run it, verify it FAILS**

Run: `npx vitest run tests/intelligence/omar-precision.test.ts --no-file-parallelism`
Expected: FAIL — functions not exported.

- [ ] **Step 3: Add to `lib/intelligence/queries.ts`** (import `omarVerdict` from `./effective-tier` — extend the existing import line; `Tier` is already imported):

```ts
// add omarVerdict to the existing effective-tier import:
//   import { type Tier, outcomeToEffectiveTier, isResolved, movementOf, omarVerdict } from "./effective-tier";

export interface OmarPrecision { correct: number; wrong: number; excluded: number; precisionPct: number | null; }
export interface OmarPrecisionResult { overall: OmarPrecision; byTier: Record<Tier, OmarPrecision>; }

function emptyPrecision(): OmarPrecision { return { correct: 0, wrong: 0, excluded: 0, precisionPct: null }; }
function pct(p: OmarPrecision): number | null {
  const denom = p.correct + p.wrong;
  return denom === 0 ? null : Math.round((p.correct / denom) * 100);
}

export async function getOmarPrecision(db: Client, month?: string): Promise<OmarPrecisionResult> {
  const { where, args } = monthClause(month);
  const res = await db.execute({
    sql: `SELECT qualification, outcome, outcome_reason, omar_grade_correct FROM leads${where}`,
    args,
  });
  const overall = emptyPrecision();
  const byTier: Record<Tier, OmarPrecision> = { hot: emptyPrecision(), warm: emptyPrecision(), cold: emptyPrecision() };
  for (const r of res.rows) {
    const predicted = String(r.qualification);
    if (!(TIERS as string[]).includes(predicted)) continue;
    const tier = predicted as Tier;
    const verdict = omarVerdict({
      predicted: tier,
      outcome: String(r.outcome),
      outcomeReason: r.outcome_reason as string | null,
      omarGradeCorrect: r.omar_grade_correct as string | null,
    });
    overall[verdict] += 1;
    byTier[tier][verdict] += 1;
  }
  overall.precisionPct = pct(overall);
  for (const t of TIERS) byTier[t].precisionPct = pct(byTier[t]);
  return { overall, byTier };
}

export interface LossReasonCount { reason: string; count: number; }

export async function getLossReasonBreakdown(db: Client, month?: string): Promise<LossReasonCount[]> {
  const { where, args } = monthClause(month);
  const clause = where ? `${where} AND outcome_reason IS NOT NULL` : " WHERE outcome_reason IS NOT NULL";
  const res = await db.execute({
    sql: `SELECT outcome_reason AS reason, COUNT(*) AS c FROM leads${clause} GROUP BY outcome_reason ORDER BY c DESC`,
    args,
  });
  return res.rows.map((r) => ({ reason: String(r.reason), count: Number(r.c) }));
}
```

> Note: `TIERS`, `monthClause`, and `Client` are already defined/imported at the top of `queries.ts` — reuse them, don't redeclare.

- [ ] **Step 4: Run it, verify it PASSES**

Run: `npx vitest run tests/intelligence/omar-precision.test.ts --no-file-parallelism`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add lib/intelligence/queries.ts tests/intelligence/omar-precision.test.ts
git commit -m "feat(intel): getOmarPrecision (attribution-adjusted) + getLossReasonBreakdown"
```

---

## Task 4: Make `getReGradingMatrix` attribution-aware

**Files:**
- Modify: `lib/intelligence/queries.ts`
- Test: `tests/intelligence/regrading-attribution.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// tests/intelligence/regrading-attribution.test.ts
import { describe, it, expect } from "vitest";
import { makeTestDb, seedLead } from "./helpers";
import { getReGradingMatrix } from "@/lib/intelligence/queries";

describe("getReGradingMatrix attribution", () => {
  it("excludes non-Omar losses from the demotion counts", async () => {
    const db = await makeTestDb();
    // hot lead lost to execution must NOT show as hot->cold demotion
    await seedLead(db, { qualification: "hot", outcome: "rejected", outcomeReason: "lost_execution" });
    // a genuine over-grade should still count as demoted
    await seedLead(db, { qualification: "hot", outcome: "rejected", outcomeReason: "lost_not_qualified" });
    const { summary } = await getReGradingMatrix(db);
    expect(summary.hot.demoted).toBe(1); // only the genuine over-grade
    expect(summary.hot.total).toBe(1);
  });
});
```

- [ ] **Step 2: Run it, verify it FAILS**

Run: `npx vitest run tests/intelligence/regrading-attribution.test.ts --no-file-parallelism`
Expected: FAIL — execution-loss currently counts as demoted (`demoted` would be 2 / total 2).

- [ ] **Step 3: Edit `getReGradingMatrix` in `lib/intelligence/queries.ts`**

Inside the `for (const r of res.rows)` loop, the function currently does (roughly): compute `predicted`, skip if not a tier, compute `effective = outcomeToEffectiveTier(...)`, skip if null, then tally `matrix`/`summary`. Add an attribution guard **and** select the new columns. Specifically:

1. Change its SQL to also select the attribution columns:
   `sql: \`SELECT qualification, outcome, outcome_reason, omar_grade_correct FROM leads${where}\``
2. Right after computing `tier` (predicted) and before using `effective`, add:

```ts
    const verdict = omarVerdict({
      predicted: tier,
      outcome: String(r.outcome),
      outcomeReason: r.outcome_reason as string | null,
      omarGradeCorrect: r.omar_grade_correct as string | null,
    });
    if (verdict === "excluded") continue; // non-Omar loss / unsure / pending — not a re-grade
```

Keep the rest (the `effective = outcomeToEffectiveTier(...)`, `if (!effective) continue;`, and the `matrix`/`summary` tallies) unchanged.

- [ ] **Step 4: Run it, verify it PASSES**

Run: `npx vitest run tests/intelligence/regrading-attribution.test.ts --no-file-parallelism`
Then the whole suite to confirm the existing re-grading test still passes: `npx vitest run tests/intelligence --no-file-parallelism`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/intelligence/queries.ts tests/intelligence/regrading-attribution.test.ts
git commit -m "feat(intel): re-grading matrix excludes non-Omar losses"
```

---

## Task 5: Phase progress uses decoupled precision

**Files:**
- Modify: `lib/ai/phase.ts`
- Modify: `components/admin/intelligence/OmarRoadmap.tsx`
- Test: `tests/ai/phase.test.ts` (update the existing progress test)

- [ ] **Step 1: Update the failing test** — replace the `getPhaseProgress` test body in `tests/ai/phase.test.ts` with:

```ts
describe("getPhaseProgress", () => {
  it("reports active phase + decoupled Omar precision (excludes non-Omar losses)", async () => {
    const db = await makeTestDb();
    await seedLead(db, { qualification: "hot", outcome: "converted", outcomeReason: "won" });            // correct
    await seedLead(db, { qualification: "hot", outcome: "rejected", outcomeReason: "lost_not_qualified" }); // wrong
    await seedLead(db, { qualification: "hot", outcome: "rejected", outcomeReason: "lost_execution" });   // excluded
    const prog = await getPhaseProgress(db);
    expect(prog.activePhase).toBe(1);
    expect(prog.resolvedLeads).toBe(2);   // correct + wrong (excluded not counted)
    expect(prog.precisionPct).toBe(50);   // 1 / (1+1)
  });
});
```

- [ ] **Step 2: Run it, verify it FAILS**

Run: `npx vitest run tests/ai/phase.test.ts --no-file-parallelism`
Expected: FAIL — `precisionPct` doesn't exist (old field was `hotPrecisionPct`).

- [ ] **Step 3a: Edit `lib/ai/phase.ts`**

Replace the `getTierPrecision`/`getDataCoverage` import with `getOmarPrecision`:
```ts
import { getOmarPrecision } from "@/lib/intelligence/queries";
```
Change the `PhaseProgress` interface and `getPhaseProgress`:
```ts
export interface PhaseProgress {
  activePhase: PhaseNumber;
  resolvedLeads: number;     // correct + wrong (verdict-eligible)
  precisionPct: number | null;
  nextTarget: number | null;
}

export async function getPhaseProgress(db: Client): Promise<PhaseProgress> {
  const activePhase = await getActivePhase(db);
  const { overall } = await getOmarPrecision(db);
  const next = PHASES.find((p) => p.phase > activePhase);
  return {
    activePhase,
    resolvedLeads: overall.correct + overall.wrong,
    precisionPct: overall.precisionPct,
    nextTarget: next?.unlock.precisionTarget ?? null,
  };
}
```
(`getDataCoverage`/`getTierPrecision` are no longer used here — remove them from this file's imports if they become unused.)

- [ ] **Step 3b: Edit `components/admin/intelligence/OmarRoadmap.tsx`**

In the `RoadmapState` interface, rename `hotPrecisionPct: number | null;` → `precisionPct: number | null;`. In the header line that renders it, change `state.hotPrecisionPct` → `state.precisionPct` and update the label text from "hot precision" to "Omar precision". (The `/api/admin/omar-phase` route spreads `...progress`, so the renamed field flows through automatically.)

- [ ] **Step 4: Run it, verify it PASSES**

Run: `npx vitest run tests/ai/phase.test.ts --no-file-parallelism`
Then `npm run build` to confirm `OmarRoadmap.tsx` + the route still typecheck.
Expected: PASS + clean build.

- [ ] **Step 5: Commit**

```bash
git add lib/ai/phase.ts components/admin/intelligence/OmarRoadmap.tsx tests/ai/phase.test.ts
git commit -m "feat(intel): phase advancement uses decoupled Omar precision"
```

---

## Task 6: Persist the new fields in the outcome API

**Files:**
- Modify: `app/api/admin/inquiries/[leadId]/outcome/route.ts`

Verified via `npm run build`. The handler is a `PATCH` that already builds a dynamic `sets`/`args` update.

- [ ] **Step 1: Add validation constants** near the existing `VALID_OUTCOMES`:

```ts
const VALID_REASONS = ["won", "lost_not_qualified", "lost_execution", "lost_external", "lost_unresponsive", "nurturing"] as const;
const VALID_GRADE = ["yes", "no", "unsure"] as const;
```

- [ ] **Step 2: Extend the body type + validation.** Change the `body` type to include the new fields, and after the existing outcome validation add:

```ts
  const outcomeReason = body.outcome_reason as string | undefined;
  if (outcomeReason && !VALID_REASONS.includes(outcomeReason as (typeof VALID_REASONS)[number])) {
    return NextResponse.json({ error: `Invalid outcome_reason` }, { status: 400 });
  }
  const gradeCorrect = body.omar_grade_correct as string | undefined;
  if (gradeCorrect && !VALID_GRADE.includes(gradeCorrect as (typeof VALID_GRADE)[number])) {
    return NextResponse.json({ error: `Invalid omar_grade_correct` }, { status: 400 });
  }
```

(Update the `body` type declaration to: `{ outcome?: string; admin_notes?: string; outcome_reason?: string; omar_grade_correct?: string }`.)

- [ ] **Step 3: Persist them** — in the `sets`/`args` building block, after the `admin_notes` block add:

```ts
  if (outcomeReason) { sets.push("outcome_reason = ?"); args.push(outcomeReason); }
  if (gradeCorrect) { sets.push("omar_grade_correct = ?"); args.push(gradeCorrect); }
```

And include them in the activity-log metadata JSON (extend the existing `JSON.stringify({ outcome … })` object with `outcome_reason: outcomeReason ?? null, omar_grade_correct: gradeCorrect ?? null`).

- [ ] **Step 4: Verify the build**

Run: `npm run build`
Expected: clean compile.

- [ ] **Step 5: Commit**

```bash
git add "app/api/admin/inquiries/[leadId]/outcome/route.ts"
git commit -m "feat(intel): outcome API persists outcome_reason + omar_grade_correct"
```

---

## Task 7: Capture the fields in the admin inquiries UI

**Files:**
- Modify: `app/admin/inquiries/page.tsx`

Verified via `npm run build`. **First read the file** — it has an `Inquiry` type, an `updateOutcome(leadId, outcome)` function that PATCHes `/api/admin/inquiries/{leadId}/outcome`, and a per-row component rendering outcome buttons.

- [ ] **Step 1: Extend the row type + state**

Add to the `Inquiry` type: `outcome_reason: string | null;` and `omar_grade_correct: string | null;` (the GET that populates inquiries already does `SELECT *`-style or specific columns — if it selects specific columns, also add them there; if the API doesn't return them yet, they'll arrive as `undefined`/null which is fine for the controls' initial state).

- [ ] **Step 2: Add a combined update function** (or extend `updateOutcome`) so the row can send reason + grade. Add:

```tsx
  async function updateAttribution(
    leadId: string,
    patch: { outcome?: Inquiry["outcome"]; outcome_reason?: string; omar_grade_correct?: string },
  ) {
    setInquiries((prev) =>
      prev.map((i) => (i.lead_id === leadId ? { ...i, ...patch, outcome_updated_at: new Date().toISOString() } : i)),
    );
    try {
      await fetch(`/api/admin/inquiries/${leadId}/outcome`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(patch),
      });
    } catch {
      // optimistic update already applied; a reload re-syncs
    }
  }
```

(Keep `updateOutcome` working — it can call `updateAttribution(leadId, { outcome })`.)

- [ ] **Step 3: Render the two controls** in the row component (near the existing outcome buttons), only meaningful once an outcome is set. Add a reason `<select>` whose options are constrained by the current outcome, and a grade `<select>`:

```tsx
{/* Loss/won reason — shown when the lead is resolved */}
{i.outcome !== "pending" && (
  <select
    value={i.outcome_reason ?? ""}
    onChange={(e) => updateAttribution(i.lead_id, { outcome_reason: e.target.value })}
    className="mt-2 rounded-md border border-gray-200 text-xs px-2 py-1"
  >
    <option value="">Reason…</option>
    {(i.outcome === "converted"
      ? ["won"]
      : i.outcome === "rejected"
        ? ["lost_not_qualified", "lost_execution", "lost_external", "lost_unresponsive"]
        : ["nurturing"]
    ).map((r) => (
      <option key={r} value={r}>{r.replace(/_/g, " ")}</option>
    ))}
  </select>
)}

{/* Was Omar's grade right? — independent of the deal result */}
{i.outcome !== "pending" && (
  <select
    value={i.omar_grade_correct ?? ""}
    onChange={(e) => updateAttribution(i.lead_id, { omar_grade_correct: e.target.value })}
    className="mt-2 ml-2 rounded-md border border-gray-200 text-xs px-2 py-1"
    title="Was Omar's hot/warm/cold read correct?"
  >
    <option value="">Omar right?…</option>
    <option value="yes">Yes</option>
    <option value="no">No</option>
    <option value="unsure">Unsure</option>
  </select>
)}
```

Pass `updateAttribution` down to the row component alongside the existing `onUpdateOutcome` prop (add it to that component's props type).

- [ ] **Step 4: Verify the build**

Run: `npm run build`
Expected: clean compile.

- [ ] **Step 5: Commit**

```bash
git add app/admin/inquiries/page.tsx
git commit -m "feat(intel): inquiries UI captures outcome reason + Omar-grade verdict"
```

---

## Task 8: Surface the new data through the intelligence API

**Files:**
- Modify: `lib/intelligence/api-types.ts`
- Modify: `app/api/admin/intelligence/route.ts`

Verified via `npm run build`. **First read both files** to match the existing `IntelligenceStats` shape and how the route assembles its response (it calls the `getX` queries and returns a JSON object).

- [ ] **Step 1: Extend `IntelligenceStats` in `lib/intelligence/api-types.ts`**

Add fields (import the result types from queries or inline the shape — match the file's existing style):

```ts
  omarPrecision: {
    overall: { correct: number; wrong: number; excluded: number; precisionPct: number | null };
    byTier: Record<"hot" | "warm" | "cold", { correct: number; wrong: number; excluded: number; precisionPct: number | null }>;
  };
  lossReasons: { reason: string; count: number }[];
```

- [ ] **Step 2: Populate them in `app/api/admin/intelligence/route.ts`**

Import the new queries: `import { getOmarPrecision, getLossReasonBreakdown } from "@/lib/intelligence/queries";` (extend the existing import). In the handler, call them (mirroring how the other `getX` calls are awaited, passing the same `month` arg if present) and add `omarPrecision` + `lossReasons` to the returned JSON object.

- [ ] **Step 3: Verify the build**

Run: `npm run build`
Expected: clean compile (no type mismatch between `IntelligenceStats` and the route's response).

- [ ] **Step 4: Commit**

```bash
git add lib/intelligence/api-types.ts app/api/admin/intelligence/route.ts
git commit -m "feat(intel): intelligence API returns omarPrecision + lossReasons"
```

---

## Task 9: Dashboard — precision card + loss-reasons panel + relabel

**Files:**
- Create: `components/admin/intelligence/OmarPrecisionCard.tsx`
- Create: `components/admin/intelligence/LossReasonsPanel.tsx`
- Modify: `app/admin/intelligence/page.tsx`
- Modify: `components/admin/intelligence/PrecisionCards.tsx` (relabel)

Verified via `npm run build`. **First read** `app/admin/intelligence/page.tsx` (how it fetches stats + lays out cards) and `PrecisionCards.tsx` (for styling pattern + the data shape it receives).

- [ ] **Step 1: Create `OmarPrecisionCard.tsx`**

```tsx
interface OmarPrecision { correct: number; wrong: number; excluded: number; precisionPct: number | null; }

export function OmarPrecisionCard({ data }: { data: { overall: OmarPrecision } }) {
  const o = data.overall;
  return (
    <section className="rounded-xl bg-white ring-1 ring-gray-200 shadow-sm p-5">
      <h2 className="font-heading text-base font-semibold text-navy">Omar precision (attribution-adjusted)</h2>
      <p className="text-xs text-gray-500 mt-0.5">Excludes deals lost to sales execution / external factors.</p>
      <div className="mt-3 flex items-baseline gap-2">
        <span className="text-3xl font-bold text-navy">{o.precisionPct === null ? "—" : `${o.precisionPct}%`}</span>
        <span className="text-xs text-gray-500">
          {o.correct} correct · {o.wrong} wrong · {o.excluded} excluded
        </span>
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Create `LossReasonsPanel.tsx`**

```tsx
const LABEL: Record<string, string> = {
  won: "Won", lost_not_qualified: "Lost — not qualified (Omar)", lost_execution: "Lost — our execution",
  lost_external: "Lost — external", lost_unresponsive: "Lost — unresponsive", nurturing: "Nurturing",
};

export function LossReasonsPanel({ rows }: { rows: { reason: string; count: number }[] }) {
  const total = rows.reduce((s, r) => s + r.count, 0);
  return (
    <section className="rounded-xl bg-white ring-1 ring-gray-200 shadow-sm p-5">
      <h2 className="font-heading text-base font-semibold text-navy">Loss / outcome reasons</h2>
      {rows.length === 0 ? (
        <p className="text-xs text-gray-500 mt-2">No reasons recorded yet — set them when resolving leads.</p>
      ) : (
        <ul className="mt-3 space-y-1.5">
          {rows.map((r) => (
            <li key={r.reason} className="flex items-center justify-between text-sm">
              <span className="text-gray-700">{LABEL[r.reason] ?? r.reason}</span>
              <span className="font-semibold text-navy">{r.count}{total ? ` · ${Math.round((r.count / total) * 100)}%` : ""}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
```

- [ ] **Step 3: Mount them + relabel** in `app/admin/intelligence/page.tsx`: import both components and render `<OmarPrecisionCard data={data.omarPrecision} />` and `<LossReasonsPanel rows={data.lossReasons} />` (place the precision card prominently near the top; the loss-reasons panel near the re-grading matrix). In `PrecisionCards.tsx`, change its heading/labels from "precision" to **"Sales conversion by predicted tier"** so it's clearly the funnel metric, not Omar's accuracy.

- [ ] **Step 4: Verify the build**

Run: `npm run build`
Expected: clean compile; `/admin/intelligence` includes the new card + panel.

- [ ] **Step 5: Commit**

```bash
git add components/admin/intelligence/OmarPrecisionCard.tsx components/admin/intelligence/LossReasonsPanel.tsx app/admin/intelligence/page.tsx components/admin/intelligence/PrecisionCards.tsx
git commit -m "feat(intel): dashboard Omar-precision card + loss-reasons panel; relabel conversion"
```

---

## Task 10: Full verification + docs + finish

**Files:**
- Modify: `HANDOVER.md`, `delivery/.../output/gto-build-log.md` (workspace)

- [ ] **Step 1: Full test suite sequentially**

Run: `npm test -- --no-file-parallelism`
Expected: all green (prior suite + the new `omar-verdict`, `omar-precision`, `regrading-attribution`, `attribution-schema`, updated `phase`).

- [ ] **Step 2: Production build**

Run: `npm run build`
Expected: clean.

- [ ] **Step 3: Update docs**

- `HANDOVER.md`: bump version; note intelligence v2 (outcome attribution + decoupled precision) shipped — new lead fields, `omarVerdict`, attribution-adjusted precision card + loss-reasons panel, phase advancement now decoupled. Note the **deploy needs `npm run migrate`** (two new columns).
- `gto-build-log.md`: add an "intelligence v2" completion entry; note `[KB_GAP]` persistence is still the recommended next intelligence item.

- [ ] **Step 4: Commit**

```bash
git add HANDOVER.md
git commit -m "docs(handover): intelligence v2 — outcome attribution + decoupled precision"
```

---

## Deployment (after review)

- **Migration required:** the two new `leads` columns. Run `npm run migrate` (idempotent) then `vercel deploy --prod --cwd "<repo>"`.
- No new env vars.

---

## Self-review

**Spec coverage:**
- §4 data model → Task 1 (columns + helper).
- §5 attribution logic (`omarVerdict`) → Task 2.
- §6 queries (`getOmarPrecision`, `getLossReasonBreakdown`, attribution-aware re-grading) → Tasks 3 + 4.
- §7 phase progress decoupled → Task 5.
- §8 admin UI (API + controls) → Tasks 6 + 7.
- §9 dashboard (precision card, loss-reasons, relabel, matrix) → Tasks 4 (matrix logic) + 8 (API) + 9 (UI).
- §10 testing → per-task tests + Task 10.
- §11 migration → Deployment section + Task 10 note.
- §12 backward-compat → `omarVerdict` step-3 legacy fallback (Task 2), verified by the "untagged" test.

**Placeholder scan:** none — every code step has concrete code; UI/route tasks specify exact additions + say to read the file first to match patterns (no "TODO"/"similar to"/"add validation" hand-waves).

**Type consistency:** `OmarVerdict`/`OutcomeReason`/`GradeVerdict` defined in Task 2, used in Tasks 3/4. `OmarPrecision`/`OmarPrecisionResult` defined in Task 3, consumed in Tasks 5/8/9. `PhaseProgress.precisionPct` (renamed from `hotPrecisionPct`) defined in Task 5 and read in the same task's `OmarRoadmap.tsx` edit. `getOmarPrecision`/`getLossReasonBreakdown` signatures match between definition (Task 3) and callers (Tasks 5/8). The `outcome_reason`/`omar_grade_correct` column names are identical across schema (Task 1), `omarVerdict` (Task 2), queries (Tasks 3/4), API (Task 6), and UI (Task 7).

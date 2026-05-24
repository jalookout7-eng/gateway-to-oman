# Intelligence v2 — Outcome Attribution + Decoupled Omar Precision — Design Spec

**Date:** 2026-05-25
**Status:** Approved (design) — pending plan
**Author:** JA / JALAI
**Builds on:** `docs/superpowers/specs/2026-05-21-intelligence-dashboard-design.md` (v1) and the ⟳ REVISIT flag recorded when v1 chose "effective tier = auto-from-outcome".

---

## 1. Context & problem

The v1 intelligence dashboard infers Omar's qualification accuracy purely from each lead's **`outcome`** (`lib/intelligence/effective-tier.ts`: converted→hot, contacted/nurture→warm, rejected→cold, pending→excluded). That single field **conflates three independent things**:

1. **Omar's qualification accuracy** — was this genuinely a hot/warm/cold lead?
2. **Sales execution** — did the human follow up fast and serve them well?
3. **External factors** — visa denied, financing fell through, family changed their mind, lost to a competitor.

Consequence: a **genuinely-hot lead lost to poor/slow sales follow-up** is recorded as Omar being *wrong* (a false "hot"), unfairly lowering his precision and potentially blocking phase advancement for something outside his control. The dashboard cannot today distinguish "Omar mis-graded" from "Omar was right, the deal failed downstream."

This spec decouples **Omar's accuracy (a statement about the lead)** from **the deal outcome (a result many actors influence)** by capturing attribution at close, and recomputing precision accordingly.

## 2. Goals / non-goals

**Goals**
1. Capture a structured **`outcome_reason`** when a lead is resolved (attribution).
2. Capture an explicit **`omar_grade_correct`** verdict (yes/no/unsure) — the human ground-truth for Omar's grade, independent of whether the deal closed.
3. Recompute **Omar precision** to use the grade verdict as ground truth and exclude non-Omar losses.
4. Keep **conversion rate** as a *separate* sales-funnel metric (so a bad sales month is visible as a sales finding, not an Omar finding).
5. Make the **re-grading matrix attribution-aware** (don't show a hot-lost-to-execution lead as "demoted to cold").
6. Add a **loss-reason breakdown** to the dashboard.
7. **Phase advancement** keys off the decoupled Omar precision.
8. **Graceful backward-compatibility:** untagged historical leads fall back to v1 outcome-inference; the metric sharpens as admins tag.

**Non-goals**
- No auto-fine-tuning / online learning.
- No change to the deterministic `scoreLead` model.
- KB-gap persistence — adjacent/related, but its own change.
- No new "salesperson" role — admins set these via the existing lead/outcome UI.

## 3. Decisions (confirmed)

- **Loss-reason taxonomy (6 values):** `won`, `lost_not_qualified`, `lost_execution`, `lost_external`, `lost_unresponsive`, `nurturing`.
- **Grade confirmation:** explicit `omar_grade_correct` ∈ {`yes`, `no`, `unsure`}, separate from outcome.

## 4. Data model

Two new nullable columns on `leads` (idempotent `ALTER TABLE … ADD COLUMN`; the migrate runner already skips "duplicate column"):

```sql
ALTER TABLE leads ADD COLUMN outcome_reason TEXT;       -- attribution, set at resolution
ALTER TABLE leads ADD COLUMN omar_grade_correct TEXT;   -- 'yes' | 'no' | 'unsure'
```

- **`outcome` stays unchanged** (`pending | contacted | converted | rejected | nurture`) — it remains the funnel stage.
- **`outcome_reason`** refines/attributes the resolution. Allowed values + the `outcome` they pair with (the admin UI constrains the dropdown by current outcome):

  | `outcome_reason` | Pairs with `outcome` | Omar attribution |
  |---|---|---|
  | `won` | converted | counts as Omar-correct for hot/warm |
  | `lost_not_qualified` | rejected | **Omar-wrong** (true over-grade) |
  | `lost_execution` | rejected | **excluded** (sales fault, not Omar) |
  | `lost_external` | rejected | **excluded** (visa/financing/family/competitor) |
  | `lost_unresponsive` | rejected | **excluded** (ghosted despite good service) |
  | `nurturing` | contacted / nurture | **excluded** (not resolved yet) |

- **`omar_grade_correct`** is the override ground-truth, set independently: did Omar's hot/warm/cold read match reality, regardless of close?

TypeScript types (extend the lead shape used by intelligence):

```ts
export type OutcomeReason =
  | "won" | "lost_not_qualified" | "lost_execution"
  | "lost_external" | "lost_unresponsive" | "nurturing";
export type GradeVerdict = "yes" | "no" | "unsure";
```

## 5. Attribution logic (the core)

New pure helpers in `lib/intelligence/effective-tier.ts` (keep the existing `outcomeToEffectiveTier`/`isResolved`/`movementOf` for the funnel views; add the attribution layer):

```ts
export type OmarVerdict = "correct" | "wrong" | "excluded";

/**
 * How a resolved lead should count toward OMAR's precision — decoupled from the deal.
 * Precedence:
 *   1. Explicit omar_grade_correct wins:  yes→correct, no→wrong, unsure→excluded.
 *   2. Else attribute by outcome_reason:
 *        won                → correct
 *        lost_not_qualified → wrong
 *        lost_execution | lost_external | lost_unresponsive | nurturing → excluded
 *   3. Else (both null — legacy leads) fall back to v1 outcome inference:
 *        outcome matches predicted effective tier → correct; contradicts → wrong; pending → excluded.
 */
export function omarVerdict(input: {
  predicted: Tier;                 // qualification at capture (hot/warm/cold)
  outcome: string;
  outcomeReason?: string | null;
  omarGradeCorrect?: string | null;
}): OmarVerdict;
```

- **Omar precision** = `correct / (correct + wrong)` over resolved leads; `excluded` leaves the denominator (so sales/external losses never count against Omar).
- **Conversion rate** = `converted / total` — unchanged, reported separately and clearly labeled as funnel/sales.

## 6. Queries (`lib/intelligence/queries.ts`)

- **New** `getOmarPrecision(db, month?)` → per-tier + overall `{ correct, wrong, excluded, precisionPct }` using `omarVerdict`. (This becomes the headline "Omar accuracy" metric.)
- **New** `getLossReasonBreakdown(db, month?)` → counts per `outcome_reason` (so you see where deals die: Omar vs execution vs external vs unresponsive).
- **Keep** `getTierPrecision` (converted/engaged per predicted tier) but **relabel its dashboard usage as "Sales conversion by predicted tier"** — it's a funnel metric, not Omar's accuracy.
- **Revise** `getReGradingMatrix` to be attribution-aware: a lead with verdict `excluded` is left out of the matrix (or shown in an "excluded (not Omar)" column), so a hot-lost-to-execution lead is **not** rendered as "demoted to cold."

## 7. Phase progress (`lib/ai/phase.ts`)

`getPhaseProgress` currently derives the gating precision from `getTierPrecision` hot `convertedPct`. **Change it to use `getOmarPrecision`** (decoupled), so phase advancement reflects Omar's true qualification accuracy — not a good/bad sales month. `resolvedLeads` should count only verdict-eligible leads (`correct + wrong`).

## 8. Admin UI

When an admin resolves a lead, capture the two new fields. Touch points:
- **API:** `app/api/admin/inquiries/[leadId]/outcome/route.ts` (and any other place `outcome` is written, e.g. leads CRUD) — accept + persist `outcome_reason` + `omar_grade_correct` alongside `outcome`. Validate values against the enums.
- **UI:** the lead outcome controls (admin leads page / lead detail / inquiries) gain:
  - an **`outcome_reason`** dropdown, its options constrained by the chosen `outcome` (e.g. `converted`→`won`; `rejected`→the four `lost_*`; `nurture`/`contacted`→`nurturing`);
  - an **`omar_grade_correct`** selector (Yes / No / Unsure) — phrased "Was Omar's hot/warm/cold read correct?".
- Both optional, but prompt the admin to set them at resolution (they power the learning loop).

## 9. Dashboard UI (`/admin/intelligence`)

- **New headline card: "Omar precision (attribution-adjusted)"** — from `getOmarPrecision`, with `correct / wrong / excluded` counts so it's transparent *why* the number is what it is.
- **Relabel** the existing precision view to "Sales conversion by predicted tier" (it's the funnel).
- **New "Loss reasons" panel** — breakdown from `getLossReasonBreakdown` (Omar mis-grade vs execution vs external vs unresponsive vs nurturing).
- Re-grading matrix updated per §6.
- The Omar Roadmap panel's precision figure now reflects the decoupled metric (via `getPhaseProgress`).

## 10. Testing

Pure-function + query tests (Vitest, run `--no-file-parallelism`):
- `omarVerdict`: every combination — explicit `yes/no/unsure` overrides; reason-based attribution (`won`→correct, `lost_not_qualified`→wrong, `lost_execution`/`lost_external`/`lost_unresponsive`/`nurturing`→excluded); legacy fallback when both null.
- **Key regression test:** a `hot` lead with `outcome=rejected` + `outcome_reason=lost_execution` ⇒ `excluded` (NOT counted wrong) — the exact bug this spec fixes.
- `getOmarPrecision`: excluded leads leave the denominator; grade-correct override respected.
- `getLossReasonBreakdown`: correct counts.
- `getReGradingMatrix`: excluded leads omitted/segregated.
- `getPhaseProgress`: uses decoupled precision.
- Extend `tests/intelligence/helpers.ts` `seedLead` to accept `outcomeReason` + `omarGradeCorrect`.

## 11. Migration / deploy

- Add the two `ALTER TABLE` lines to `lib/db/schema.sql`; run `npm run migrate` (idempotent) at deploy, then `vercel deploy --prod`.
- No backfill required — null fields fall back to v1 inference (§5 precedence step 3).

## 12. Backward compatibility & rollout

- Historical leads (null reason/verdict) behave exactly as v1 until tagged → no metric regression on day one.
- As admins tag new resolutions, Omar precision sharpens and the loss-reason panel populates.
- Optional follow-up: a one-pager note explaining the new metric to whoever reads the monthly review.

## 13. Out of scope (this spec)
- `[KB_GAP]` persistence (adjacent; recommend as the next intelligence item).
- Automated learning / fine-tuning.
- Salesperson role / per-user attribution.

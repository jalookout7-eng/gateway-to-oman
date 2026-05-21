# Intelligence Dashboard — Design Spec

**Date:** 2026-05-21
**Project:** Gateway to Oman (`gateway-to-oman`)
**Status:** Approved design — ready for implementation plan
**Author:** JA + Claude (brainstorm)

## Context

Gateway to Oman runs a *manual* monthly intelligence process: JA exports lead
data from the backend, runs the 10-stage analysis in
`intelligence/prompts/monthly-analysis-prompt.md`, hand-writes a rolling
`gto-intelligence-asset.md`, and produces a one-page summary for Ahmed that
justifies the AED 500/month retainer. The platform already captures the raw
material on every lead (Layer 3 fields: `lead_score`, `qualification` tier,
`score_breakdown`, `source`, `outcome`, `session_duration_seconds`, etc.), but
turning it into insight is all by hand.

This dashboard automates the **data pull + surfacing** half of that process so JA
spends time on judgment, not data wrangling. It is an **internal tool for JA**,
not client-facing — Ahmed still receives the one-page summary JA distills and
edits. The existing `/admin` dashboard covers basic operational stats; this is
the *calibration & learning* layer that sits beside it.

The system is at **Month 0** (no real lead outcomes yet), so every data view
must degrade to a graceful empty state and fill in as leads accumulate.

## Scope

**v1 (this spec):**
- **Group A — Calibration core:** per-tier precision, tier re-grading matrix,
  score-category calibration, movement summary.
- **Group D — System state & workflow:** Omar active version + changelog, data
  coverage tracker, editable hypotheses & confirmed learnings.
- **One-pager export:** template-only monthly summary, print-ready + copy-Markdown.

**Deferred to v2 (explicitly out of scope):**
- Group B — funnel & conversion trends (overlaps existing `/admin`; add time-trend later).
- Group C — source quality, session-duration vs outcome, KB-topic demand
  (needs ~a month of real traffic; KB-topic ties into the Omar phasing thread).
- Manual tier re-grade / override (see "Effective tier" below — revisit flag).
- AI-generated one-pager narrative; real server-side PDF generation.
- Any Ahmed-facing publish workflow.

## Architecture

On-demand SQL aggregation over the `leads` table, mirroring the existing
`/api/admin/stats` pattern. No snapshots, no cron, no new infra (snapshots are a
v2 option once there's history). Reuses the existing admin look (navy `#1A1A2E` /
gold `#C99B3C`, Bodoni Moda + Jost), admin card/table styles, Recharts, `getDb`,
and `requireAuth`. Visual direction: the "Data-Dense Dashboard" pattern (KPI
cards, tight grid, tables, hover tooltips, row highlight, month filter).

**New files**
| File | Purpose |
|------|---------|
| `app/admin/intelligence/page.tsx` | Dashboard page (server component) |
| `app/admin/intelligence/one-pager/page.tsx` | Print-styled one-pager (client, editable) |
| `app/api/admin/intelligence/route.ts` | GET calibration + coverage (requireAuth) |
| `app/api/admin/intelligence/notes/route.ts` | GET/POST/PATCH/DELETE notes (requireAuth) |
| `lib/intelligence/effective-tier.ts` | Pure outcome→tier mapping + helpers |
| `lib/intelligence/queries.ts` | SQL aggregation (precision, matrix, calibration, coverage) |
| `lib/intelligence/notes.ts` | Notes CRUD over `intelligence_notes` |
| `lib/ai/version.ts` | `OMAR_VERSION` + `OMAR_CHANGELOG` |
| `components/admin/intelligence/*` | Matrix, calibration bars, precision cards, notes list, version/coverage cards |

**Modified files**
| File | Change |
|------|--------|
| `lib/db/schema.sql` | Add `intelligence_notes` table |
| `app/admin/layout.tsx` | Add "Intelligence" to the desktop sidebar (mobile bottom nav stays ≤5; reachable via sidebar) |

## Data model

### Effective tier (v1 — auto-derived from outcome)

The matrix and precision compare Omar's **predicted tier** (`leads.qualification`)
against an **effective tier** inferred from the resolved `outcome`:

```
outcome              → effective tier
  converted            → hot
  contacted            → warm
  nurture              → warm
  rejected             → cold
  pending              → (excluded — no ground truth yet)
```

A lead is **resolved** when `outcome != 'pending'`. Only resolved leads enter
calibration. The mapping lives in one pure module (`effective-tier.ts`) so it is
unit-testable and easy to change.

> ⟳ **Revisit flag:** v1 is fully automatic. If the outcome-inference proves too
> coarse, upgrade to an explicit admin re-grade and/or a manual override that
> wins when set (brainstorm option 3). Recorded in `gto-build-log.md` Thread 2.

### `intelligence_notes` table

```sql
CREATE TABLE IF NOT EXISTS intelligence_notes (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  kind TEXT NOT NULL CHECK (kind IN ('hypothesis','learning','analysis_run')),
  title TEXT NOT NULL,
  body TEXT,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','confirmed','archived')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_intel_notes_kind ON intelligence_notes(kind, status);
```

`analysis_run` rows double as the workflow tracker (when the monthly analysis was
last done / is next due).

## Group A — Calibration core

**Precision panel** — per predicted tier (hot/warm/cold), two figures over
*resolved* leads of that tier:
- **strict** = `outcome = converted` / resolved
- **engaged** = `outcome ∈ {converted, contacted}` / resolved

**Tier re-grading matrix** — 3×3 grid, rows = predicted tier (hot→cold top to
bottom), columns = effective tier (hot→cold left to right), cell = lead count.
- diagonal = **held**; below-left of diagonal = **promoted**; above-right = **demoted**.
- colour: promoted green, held gold, demoted red (plus value labels — never colour alone).
- each cell links to the filtered lead list (predicted=T, effective=E).
- table is itself the accessible fallback.

**Movement summary** — per predicted tier, share promoted / held / demoted (resolved leads of that tier).

**Score-category calibration** — for the 5 categories (`budget`, `timeline`,
`decisionAuthority`, `objectiveClarity`, `mindsetIndicator`, parsed from
`leads.score_breakdown` JSON), average points among **success**
(`outcome ∈ {converted, contacted}`) vs **non-success** (`outcome ∈ {rejected, nurture}`).
A large gap = predictive category; a small gap = candidate for re-weighting.

**Time filter** — all-time by default; a month selector. Month-over-month deltas
appear where ≥2 periods of data exist; otherwise a "baseline month" note.

## Group D — System state & workflow

- **Omar active version + changelog** — read from `lib/ai/version.ts`
  (`OMAR_VERSION` string + `OMAR_CHANGELOG: {version, date, summary}[]`). JA bumps
  it whenever the prompt or scoring changes.
- **Data coverage** — total / resolved / pending lead counts, earliest–latest
  lead date, last `analysis_run` note, next due (last + 1 month).
- **Hypotheses & confirmed learnings** — in-app CRUD list backed by
  `intelligence_notes` (open / confirmed / archived). Mirrors the structure of
  `gto-intelligence-asset.md` so entries lift straight into the rolling asset.

## One-pager export (template-only)

A `/admin/intelligence/one-pager` view that fills a fixed template with **exact
numbers pulled from the data** and provides **editable prose fields** where JA
writes the narrative. Sections (mirrors Stage 9 of the monthly-analysis prompt):

1. Header — period, "Prepared for Ahmed".
2. **What happened** — lead volume, conversion rate, top source *(numbers auto)*.
3. **How Omar performed** — precision per tier *(auto)* + JA prose.
4. **Conversion change** — this period vs previous, delta *(auto; "baseline" when <2 periods)*.
5. **What changed in the system** — Omar version/changelog entries in the period *(auto)*.
6. **What we're learning** — 1–2 confirmed learnings JA selects from notes.
7. **What to expect next** — JA prose.

Export: **print-ready styled page** ("Save as PDF" from the browser) + a **"Copy
as Markdown"** button (drops into the `gto-intelligence-asset.md` workflow). No
new dependencies. Numbers are never AI-generated or hand-typed — always injected
from the query layer.

## Empty states (Month 0)

Every data-driven panel (precision, matrix, calibration, movement, coverage)
renders a helpful empty state ("Not enough data yet — needs leads with resolved
outcomes") rather than blank space or a zeroed chart. Group D's version and notes
work immediately with no lead data.

## Non-goals

Ahmed-facing publishing; AI narrative; server-side PDF; Groups B & C; manual
re-grade/override; editing the `intelligence/` workspace markdown from the app
(the dashboard's notes are the in-app quick layer; the markdown asset stays JA's
deep working doc).

## Verification

- **Unit tests** (vitest, in-memory SQLite, mirroring `tests/db/schema-section-c.test.ts`):
  - `effective-tier.ts` — every outcome maps to the right tier; pending excluded.
  - `queries.ts` — seed sample `leads` with known predicted tiers + outcomes;
    assert precision (strict/engaged), the 3×3 matrix counts (held/promoted/demoted),
    and category-calibration averages.
  - `notes.ts` — create / list / update status / delete.
- **Schema** — `intelligence_notes` present after migration (extend schema test).
- **Build/typecheck** — `npm test` green, `npm run build` exit 0.
- **Manual** — load `/admin/intelligence` at Month 0 (empty states); seed a
  handful of leads with varied outcomes; confirm matrix cells, precision figures,
  and calibration bars populate; open the one-pager, verify auto numbers, edit
  prose, print preview + copy-markdown.

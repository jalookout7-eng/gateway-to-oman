import type { Client } from "@libsql/client";
import { type Tier, outcomeToEffectiveTier, isResolved, movementOf, omarVerdict } from "./effective-tier";

const TIERS: Tier[] = ["hot", "warm", "cold"];
const ENGAGED = new Set(["converted", "contacted"]);

/** Build the optional month filter ("YYYY-MM") as a SQL fragment + args. */
function monthClause(month?: string): { where: string; args: string[] } {
  if (!month) return { where: "", args: [] };
  return { where: " WHERE created_at LIKE ?", args: [month + "%"] };
}

// ---------------------------------------------------------------------------
// Tier Precision
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Re-grading Matrix
// ---------------------------------------------------------------------------

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
    const predicted = String(r.qualification);
    if (!(TIERS as string[]).includes(predicted)) continue;
    const tier = predicted as Tier;
    const effective = outcomeToEffectiveTier(String(r.outcome));
    if (!effective) continue; // pending excluded
    matrix[tier][effective] += 1;
    summary[tier][movementOf(tier, effective)] += 1;
    summary[tier].total += 1;
  }
  return { matrix, summary };
}

// ---------------------------------------------------------------------------
// Category Calibration
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Data Coverage, Conversion Stats, Top Source
// ---------------------------------------------------------------------------

export interface DataCoverage { total: number; resolved: number; pending: number; earliest: string | null; latest: string | null; }

export async function getDataCoverage(db: Client, month?: string): Promise<DataCoverage> {
  const { where, args } = monthClause(month);
  const res = await db.execute({ sql: `SELECT outcome, created_at FROM leads${where}`, args });
  const rows = res.rows;
  const dates = rows
    .map((r) => r.created_at)
    .filter((v): v is string => typeof v === "string" && v.length > 0)
    .sort();
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

// ---------------------------------------------------------------------------
// Omar Precision (attribution-adjusted)
// ---------------------------------------------------------------------------

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

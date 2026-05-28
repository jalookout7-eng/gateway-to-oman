/**
 * Lead scoring — v2 (Notes 3 item 4 — 2026-05-28).
 *
 * Background: v1 was calibrated for the immigration/big-investment segment
 * (100K+ OMR budgets). When the marketplace shipped, realistic café/laundry
 * buyers with 5–15K OMR budgets were being stamped Cold because the budget
 * curve flattened anything under 25K to 5pts and an early-price penalty
 * docked them another 10. The result: hot leads narratively, cold by tier.
 *
 * v2 recalibration (per JA):
 *   - Both surfaces: ≥20K=30, ≥5K=25, any concrete mention=15, none=0
 *   - Decision-authority floor for "unclear" raised 8→10 (most marketplace
 *     buyers are solo decision-makers; "unclear" defaults closer to that)
 *   - Objective clarity for "clear sector + plan" raised 15→20; "general
 *     intent" raised 8→12 — clear intent is the strongest non-budget signal
 *   - Early-price penalty REMOVED — talking about price isn't anti-buyer; on
 *     a marketplace it's the whole point. (Kept in the breakdown as 0 for
 *     wire-format compat with rows persisted before this change.)
 *   - Thresholds eased: hot ≥70 (was 75), warm ≥40 (was 45)
 *
 * 100-point model: Budget (30) + Timeline (25) + Decision Authority (15)
 *                + Objective Clarity (20) + Mindset (15) = max 105 → cap 100.
 *
 * Capture principle (unchanged): a lead is never disqualified. Cold = captured,
 * nurtured.
 */

export type ScoreTier = "hot" | "warm" | "cold";
export type ScoringSurface = "main" | "businesses";

export interface ScoreBreakdown {
  budget: number;
  timeline: number;
  decisionAuthority: number;
  objectiveClarity: number;
  mindsetIndicator: number;
  earlyPricePenalty: number;
  jobSeekerCapped: boolean;
  total: number;
  tier: ScoreTier;
  notes: string[];
  /** Recorded so we can tell at-a-glance which surface's curve produced this score. */
  surface: ScoringSurface;
}

export interface ScoringInput {
  /** Concatenated transcript — only the visitor's messages, joined with '\n'. */
  visitorText: string;
  /** Full transcript (visitor + assistant) for context — used for mindset detection. */
  fullText?: string;
  segment?: string | null;
  interests?: string | null;
  /** Ordered list of the visitor's messages — kept on the input shape for backwards
   *  compatibility (v1 used it for the early-price penalty; v2 ignores it). */
  visitorMessages?: string[];
  /** Which surface the lead was captured from. Defaults to "main". Currently
   *  surfaced in the breakdown for analytics; the curves themselves are
   *  unified across surfaces per Notes 3 item 4. */
  surface?: ScoringSurface;
}

const OMR_NUMBER_RE = /(?:omr|or|rial)?\s*([0-9][0-9,.]{1,15})\s*(k|thousand|m|million|mil|omr|or|rial)?/gi;

/**
 * Parses any OMR-sized numbers in the text and returns the largest one in OMR.
 * Handles "100k", "50,000", "OMR 200k", "1m", "2 million", "150K OMR".
 */
function extractMaxOmr(text: string): number {
  let max = 0;
  let m: RegExpExecArray | null;
  OMR_NUMBER_RE.lastIndex = 0;
  while ((m = OMR_NUMBER_RE.exec(text)) !== null) {
    const raw = m[1].replace(/,/g, "");
    const num = parseFloat(raw);
    if (!Number.isFinite(num)) continue;
    const suffix = (m[2] ?? "").toLowerCase();
    let value = num;
    if (suffix === "k" || suffix === "thousand") value = num * 1_000;
    else if (suffix === "m" || suffix === "million" || suffix === "mil") value = num * 1_000_000;
    if (value < 1_000 && !suffix) continue; // ignore "I'm 35" style stray numbers
    if (value > max) max = value;
  }
  return max;
}

function scoreBudget(text: string): { points: number; reason: string } {
  const max = extractMaxOmr(text);
  // v2 curve — uniform across surfaces. A buyer with even a small concrete
  // budget is far more qualified than a window-shopper, so the "any
  // concrete mention" floor is 15 (was 5 in v1).
  if (max >= 20_000) return { points: 30, reason: `budget ≥20K OMR (${max})` };
  if (max >= 5_000) return { points: 25, reason: `budget 5–20K OMR (${max})` };
  if (max > 0) return { points: 15, reason: `budget under 5K OMR (${max})` };
  return { points: 0, reason: "no budget mentioned" };
}

function scoreTimeline(text: string): { points: number; reason: string } {
  const lower = text.toLowerCase();
  if (/(this week|next week|asap|as soon as possible|urgent|right now|by (?:end of )?(?:this|next) month|in (?:a|one|two|three|few) (?:week|month)s?)/i.test(lower)) {
    return { points: 25, reason: "timeline within 3 months" };
  }
  if (/(in (?:four|five|six|three|3|4|5|6) months|q[1-4]|by (?:summer|autumn|winter|spring)|in (?:the )?(?:next )?few months|by (?:march|april|may|june|july|august|september|october|november|december|january|february))/i.test(lower)) {
    return { points: 20, reason: "timeline 3–6 months" };
  }
  if (/(within (?:a |the )?year|in (?:a|one) year|next year|in 12 months|6\s*-?\s*12 months)/i.test(lower)) {
    return { points: 12, reason: "timeline 6–12 months" };
  }
  return { points: 0, reason: "no timeline" };
}

function scoreDecisionAuthority(text: string): { points: number; reason: string } {
  const lower = text.toLowerCase();
  if (/(my (?:business )?partner|board|committee|investors? need|need to check with|discuss with the team|run it by|approval from|need sign[\s-]?off)/i.test(lower)) {
    return { points: 0, reason: "committee / not DM" };
  }
  if (/(my (?:wife|husband|spouse|family|partner)|we['']?re|we are|together with|jointly)/i.test(lower)) {
    return { points: 10, reason: "with spouse/partner" };
  }
  if (/(i decide|my decision|my call|i['']m the (?:owner|founder|ceo|decision maker)|i'?ll be (?:the one|deciding))/i.test(lower)) {
    return { points: 15, reason: "primary DM" };
  }
  // v2: raised from 8 → 10. Most marketplace buyers are solo; "unclear"
  // should not penalise them as if they were a committee.
  return { points: 10, reason: "DM unclear → assume soft DM" };
}

function scoreObjectiveClarity(text: string, interests?: string | null): { points: number; reason: string } {
  const lower = (text + " " + (interests ?? "")).toLowerCase();
  const sectorHit = /(f\s*&\s*b|restaurant|cafe|gym|laundry|travel agen|industrial|factory|warehouse|clinic|hospital|pharmacy|salon|retail|e-?commerce|hospitality|hotel|real estate|itc|digital bank|fintech|recruitment|consultancy|construction|logistics|education|school|nursery)/i.test(lower);
  const planHit = /(acquire|buying|set up|setup|incorporate|expand|relocate|register|open a|invest (?:omr|or|in)|portfolio)/i.test(lower);
  const exploringHit = /(just (?:exploring|browsing|looking|gathering)|not sure yet|early (?:stages?|days)|window[\s-]?shopping)/i.test(lower);
  // v2: clear sector + plan boosted 15 → 20. Clear intent is the single
  // strongest non-budget signal — a visitor who knows the sector AND the
  // action they want to take is most of the way to qualified.
  if (sectorHit && planHit) return { points: 20, reason: "clear sector + plan" };
  if (sectorHit || planHit) return { points: 12, reason: "general intent" };
  if (exploringHit) return { points: 0, reason: "exploratory" };
  return { points: 0, reason: "objective unclear" };
}

function scoreMindset(text: string): { points: number; reason: string } {
  const lower = text.toLowerCase();
  const compliance = /(legal structure|ownership rules|tax|compliance|regulation|cr (?:registration)?|company setup|due diligence|escrow|residency visa|investor visa|local partner|sole proprietor|free zone)/i;
  if (compliance.test(lower)) return { points: 15, reason: "compliance-oriented mindset" };
  // v2: removed the "price-focused" penalty branch. Talking about price is
  // a normal qualifying signal, not anti-quality. Neutral is the default.
  return { points: 0, reason: "mindset neutral" };
}

function isJobSeeker(text: string, segment?: string | null): boolean {
  if (segment === "professional") return /(find (?:a )?(?:work|job)|looking for (?:a )?(?:work|job)|cv|recruit me|hire me|employment)/i.test(text);
  return /(looking for (?:a )?job|find (?:a )?(?:work|job)|recruit me|hire me|need (?:a )?job)/i.test(text);
}

export function scoreLead(input: ScoringInput): ScoreBreakdown {
  const visitorText = input.visitorText ?? "";
  const surface: ScoringSurface = input.surface ?? "main";

  const budget = scoreBudget(visitorText);
  const timeline = scoreTimeline(visitorText);
  const da = scoreDecisionAuthority(visitorText);
  const oc = scoreObjectiveClarity(visitorText, input.interests);
  const mind = scoreMindset(visitorText);

  let total = budget.points + timeline.points + da.points + oc.points + mind.points;
  const notes = [budget.reason, timeline.reason, da.reason, oc.reason, mind.reason];

  const jobSeekerCapped = isJobSeeker(visitorText, input.segment);
  if (jobSeekerCapped) {
    total = Math.min(total, 20);
    notes.push("job-seeker filter → cap 20");
  }

  total = Math.max(0, Math.min(100, total));

  // v2 thresholds — 70/40/below (was 75/45/below).
  const tier: ScoreTier = total >= 70 ? "hot" : total >= 40 ? "warm" : "cold";

  return {
    budget: budget.points,
    timeline: timeline.points,
    decisionAuthority: da.points,
    objectiveClarity: oc.points,
    mindsetIndicator: mind.points,
    earlyPricePenalty: 0, // retired in v2; kept on the wire format for compat
    jobSeekerCapped,
    total,
    tier,
    notes,
    surface,
  };
}

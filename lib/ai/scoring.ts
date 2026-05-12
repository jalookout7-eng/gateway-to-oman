/**
 * Lead scoring per delivery/shared/gto-lead-scoring-v1.md.
 * Programmatic pattern matching over the conversation transcript.
 * 100-point model: Budget (30) + Timeline (25) + Decision Authority (15)
 *                + Objective Clarity (15) + Mindset (15).
 * Tier: 75-100 = hot, 45-74 = warm, 0-44 = cold.
 * Capture principle: a lead is never disqualified. Cold = captured, nurtured.
 */

export type ScoreTier = "hot" | "warm" | "cold";

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
}

export interface ScoringInput {
  /** Concatenated transcript — only the visitor's messages, joined with '\n'. */
  visitorText: string;
  /** Full transcript (visitor + assistant) for context — used for mindset detection. */
  fullText?: string;
  segment?: string | null;
  interests?: string | null;
  /** Ordered list of the visitor's messages — used for early-price detection (first 3). */
  visitorMessages?: string[];
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
  if (max >= 100_000) return { points: 30, reason: `budget≥100k OMR (${max})` };
  if (max >= 50_000) return { points: 25, reason: `budget 50–100k OMR (${max})` };
  if (max >= 25_000) return { points: 15, reason: `budget 25–50k OMR (${max})` };
  if (max > 0) return { points: 5, reason: `budget under 25k OMR (${max})` };
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
    return { points: 10, reason: "timeline 6–12 months" };
  }
  return { points: 0, reason: "no timeline" };
}

function scoreDecisionAuthority(text: string): { points: number; reason: string } {
  const lower = text.toLowerCase();
  if (/(my (?:business )?partner|board|committee|investors? need|need to check with|discuss with the team|run it by|approval from|need sign[\s-]?off)/i.test(lower)) {
    return { points: 0, reason: "committee / not DM" };
  }
  if (/(my (?:wife|husband|spouse|family|partner)|we['']?re|we are|together with|jointly)/i.test(lower)) {
    return { points: 8, reason: "with spouse/partner" };
  }
  if (/(i decide|my decision|my call|i['']m the (?:owner|founder|ceo|decision maker)|i'?ll be (?:the one|deciding))/i.test(lower)) {
    return { points: 15, reason: "primary DM" };
  }
  return { points: 8, reason: "DM unclear → assume soft DM" };
}

function scoreObjectiveClarity(text: string, interests?: string | null): { points: number; reason: string } {
  const lower = (text + " " + (interests ?? "")).toLowerCase();
  const sectorHit = /(f\s*&\s*b|restaurant|cafe|gym|laundry|travel agen|industrial|factory|warehouse|clinic|hospital|pharmacy|salon|retail|e-?commerce|hospitality|hotel|real estate|itc|digital bank|fintech|recruitment|consultancy|construction|logistics|education|school|nursery)/i.test(lower);
  const planHit = /(acquire|buying|set up|setup|incorporate|expand|relocate|register|open a|invest (?:omr|or|in)|portfolio)/i.test(lower);
  const exploringHit = /(just (?:exploring|browsing|looking|gathering)|not sure yet|early (?:stages?|days)|window[\s-]?shopping)/i.test(lower);
  if (sectorHit && planHit) return { points: 15, reason: "clear sector + plan" };
  if (sectorHit || planHit) return { points: 8, reason: "general intent" };
  if (exploringHit) return { points: 0, reason: "exploratory" };
  return { points: 0, reason: "objective unclear" };
}

function scoreMindset(text: string): { points: number; reason: string } {
  const lower = text.toLowerCase();
  const compliance = /(legal structure|ownership rules|tax|compliance|regulation|cr (?:registration)?|company setup|due diligence|escrow|residency visa|investor visa|local partner|sole proprietor|free zone)/i;
  if (compliance.test(lower)) return { points: 15, reason: "compliance-oriented mindset" };
  if (/(discount|cheaper|negotiat|reduce (?:the )?price|lower price|best price|haggle)/i.test(lower)) {
    return { points: 0, reason: "price-focused" };
  }
  return { points: 0, reason: "mindset neutral" };
}

function earlyPricePenalty(visitorMessages: string[]): { penalty: number; reason: string } {
  const first3 = visitorMessages.slice(0, 3).join(" ").toLowerCase();
  if (/(price|cost|how much|fees?|charge|expensive|cheap|budget)/i.test(first3)) {
    return { penalty: 10, reason: "price asked in first 3 msgs" };
  }
  return { penalty: 0, reason: "" };
}

function isJobSeeker(text: string, segment?: string | null): boolean {
  if (segment === "professional") return /(find (?:a )?(?:work|job)|looking for (?:a )?(?:work|job)|cv|recruit me|hire me|employment)/i.test(text);
  return /(looking for (?:a )?job|find (?:a )?(?:work|job)|recruit me|hire me|need (?:a )?job)/i.test(text);
}

export function scoreLead(input: ScoringInput): ScoreBreakdown {
  const visitorText = input.visitorText ?? "";
  const visitorMessages = input.visitorMessages ?? [];

  const budget = scoreBudget(visitorText);
  const timeline = scoreTimeline(visitorText);
  const da = scoreDecisionAuthority(visitorText);
  const oc = scoreObjectiveClarity(visitorText, input.interests);
  const mind = scoreMindset(visitorText);
  const pricePen = earlyPricePenalty(visitorMessages);

  let total = budget.points + timeline.points + da.points + oc.points + mind.points - pricePen.penalty;
  const notes = [budget.reason, timeline.reason, da.reason, oc.reason, mind.reason];
  if (pricePen.penalty > 0) notes.push(pricePen.reason);

  const jobSeekerCapped = isJobSeeker(visitorText, input.segment);
  if (jobSeekerCapped) {
    total = Math.min(total, 20);
    notes.push("job-seeker filter → cap 20");
  }

  total = Math.max(0, Math.min(100, total));

  const tier: ScoreTier = total >= 75 ? "hot" : total >= 45 ? "warm" : "cold";

  return {
    budget: budget.points,
    timeline: timeline.points,
    decisionAuthority: da.points,
    objectiveClarity: oc.points,
    mindsetIndicator: mind.points,
    earlyPricePenalty: pricePen.penalty,
    jobSeekerCapped,
    total,
    tier,
    notes,
  };
}

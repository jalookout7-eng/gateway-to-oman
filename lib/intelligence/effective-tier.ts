export type Tier = "hot" | "warm" | "cold";
export type Movement = "promoted" | "held" | "demoted";

const RANK: Record<Tier, number> = { cold: 1, warm: 2, hot: 3 };

/** v1: effective tier inferred from the resolved outcome. pending/unknown -> null. */
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

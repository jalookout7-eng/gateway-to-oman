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

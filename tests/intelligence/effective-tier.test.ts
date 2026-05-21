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

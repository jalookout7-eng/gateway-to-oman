import { describe, it, expect } from "vitest";
import { pickTeaserVariant, getContextualTeaser } from "@/lib/ai/prompts";

describe("pickTeaserVariant (AWS-style fixed teaser)", () => {
  it("returns the same copy every call — the rotation is suspended", () => {
    const a = pickTeaserVariant("default");
    const b = pickTeaserVariant("default");
    expect(a.text).toBe(b.text);
    expect(a.variantId).toBe(b.variantId);
  });

  it("uses JA's approved teaser copy", () => {
    const { text } = pickTeaserVariant("default");
    expect(text).toBe(
      "Hi I can connect you with a GTO representative or answer any questions you may have",
    );
  });

  it("tags the variant id per surface so the A/B query keeps working", () => {
    expect(pickTeaserVariant("default").variantId).toBe("default-aws-1");
    expect(pickTeaserVariant("businesses").variantId).toBe("businesses-aws-1");
  });

  it("falls back to the default surface key when none is given", () => {
    expect(pickTeaserVariant().variantId).toBe("default-aws-1");
  });

  it("leaves getContextualTeaser (used elsewhere) untouched", () => {
    expect(typeof getContextualTeaser("default")).toBe("string");
    expect(getContextualTeaser("default").length).toBeGreaterThan(0);
  });
});

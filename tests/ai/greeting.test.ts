import { describe, it, expect } from "vitest";
import { getContextualGreeting, BASE_PROMPT, MAIN_SITE_VARIANT, BUSINESSES_VARIANT } from "@/lib/ai/prompts";

describe("getContextualGreeting", () => {
  it("has per-surface businesses hooks", () => {
    const biz = getContextualGreeting("businesses");
    const listings = getContextualGreeting("businesses-listings");
    expect(biz).not.toEqual(getContextualGreeting("default"));
    expect(listings).not.toEqual(getContextualGreeting("default"));
    expect(biz.length).toBeGreaterThan(0);
    expect(listings.length).toBeGreaterThan(0);
  });
  it("falls back to default for unknown keys", () => {
    expect(getContextualGreeting(undefined)).toEqual(getContextualGreeting("default"));
  });
});

describe("BASE_PROMPT no longer carries wrong hardcoded facts", () => {
  it("drops the OMAN FACTS block and its incorrect tax claim", () => {
    expect(BASE_PROMPT).not.toContain("0% corporate tax for first 5 years");
    expect(BASE_PROMPT).not.toContain("## OMAN FACTS");
  });
  it("instructs KB-grounding + new signals", () => {
    expect(BASE_PROMPT).toContain("[KB_GAP]");
    expect(BASE_PROMPT).toContain("[WHATSAPP_HANDOFF]");
  });
  it("still exports the surface variants", () => {
    expect(MAIN_SITE_VARIANT.length).toBeGreaterThan(0);
    expect(BUSINESSES_VARIANT.length).toBeGreaterThan(0);
  });
});

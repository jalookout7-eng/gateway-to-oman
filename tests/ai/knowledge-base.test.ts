import { describe, it, expect } from "vitest";
import { KB_TOPICS, BUYER_QUALIFICATION, GTO_REFERENCES } from "@/lib/ai/knowledge-base";

describe("KB_TOPICS", () => {
  it("has all 15 topics, each well-formed", () => {
    expect(KB_TOPICS).toHaveLength(15);
    for (const t of KB_TOPICS) {
      expect(t.id).toMatch(/^[a-z0-9-]+$/);
      expect(t.title.length).toBeGreaterThan(0);
      expect(t.body.length).toBeGreaterThan(40);
      expect(t.surfaces.length).toBeGreaterThan(0);
      expect(t.minPhase).toBe(1);
    }
  });
  it("ids are unique", () => {
    const ids = KB_TOPICS.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
  it("the business-sale engagement timeline is businesses-only", () => {
    const t = KB_TOPICS.find((x) => x.id === "engagement-timeline");
    expect(t?.surfaces).toEqual(["businesses"]);
  });
  it("tax facts are corrected (15% foreign-owned, no '0% for 5 years')", () => {
    const tax = KB_TOPICS.find((x) => x.id === "tax-compliance");
    expect(tax).toBeDefined();
    expect(tax!.body).toMatch(/15%/);
    expect(tax!.body.toLowerCase()).not.toContain("0% corporate tax for first 5 years");
    expect(tax!.body.toLowerCase()).not.toContain("first 5 years");
  });
  it("ownership facts are corrected (effective 2020, not 2019)", () => {
    const own = KB_TOPICS.find((x) => x.id === "ownership-structures");
    expect(own!.body).toContain("2020");
    expect(own!.body).not.toContain("2019");
  });
  it("no topic repeats the dropped/unverified claims", () => {
    const all = KB_TOPICS.map((t) => t.body).join("\n").toLowerCase();
    expect(all).not.toContain("2 billion consumers");
    expect(all).not.toContain("omr 50,000");
  });
});

describe("BUYER_QUALIFICATION", () => {
  it("is businesses-surface and has all four classifications", () => {
    expect(BUYER_QUALIFICATION.surface).toBe("businesses");
    expect(Object.keys(BUYER_QUALIFICATION.classification).sort()).toEqual(["COLD", "HOT", "JOBS", "WARM"]);
    expect(BUYER_QUALIFICATION.keyQuestion.toLowerCase()).toContain("operate");
  });
});

describe("GTO_REFERENCES", () => {
  it("carries Azizi's contact + routing links", () => {
    expect(GTO_REFERENCES.whatsappE164).toBe("96895108257");
    expect(GTO_REFERENCES.goldenVisaWaitlist).toContain("forms.gle");
    expect(GTO_REFERENCES.cvSubmission).toContain("advisorex.org");
  });
});

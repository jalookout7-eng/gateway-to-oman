// tests/ai/normalise-dashes.test.ts
import { describe, it, expect } from "vitest";
import { normaliseDashes, stripSignals } from "@/lib/ai/signals";

describe("normaliseDashes", () => {
  it("replaces a spaced em dash with a comma", () => {
    expect(normaliseDashes("Got it — so you're looking at both angles")).toBe(
      "Got it, so you're looking at both angles",
    );
  });

  it("replaces an unspaced em dash with a comma and a space", () => {
    expect(normaliseDashes("owning a business—or deploying capital")).toBe(
      "owning a business, or deploying capital",
    );
  });

  it("handles en dashes the same way", () => {
    expect(normaliseDashes("I'm Omar – happy to help")).toBe("I'm Omar, happy to help");
  });

  it("drops a trailing dash before end of string", () => {
    expect(normaliseDashes("whichever resonates —")).toBe("whichever resonates");
  });

  it("drops a dash sitting directly before terminal punctuation", () => {
    expect(normaliseDashes("that shapes what comes next —.")).toBe("that shapes what comes next.");
  });

  it("leaves hyphenated compounds alone", () => {
    expect(normaliseDashes("a follow-up with our co-founder at Al-Azizi")).toBe(
      "a follow-up with our co-founder at Al-Azizi",
    );
  });

  it("leaves text with no dashes untouched", () => {
    expect(normaliseDashes("Plain sentence with no dashes.")).toBe(
      "Plain sentence with no dashes.",
    );
  });

  it("is idempotent", () => {
    const once = normaliseDashes("Got it — so you're looking at both angles");
    expect(normaliseDashes(once)).toBe(once);
  });

  it("handles multiple dashes in one string", () => {
    expect(normaliseDashes("A — B — C")).toBe("A, B, C");
  });
});

describe("stripSignals applies dash normalisation", () => {
  it("normalises dashes in the cleaned reply", () => {
    expect(stripSignals("Got it — here's the plan")).toBe("Got it, here's the plan");
  });

  it("still strips signal markers", () => {
    const out = stripSignals("[SEGMENT:investor] Ready to help — let's begin");
    expect(out).not.toContain("[SEGMENT:");
    expect(out).not.toContain("—");
  });
});

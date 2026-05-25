// tests/intelligence/omar-verdict.test.ts
import { describe, it, expect } from "vitest";
import { omarVerdict } from "@/lib/intelligence/effective-tier";

describe("omarVerdict", () => {
  it("explicit grade verdict wins over everything", () => {
    expect(omarVerdict({ predicted: "hot", outcome: "rejected", outcomeReason: "lost_not_qualified", omarGradeCorrect: "yes" })).toBe("correct");
    expect(omarVerdict({ predicted: "hot", outcome: "converted", outcomeReason: "won", omarGradeCorrect: "no" })).toBe("wrong");
    expect(omarVerdict({ predicted: "hot", outcome: "converted", omarGradeCorrect: "unsure" })).toBe("excluded");
  });

  it("attributes by outcome_reason when no explicit verdict", () => {
    expect(omarVerdict({ predicted: "warm", outcome: "converted", outcomeReason: "won" })).toBe("correct");
    expect(omarVerdict({ predicted: "hot", outcome: "rejected", outcomeReason: "lost_not_qualified" })).toBe("wrong");
  });

  it("KEY: a hot lead lost to execution is EXCLUDED, not wrong", () => {
    expect(omarVerdict({ predicted: "hot", outcome: "rejected", outcomeReason: "lost_execution" })).toBe("excluded");
    expect(omarVerdict({ predicted: "hot", outcome: "rejected", outcomeReason: "lost_external" })).toBe("excluded");
    expect(omarVerdict({ predicted: "hot", outcome: "rejected", outcomeReason: "lost_unresponsive" })).toBe("excluded");
    expect(omarVerdict({ predicted: "warm", outcome: "contacted", outcomeReason: "nurturing" })).toBe("excluded");
  });

  it("falls back to v1 outcome inference when untagged", () => {
    expect(omarVerdict({ predicted: "hot", outcome: "converted" })).toBe("correct");
    expect(omarVerdict({ predicted: "hot", outcome: "rejected" })).toBe("wrong");
    expect(omarVerdict({ predicted: "warm", outcome: "pending" })).toBe("excluded");
  });
});

// tests/intelligence/one-pager.test.ts
import { describe, it, expect } from "vitest";
import { renderOnePagerMarkdown } from "@/lib/intelligence/one-pager";

const base = {
  period: "May 2026",
  coverage: { total: 12, resolved: 8, pending: 4, earliest: "2026-05-01 09:00:00", latest: "2026-05-28 09:00:00" },
  precision: [
    { tier: "hot" as const, resolved: 4, convertedPct: 50, engagedPct: 75 },
    { tier: "warm" as const, resolved: 3, convertedPct: 33, engagedPct: 66 },
    { tier: "cold" as const, resolved: 1, convertedPct: 0, engagedPct: 0 },
  ],
  topSource: { source: "referral", count: 5 },
  conversion: { current: { leads: 12, converted: 4, ratePct: 33 }, previous: { leads: 10, converted: 2, ratePct: 20 } },
  changelog: [{ version: "1.0", date: "2026-05", summary: "Initial model." }],
  learnings: [{ title: "Referrals convert best", body: "5/5 referrals engaged." }],
  prose: { happened: "Strong month.", omar: "Hot tier holding.", next: "Watch cold tier." },
};

describe("renderOnePagerMarkdown", () => {
  it("includes the exact numbers and the conversion delta", () => {
    const md = renderOnePagerMarkdown(base);
    expect(md).toContain("# Gateway to Oman — Intelligence Summary (May 2026)");
    expect(md).toContain("12 leads");
    expect(md).toContain("referral");
    expect(md).toContain("Hot");
    expect(md).toContain("50%"); // hot converted
    expect(md).toContain("+13"); // 33 - 20 delta
    expect(md).toContain("Referrals convert best");
  });

  it("shows a baseline note when there is no previous period", () => {
    const md = renderOnePagerMarkdown({ ...base, conversion: { current: base.conversion.current, previous: null } });
    expect(md).toContain("baseline month");
    expect(md).not.toContain("+13");
  });
});

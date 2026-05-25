// tests/intelligence/regrading-attribution.test.ts
import { describe, it, expect } from "vitest";
import { makeTestDb, seedLead } from "./helpers";
import { getReGradingMatrix } from "@/lib/intelligence/queries";

describe("getReGradingMatrix attribution", () => {
  it("excludes non-Omar losses from the demotion counts", async () => {
    const db = await makeTestDb();
    // hot lead lost to execution must NOT show as hot->cold demotion
    await seedLead(db, { qualification: "hot", outcome: "rejected", outcomeReason: "lost_execution" });
    // a genuine over-grade should still count as demoted
    await seedLead(db, { qualification: "hot", outcome: "rejected", outcomeReason: "lost_not_qualified" });
    const { summary } = await getReGradingMatrix(db);
    expect(summary.hot.demoted).toBe(1); // only the genuine over-grade
    expect(summary.hot.total).toBe(1);
  });
});

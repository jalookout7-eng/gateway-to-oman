// tests/intelligence/omar-precision.test.ts
import { describe, it, expect } from "vitest";
import { makeTestDb, seedLead } from "./helpers";
import { getOmarPrecision, getLossReasonBreakdown } from "@/lib/intelligence/queries";

describe("getOmarPrecision", () => {
  it("excludes sales/external losses from Omar's precision", async () => {
    const db = await makeTestDb();
    await seedLead(db, { qualification: "hot", outcome: "converted", outcomeReason: "won" });          // correct
    await seedLead(db, { qualification: "hot", outcome: "rejected", outcomeReason: "lost_not_qualified" }); // wrong
    await seedLead(db, { qualification: "hot", outcome: "rejected", outcomeReason: "lost_execution" });  // excluded
    await seedLead(db, { qualification: "hot", outcome: "rejected", outcomeReason: "lost_external" });   // excluded
    const p = await getOmarPrecision(db);
    expect(p.overall.correct).toBe(1);
    expect(p.overall.wrong).toBe(1);
    expect(p.overall.excluded).toBe(2);
    expect(p.overall.precisionPct).toBe(50); // 1 / (1+1)
  });

  it("explicit grade verdict overrides outcome", async () => {
    const db = await makeTestDb();
    await seedLead(db, { qualification: "hot", outcome: "rejected", outcomeReason: "lost_execution", omarGradeCorrect: "yes" });
    const p = await getOmarPrecision(db);
    expect(p.overall.correct).toBe(1);
    expect(p.overall.excluded).toBe(0);
  });
});

describe("getLossReasonBreakdown", () => {
  it("counts leads per outcome_reason", async () => {
    const db = await makeTestDb();
    await seedLead(db, { qualification: "hot", outcome: "rejected", outcomeReason: "lost_execution" });
    await seedLead(db, { qualification: "hot", outcome: "rejected", outcomeReason: "lost_execution" });
    await seedLead(db, { qualification: "warm", outcome: "rejected", outcomeReason: "lost_external" });
    const rows = await getLossReasonBreakdown(db);
    const exec = rows.find((r) => r.reason === "lost_execution");
    expect(exec?.count).toBe(2);
  });
});

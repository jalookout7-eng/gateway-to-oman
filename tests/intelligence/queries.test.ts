import { describe, it, expect } from "vitest";
import { makeTestDb, seedLead } from "./helpers";
import {
  getTierPrecision,
  getReGradingMatrix,
  getCategoryCalibration,
  getDataCoverage,
  getConversionStats,
  getTopSource,
} from "@/lib/intelligence/queries";

describe("getTierPrecision", () => {
  it("computes strict (converted) and engaged (converted+contacted) per tier over resolved leads", async () => {
    const db = await makeTestDb();
    // hot: 2 converted, 1 contacted, 1 rejected, 1 pending(excluded) => resolved=4
    await seedLead(db, { qualification: "hot", outcome: "converted" });
    await seedLead(db, { qualification: "hot", outcome: "converted" });
    await seedLead(db, { qualification: "hot", outcome: "contacted" });
    await seedLead(db, { qualification: "hot", outcome: "rejected" });
    await seedLead(db, { qualification: "hot", outcome: "pending" });

    const rows = await getTierPrecision(db);
    const hot = rows.find((r) => r.tier === "hot")!;
    expect(hot.resolved).toBe(4);
    expect(hot.convertedPct).toBe(50); // 2/4
    expect(hot.engagedPct).toBe(75);   // 3/4

    const cold = rows.find((r) => r.tier === "cold")!;
    expect(cold.resolved).toBe(0);
    expect(cold.convertedPct).toBeNull();
    expect(cold.engagedPct).toBeNull();
  });
});

describe("getReGradingMatrix", () => {
  it("counts predicted x effective and summarises movement", async () => {
    const db = await makeTestDb();
    await seedLead(db, { qualification: "warm", outcome: "converted" }); // warm->hot promoted
    await seedLead(db, { qualification: "warm", outcome: "rejected" });  // warm->cold demoted
    await seedLead(db, { qualification: "warm", outcome: "contacted" }); // warm->warm held
    await seedLead(db, { qualification: "hot", outcome: "rejected" });   // hot->cold demoted
    await seedLead(db, { qualification: "cold", outcome: "pending" });   // excluded

    const { matrix, summary } = await getReGradingMatrix(db);
    expect(matrix.warm.hot).toBe(1);
    expect(matrix.warm.cold).toBe(1);
    expect(matrix.warm.warm).toBe(1);
    expect(matrix.hot.cold).toBe(1);

    expect(summary.warm).toEqual({ promoted: 1, held: 1, demoted: 1, total: 3 });
    expect(summary.hot).toEqual({ promoted: 0, held: 0, demoted: 1, total: 1 });
    expect(summary.cold).toEqual({ promoted: 0, held: 0, demoted: 0, total: 0 });
  });
});

describe("getCategoryCalibration", () => {
  it("averages category points for successes vs non-successes", async () => {
    const db = await makeTestDb();
    // success = converted/contacted ; non-success = rejected/nurture ; pending excluded
    await seedLead(db, { qualification: "hot", outcome: "converted", breakdown: { budget: 30, timeline: 25, decisionAuthority: 15, objectiveClarity: 15, mindsetIndicator: 15 } });
    await seedLead(db, { qualification: "warm", outcome: "contacted", breakdown: { budget: 20, timeline: 15, decisionAuthority: 8, objectiveClarity: 8, mindsetIndicator: 0 } });
    await seedLead(db, { qualification: "cold", outcome: "rejected", breakdown: { budget: 0, timeline: 0, decisionAuthority: 8, objectiveClarity: 0, mindsetIndicator: 0 } });
    await seedLead(db, { qualification: "warm", outcome: "pending", breakdown: { budget: 99 } }); // excluded

    const rows = await getCategoryCalibration(db);
    const budget = rows.find((r) => r.category === "budget")!;
    expect(budget.successAvg).toBe(25);     // (30+20)/2
    expect(budget.nonSuccessAvg).toBe(0);   // (0)/1
  });
});

describe("getTierPrecision – month filter and nurture", () => {
  it("month filter scopes results to the given YYYY-MM", async () => {
    const db = await makeTestDb();
    await seedLead(db, { qualification: "hot", outcome: "converted", createdAt: "2026-04-15 10:00:00" });
    await seedLead(db, { qualification: "hot", outcome: "converted", createdAt: "2026-05-15 10:00:00" });
    const rows = await getTierPrecision(db, "2026-05");
    expect(rows.find((r) => r.tier === "hot")!.resolved).toBe(1);
  });

  it("nurture counts as resolved+warm but not engaged", async () => {
    const db = await makeTestDb();
    await seedLead(db, { qualification: "warm", outcome: "nurture" });
    const rows = await getTierPrecision(db, undefined);
    const warm = rows.find((r) => r.tier === "warm")!;
    expect(warm.resolved).toBe(1);
    expect(warm.convertedPct).toBe(0);
    expect(warm.engagedPct).toBe(0);
  });
});

describe("coverage / conversion / top source", () => {
  it("summarises coverage, conversion rate and the leading source", async () => {
    const db = await makeTestDb();
    await seedLead(db, { qualification: "hot", outcome: "converted", source: "referral", createdAt: "2026-05-02 09:00:00" });
    await seedLead(db, { qualification: "warm", outcome: "rejected", source: "tiktok", createdAt: "2026-05-10 09:00:00" });
    await seedLead(db, { qualification: "warm", outcome: "pending", source: "tiktok", createdAt: "2026-05-20 09:00:00" });

    const cov = await getDataCoverage(db);
    expect(cov.total).toBe(3);
    expect(cov.resolved).toBe(2);
    expect(cov.pending).toBe(1);
    expect(cov.earliest).toBe("2026-05-02 09:00:00");
    expect(cov.latest).toBe("2026-05-20 09:00:00");

    const conv = await getConversionStats(db);
    expect(conv.leads).toBe(3);
    expect(conv.converted).toBe(1);
    expect(conv.ratePct).toBe(33); // 1/3

    const top = await getTopSource(db);
    expect(top).toEqual({ source: "tiktok", count: 2 });
  });
});

// tests/intelligence/attribution-schema.test.ts
import { describe, it, expect } from "vitest";
import { makeTestDb, seedLead } from "./helpers";

describe("attribution columns", () => {
  it("persists outcome_reason + omar_grade_correct via seedLead", async () => {
    const db = await makeTestDb();
    await seedLead(db, {
      qualification: "hot",
      outcome: "rejected",
      outcomeReason: "lost_execution",
      omarGradeCorrect: "yes",
    });
    const res = await db.execute("SELECT outcome_reason, omar_grade_correct FROM leads");
    expect(res.rows[0].outcome_reason).toBe("lost_execution");
    expect(res.rows[0].omar_grade_correct).toBe("yes");
  });
});

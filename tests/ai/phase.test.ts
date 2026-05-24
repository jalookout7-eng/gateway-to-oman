import { describe, it, expect } from "vitest";
import { makeTestDb, seedLead } from "../intelligence/helpers";
import {
  PHASES, DEFAULT_PHASE, capabilitiesFor, guardrailsFor,
  getActivePhase, setActivePhase, getPhaseProgress,
} from "@/lib/ai/phase";

describe("phase definitions", () => {
  it("has three phases, the first being Qualifier + Librarian", () => {
    expect(PHASES.map((p) => p.phase)).toEqual([1, 2, 3]);
    expect(PHASES[0].name).toMatch(/Qualifier/i);
  });
  it("capabilitiesFor accumulates lower-phase capabilities", () => {
    const p1 = capabilitiesFor(1);
    const p2 = capabilitiesFor(2);
    expect(p1.length).toBeGreaterThan(0);
    expect(p2.length).toBeGreaterThan(p1.length);
    expect(p1.every((c) => p2.includes(c))).toBe(true);
  });
  it("guardrailsFor returns the active phase restrictions", () => {
    expect(guardrailsFor(1).join(" ")).toMatch(/book|schedule/i);
    // KB-grounding rule must apply at EVERY phase (regression canary)
    expect(guardrailsFor(2).join(" ")).toMatch(/knowledge base/i);
    expect(guardrailsFor(3).join(" ")).toMatch(/knowledge base/i);
    // Phase 3 (Scheduler) lifts the no-booking restriction
    expect(guardrailsFor(3).join(" ")).not.toMatch(/book or schedule/i);
  });
});

describe("active phase (settings-backed)", () => {
  it("defaults to 1 when no row exists, and round-trips", async () => {
    const db = await makeTestDb();
    expect(await getActivePhase(db)).toBe(DEFAULT_PHASE);
    await setActivePhase(db, 2);
    expect(await getActivePhase(db)).toBe(2);
  });
});

describe("getPhaseProgress", () => {
  it("reports active phase, resolved leads, and hot precision", async () => {
    const db = await makeTestDb();
    await seedLead(db, { qualification: "hot", outcome: "converted" });
    await seedLead(db, { qualification: "hot", outcome: "rejected" });
    const prog = await getPhaseProgress(db);
    expect(prog.activePhase).toBe(1);
    expect(prog.resolvedLeads).toBe(2);
    expect(prog.hotPrecisionPct).toBe(50);
  });
});

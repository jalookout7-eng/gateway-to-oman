import { describe, it, expect } from "vitest";
import { buildSystemPrompt } from "@/lib/ai/prompt-assembler";

describe("buildSystemPrompt", () => {
  it("injects KB topics scoped to the surface", () => {
    const main = buildSystemPrompt({ surface: "main", phase: 1 });
    const biz = buildSystemPrompt({ surface: "businesses", phase: 1 });
    expect(biz).toContain("Engagement Timeline");
    expect(main).not.toContain("Engagement Timeline");
    expect(main).toContain("Tax & Compliance");
    expect(biz).toContain("Tax & Compliance");
  });

  it("includes the buyer-qualification playbook only on businesses", () => {
    expect(buildSystemPrompt({ surface: "businesses", phase: 1 })).toMatch(/operate this business yourself/i);
    expect(buildSystemPrompt({ surface: "main", phase: 1 })).not.toMatch(/operate this business yourself/i);
    // main surface must not even emit the qualification heading (filter(Boolean) path)
    expect(buildSystemPrompt({ surface: "businesses", phase: 1 })).toContain("## BUYER QUALIFICATION");
    expect(buildSystemPrompt({ surface: "main", phase: 1 })).not.toContain("## BUYER QUALIFICATION");
  });

  it("never leaks the corrected-away wrong facts", () => {
    for (const surface of ["main", "businesses"] as const) {
      const p = buildSystemPrompt({ surface, phase: 1 });
      expect(p).not.toContain("0% corporate tax for first 5 years");
      expect(p).not.toContain("2 billion consumers");
      expect(p.toLowerCase()).not.toContain("omr 50,000");
    }
  });

  it("gates capabilities by phase", () => {
    const p1 = buildSystemPrompt({ surface: "businesses", phase: 1 });
    const p2 = buildSystemPrompt({ surface: "businesses", phase: 2 });
    expect(p1).not.toMatch(/license-transfer steps/i);
    expect(p2).toMatch(/license-transfer steps/i);
  });

  it("appends booking/intent context when provided", () => {
    const p = buildSystemPrompt({ surface: "main", phase: 1, context: { intent: "consultation", availability: "[AVAILABLE_DAYS: Mon]" } });
    expect(p).toContain("[AVAILABLE_DAYS: Mon]");
  });
});

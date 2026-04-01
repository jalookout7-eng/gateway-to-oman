import { describe, it, expect } from "vitest";
import { parseSignals, stripSignals } from "@/lib/ai/signals";
import { renderWelcomeEmail } from "@/lib/email/templates";

describe("Chat Flow Integration", () => {
  it("should parse all signal types from a response", () => {
    const raw =
      "Welcome! I can help you explore Oman. [SEGMENT:entrepreneur] [INTEREST:business setup] [CAPTURE_READY]";

    const signals = parseSignals(raw);
    const clean = stripSignals(raw);

    expect(signals.segment).toBe("entrepreneur");
    expect(signals.interest).toBe("business setup");
    expect(signals.captureReady).toBe(true);
    expect(clean).toBe("Welcome! I can help you explore Oman.");
    expect(clean).not.toContain("[SEGMENT");
    expect(clean).not.toContain("[INTEREST");
    expect(clean).not.toContain("[CAPTURE_READY]");
  });

  it("should handle HIGH_INTENT and CLOSE_CHAT signals", () => {
    const raw = "Thank you for your time! [HIGH_INTENT] [CLOSE_CHAT]";
    const signals = parseSignals(raw);
    const clean = stripSignals(raw);

    expect(signals.highIntent).toBe(true);
    expect(signals.closeChat).toBe(true);
    expect(clean).toBe("Thank you for your time!");
  });

  it("should generate personalized welcome email for entrepreneur", () => {
    const { subject, body } = renderWelcomeEmail({
      name: "John",
      segment: "entrepreneur",
      interest: "business_setup",
    });

    expect(subject).toContain("John");
    expect(body).toContain("John");
    expect(body).toContain("setting up a business in Oman");
    expect(body).toContain("business setup");
    expect(body).toContain("Gateway to Oman");
  });

  it("should generate welcome email without segment", () => {
    const { subject, body } = renderWelcomeEmail({
      name: "Jane",
      segment: null,
      interest: null,
    });

    expect(subject).toContain("Jane");
    expect(body).toContain("Jane");
    expect(body).toContain("Gateway to Oman");
  });

  it("should strip signals cleanly even with multiple spaces", () => {
    const raw =
      "Let me help.  [SEGMENT:investor]  [CAPTURE_READY]  More info here.";
    const clean = stripSignals(raw);

    // Should not have excessive spaces
    expect(clean).not.toContain("  [");
    expect(clean).toContain("Let me help.");
    expect(clean).toContain("More info here.");
  });
});

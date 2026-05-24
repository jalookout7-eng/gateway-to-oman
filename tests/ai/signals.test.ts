import { describe, it, expect } from "vitest";
import { parseSignals, stripSignals } from "@/lib/ai/signals";

describe("Signal parsing", () => {
  it("extracts CAPTURE_READY signal", () => {
    const raw = "Great question! [CAPTURE_READY] Let me help you further.";
    const signals = parseSignals(raw);
    expect(signals.captureReady).toBe(true);
  });

  it("extracts SEGMENT signal", () => {
    const raw = "Welcome! [SEGMENT:investor] Tell me more.";
    const signals = parseSignals(raw);
    expect(signals.segment).toBe("investor");
  });

  it("extracts INTEREST signal", () => {
    const raw = "Interesting! [INTEREST:real_estate] Oman has great options.";
    const signals = parseSignals(raw);
    expect(signals.interest).toBe("real_estate");
  });

  it("extracts HIGH_INTENT signal", () => {
    const raw = "Great questions! [HIGH_INTENT] Let me connect you.";
    const signals = parseSignals(raw);
    expect(signals.highIntent).toBe(true);
  });

  it("extracts CLOSE_CHAT signal", () => {
    const raw = "I appreciate the curiosity! [CLOSE_CHAT] Have a great day.";
    const signals = parseSignals(raw);
    expect(signals.closeChat).toBe(true);
  });

  it("extracts multiple signals", () => {
    const raw =
      "[SEGMENT:entrepreneur] [INTEREST:franchise] [CAPTURE_READY] Let me get your details.";
    const signals = parseSignals(raw);
    expect(signals.segment).toBe("entrepreneur");
    expect(signals.interest).toBe("franchise");
    expect(signals.captureReady).toBe(true);
  });
});

describe("Signal stripping", () => {
  it("removes all signals from text", () => {
    const raw = "Great! [CAPTURE_READY] [SEGMENT:investor] Let me help.";
    const clean = stripSignals(raw);
    expect(clean).toBe("Great! Let me help.");
  });

  it("returns clean text unchanged", () => {
    const raw = "Welcome to Gateway to Oman!";
    const clean = stripSignals(raw);
    expect(clean).toBe("Welcome to Gateway to Oman!");
  });
});

describe("new signals", () => {
  it("parses whatsappHandoff and kbGap", () => {
    const s = parseSignals("Here you go. [WHATSAPP_HANDOFF] [KB_GAP]");
    expect(s.whatsappHandoff).toBe(true);
    expect(s.kbGap).toBe(true);
  });
  it("defaults both to false", () => {
    const s = parseSignals("plain message");
    expect(s.whatsappHandoff).toBe(false);
    expect(s.kbGap).toBe(false);
  });
  it("strips both from visible text", () => {
    const out = stripSignals("Answer here. [WHATSAPP_HANDOFF] [KB_GAP]");
    expect(out).toBe("Answer here.");
  });
});

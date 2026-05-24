import { describe, it, expect } from "vitest";
import { buildWhatsAppHandoff } from "@/lib/ai/whatsapp";

describe("buildWhatsAppHandoff", () => {
  it("targets Azizi's wa.me number with a prefilled, encoded message", () => {
    const url = buildWhatsAppHandoff({ segment: "investor", interest: "F&B acquisition", surface: "businesses" });
    expect(url.startsWith("https://wa.me/96895108257?text=")).toBe(true);
    const text = decodeURIComponent(url.split("text=")[1]);
    expect(text).toContain("investor");
    expect(text).toContain("F&B acquisition");
    expect(text.toLowerCase()).toContain("marketplace");
  });

  it("works with no segment/interest", () => {
    const url = buildWhatsAppHandoff({ surface: "main" });
    expect(url.startsWith("https://wa.me/96895108257?text=")).toBe(true);
    const text = decodeURIComponent(url.split("text=")[1]);
    expect(text).toContain("main Gateway to Oman site");
  });
});

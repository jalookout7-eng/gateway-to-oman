import { describe, it, expect } from "vitest";
import { renderWelcomeEmail } from "@/lib/email/templates";

describe("Email templates", () => {
  it("personalizes welcome email with lead data", () => {
    const result = renderWelcomeEmail({
      name: "Sarah Khan",
      segment: "investor",
      interest: "real_estate",
    });

    expect(result.subject).toContain("Sarah");
    expect(result.body).toContain("Sarah");
    expect(result.body).toContain("investing in Oman");
    expect(result.body).toContain("real estate");
    expect(result.body).toContain("Ahmed Al-Azizi");
  });

  it("handles missing interest gracefully", () => {
    const result = renderWelcomeEmail({
      name: "John",
      segment: "entrepreneur",
      interest: null,
    });

    expect(result.body).toContain("John");
    expect(result.body).toContain("setting up a business in Oman");
    expect(result.body).not.toContain("null");
  });

  it("handles unknown segment gracefully", () => {
    const result = renderWelcomeEmail({
      name: "Ali",
      segment: null,
      interest: null,
    });

    expect(result.body).toContain("Ali");
    expect(result.body).toContain("exploring opportunities in Oman");
  });
});

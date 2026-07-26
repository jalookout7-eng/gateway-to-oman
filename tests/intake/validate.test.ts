import { describe, it, expect } from "vitest";
import { parseIntakePayload } from "@/lib/intake/validate";

const valid = {
  name: "Jane Smith",
  email: "jane@example.com",
  phone: "5550000",
  countryCode: "+44",
  countryOfResidence: "United Kingdom",
  investmentTimeline: "Within 6 months",
  investmentPurpose: "Business Setup",
  preferredLocation: "Open / Flexible",
  residencyInterest: "Yes, for myself only",
  servicesNeeded: ["Business Registration and Licensing"],
  additionalComments: "Looking to relocate.",
  _trap: "",
};

describe("parseIntakePayload", () => {
  it("accepts a fully populated valid payload", () => {
    const r = parseIntakePayload(valid);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data.name).toBe("Jane Smith");
    expect(r.data.servicesNeeded).toEqual(["Business Registration and Licensing"]);
  });

  it("accepts a minimal payload of name and email only", () => {
    const r = parseIntakePayload({ name: "Al Rashid", email: "a@b.co" });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data.phone).toBeNull();
    expect(r.data.investmentTimeline).toBeNull();
    expect(r.data.servicesNeeded).toEqual([]);
  });

  it("trims whitespace and lowercases nothing else", () => {
    const r = parseIntakePayload({ name: "  Jane  ", email: "  jane@example.com " });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data.name).toBe("Jane");
    expect(r.data.email).toBe("jane@example.com");
  });

  it("flags a filled honeypot as a bot", () => {
    const r = parseIntakePayload({ ...valid, _trap: "http://spam.example" });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.reason).toBe("bot");
  });

  it("rejects a missing name", () => {
    const r = parseIntakePayload({ email: "a@b.co" });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.reason).toBe("invalid");
  });

  it("rejects a one-character name", () => {
    const r = parseIntakePayload({ name: "J", email: "a@b.co" });
    expect(r.ok).toBe(false);
  });

  it("rejects a malformed email", () => {
    const r = parseIntakePayload({ name: "Jane", email: "not-an-email" });
    expect(r.ok).toBe(false);
  });

  it("rejects an over-long name", () => {
    const r = parseIntakePayload({ name: "x".repeat(121), email: "a@b.co" });
    expect(r.ok).toBe(false);
  });

  it("rejects comments over 2000 characters", () => {
    const r = parseIntakePayload({ ...valid, additionalComments: "x".repeat(2001) });
    expect(r.ok).toBe(false);
  });

  it("rejects a select value outside the allowlist", () => {
    const r = parseIntakePayload({ ...valid, investmentTimeline: "Whenever I feel like it" });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.reason).toBe("invalid");
  });

  it("rejects a service outside the allowlist", () => {
    const r = parseIntakePayload({ ...valid, servicesNeeded: ["Money Laundering"] });
    expect(r.ok).toBe(false);
  });

  it("treats an empty-string select as not answered", () => {
    const r = parseIntakePayload({ ...valid, investmentPurpose: "" });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data.investmentPurpose).toBeNull();
  });

  it("deduplicates repeated services", () => {
    const r = parseIntakePayload({
      ...valid,
      servicesNeeded: ["Retirement Planning", "Retirement Planning"],
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data.servicesNeeded).toEqual(["Retirement Planning"]);
  });

  it("rejects a non-array servicesNeeded", () => {
    const r = parseIntakePayload({ ...valid, servicesNeeded: "Retirement Planning" });
    expect(r.ok).toBe(false);
  });

  it("rejects a non-object input", () => {
    expect(parseIntakePayload(null).ok).toBe(false);
    expect(parseIntakePayload("string").ok).toBe(false);
  });

  it("ignores unknown extra keys rather than storing them", () => {
    const r = parseIntakePayload({ ...valid, is_admin: true, qualification: "hot" });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(Object.keys(r.data)).not.toContain("is_admin");
    expect(Object.keys(r.data)).not.toContain("qualification");
  });
});

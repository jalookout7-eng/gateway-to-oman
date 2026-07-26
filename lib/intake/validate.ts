import {
  INVESTMENT_TIMELINES,
  INVESTMENT_PURPOSES,
  PREFERRED_LOCATIONS,
  RESIDENCY_OPTIONS,
  SERVICES_OPTIONS,
} from "@/lib/intake/constants";

/**
 * Pure validation for the intake payload. No DB, no Next.js imports, so the
 * whole surface is unit-testable.
 *
 * Two things this deliberately does:
 *
 * 1. Every select is checked against its allowlist rather than merely
 *    length-capped. The stored value IS the label, so an unchecked field
 *    would let anyone write arbitrary text into a column Ahmed reads as
 *    fact.
 * 2. It returns a fixed-shape object built field by field, never a spread
 *    of the input. Extra keys in the request body (`qualification`,
 *    `source`, `is_admin`) are structurally impossible to smuggle through.
 */

export interface IntakeLead {
  name: string;
  email: string;
  phone: string | null;
  countryCode: string | null;
  countryOfResidence: string | null;
  investmentTimeline: string | null;
  investmentPurpose: string | null;
  preferredLocation: string | null;
  residencyInterest: string | null;
  servicesNeeded: string[];
  additionalComments: string | null;
}

export type IntakeParseResult =
  | { ok: true; data: IntakeLead }
  | { ok: false; reason: "bot" }
  | { ok: false; reason: "invalid"; error: string };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function invalid(error: string): IntakeParseResult {
  return { ok: false, reason: "invalid", error };
}

/** Read an optional free-text field: missing/blank becomes null. */
function optionalText(
  raw: unknown,
  max: number,
  label: string,
): { ok: true; value: string | null } | { ok: false; error: string } {
  if (raw === undefined || raw === null || raw === "") return { ok: true, value: null };
  if (typeof raw !== "string") return { ok: false, error: `${label} must be text` };
  const trimmed = raw.trim();
  if (trimmed === "") return { ok: true, value: null };
  if (trimmed.length > max) return { ok: false, error: `${label} is too long` };
  return { ok: true, value: trimmed };
}

/** Read an optional select: blank becomes null, anything off-list is rejected. */
function optionalChoice(
  raw: unknown,
  allowed: readonly string[],
  label: string,
): { ok: true; value: string | null } | { ok: false; error: string } {
  if (raw === undefined || raw === null || raw === "") return { ok: true, value: null };
  if (typeof raw !== "string") return { ok: false, error: `${label} must be text` };
  if (!allowed.includes(raw)) return { ok: false, error: `${label} is not a valid choice` };
  return { ok: true, value: raw };
}

export function parseIntakePayload(input: unknown): IntakeParseResult {
  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    return invalid("Invalid submission");
  }
  const body = input as Record<string, unknown>;

  // Honeypot first: a bot that filled the hidden field never gets a reason to
  // retry with different values.
  const trap = body._trap;
  if (typeof trap === "string" && trap.trim() !== "") {
    return { ok: false, reason: "bot" };
  }

  if (typeof body.name !== "string") return invalid("Full name is required");
  const name = body.name.trim();
  if (name.length < 2) return invalid("Full name is required");
  if (name.length > 120) return invalid("Full name is too long");

  if (typeof body.email !== "string") return invalid("A valid email address is required");
  const email = body.email.trim();
  if (email.length > 200 || !EMAIL_RE.test(email)) {
    return invalid("A valid email address is required");
  }

  const phone = optionalText(body.phone, 30, "Phone number");
  if (!phone.ok) return invalid(phone.error);

  const countryCode = optionalText(body.countryCode, 8, "Country code");
  if (!countryCode.ok) return invalid(countryCode.error);

  const countryOfResidence = optionalText(body.countryOfResidence, 100, "Country of residence");
  if (!countryOfResidence.ok) return invalid(countryOfResidence.error);

  const investmentTimeline = optionalChoice(body.investmentTimeline, INVESTMENT_TIMELINES, "Timeline");
  if (!investmentTimeline.ok) return invalid(investmentTimeline.error);

  const investmentPurpose = optionalChoice(body.investmentPurpose, INVESTMENT_PURPOSES, "Purpose");
  if (!investmentPurpose.ok) return invalid(investmentPurpose.error);

  const preferredLocation = optionalChoice(body.preferredLocation, PREFERRED_LOCATIONS, "Preferred location");
  if (!preferredLocation.ok) return invalid(preferredLocation.error);

  const residencyInterest = optionalChoice(body.residencyInterest, RESIDENCY_OPTIONS, "Residency interest");
  if (!residencyInterest.ok) return invalid(residencyInterest.error);

  let servicesNeeded: string[] = [];
  if (body.servicesNeeded !== undefined && body.servicesNeeded !== null) {
    if (!Array.isArray(body.servicesNeeded)) return invalid("Services must be a list");
    if (body.servicesNeeded.length > SERVICES_OPTIONS.length) return invalid("Too many services selected");
    const seen = new Set<string>();
    for (const s of body.servicesNeeded) {
      if (typeof s !== "string" || !SERVICES_OPTIONS.includes(s as (typeof SERVICES_OPTIONS)[number])) {
        return invalid("Services contains an invalid choice");
      }
      seen.add(s);
    }
    servicesNeeded = Array.from(seen);
  }

  const additionalComments = optionalText(body.additionalComments, 2000, "Comments");
  if (!additionalComments.ok) return invalid(additionalComments.error);

  return {
    ok: true,
    data: {
      name,
      email,
      phone: phone.value,
      countryCode: countryCode.value,
      countryOfResidence: countryOfResidence.value,
      investmentTimeline: investmentTimeline.value,
      investmentPurpose: investmentPurpose.value,
      preferredLocation: preferredLocation.value,
      residencyInterest: residencyInterest.value,
      servicesNeeded,
      additionalComments: additionalComments.value,
    },
  };
}

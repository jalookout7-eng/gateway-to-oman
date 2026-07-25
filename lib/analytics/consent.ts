/**
 * Analytics consent state (spec 2026-07-25-consent-banner-design.md).
 *
 * OPT-OUT model by JA's decision: with no stored choice, analytics runs and
 * the banner asks. An explicit Decline stops GA on this and all later page
 * loads. Flip CONSENT_DEFAULT to "denied" to become opt-in (strict GDPR) —
 * that single line is the whole switch, pending the compliance lawyer review.
 *
 * No React here on purpose: this is the one place that touches localStorage,
 * so it stays directly testable and every consumer reads the same rules.
 */

export type ConsentValue = "granted" | "denied";

export const CONSENT_DEFAULT: ConsentValue = "granted";
export const CONSENT_STORAGE_KEY = "gto_analytics_consent";
export const CONSENT_CHANGE_EVENT = "gto-consent-change";

/** Re-ask after a year, so a choice can't outlive the reason for it. */
export const CONSENT_MAX_AGE_MS = 365 * 24 * 60 * 60 * 1000;

type StoredConsent = { value: ConsentValue; at: string };

function isConsentValue(v: unknown): v is ConsentValue {
  return v === "granted" || v === "denied";
}

/** The stored choice, or null when absent, malformed, or expired. */
export function readConsent(): ConsentValue | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(CONSENT_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredConsent;
    if (!isConsentValue(parsed?.value)) return null;
    const at = Date.parse(parsed.at);
    if (Number.isNaN(at)) return null;
    if (Date.now() - at > CONSENT_MAX_AGE_MS) return null;
    return parsed.value;
  } catch {
    // Private mode / storage disabled / corrupt entry — treat as no choice.
    return null;
  }
}

/** Persist a choice and tell the rest of the app about it. */
export function writeConsent(value: ConsentValue): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      CONSENT_STORAGE_KEY,
      JSON.stringify({ value, at: new Date().toISOString() } satisfies StoredConsent),
    );
  } catch {
    // Storage unavailable: the event still fires so this page reacts, the
    // choice just won't survive a reload.
  }
  window.dispatchEvent(new CustomEvent(CONSENT_CHANGE_EVENT, { detail: value }));
}

/** What analytics should actually do right now. */
export function effectiveConsent(): ConsentValue {
  return readConsent() ?? CONSENT_DEFAULT;
}

import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import {
  CONSENT_DEFAULT,
  CONSENT_STORAGE_KEY,
  CONSENT_CHANGE_EVENT,
  CONSENT_MAX_AGE_MS,
  readConsent,
  writeConsent,
  effectiveConsent,
} from "@/lib/analytics/consent";

beforeEach(() => {
  localStorage.clear();
  vi.useRealTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("CONSENT_DEFAULT", () => {
  it("is 'granted' — opt-out model (JA decision; flipping this one line makes it opt-in)", () => {
    expect(CONSENT_DEFAULT).toBe("granted");
  });
});

describe("readConsent", () => {
  it("returns null when nothing is stored", () => {
    expect(readConsent()).toBeNull();
  });

  it("returns the stored value when fresh", () => {
    writeConsent("denied");
    expect(readConsent()).toBe("denied");
  });

  it("returns null when the stored choice is older than 12 months", () => {
    const stale = new Date(Date.now() - CONSENT_MAX_AGE_MS - 1000).toISOString();
    localStorage.setItem(
      CONSENT_STORAGE_KEY,
      JSON.stringify({ value: "granted", at: stale }),
    );
    expect(readConsent()).toBeNull();
  });

  it("returns the value when just inside the 12-month window", () => {
    const fresh = new Date(Date.now() - CONSENT_MAX_AGE_MS + 60_000).toISOString();
    localStorage.setItem(
      CONSENT_STORAGE_KEY,
      JSON.stringify({ value: "denied", at: fresh }),
    );
    expect(readConsent()).toBe("denied");
  });

  it("returns null for malformed JSON instead of throwing", () => {
    localStorage.setItem(CONSENT_STORAGE_KEY, "{not json");
    expect(readConsent()).toBeNull();
  });

  it("returns null for an unrecognised value", () => {
    localStorage.setItem(
      CONSENT_STORAGE_KEY,
      JSON.stringify({ value: "maybe", at: new Date().toISOString() }),
    );
    expect(readConsent()).toBeNull();
  });
});

describe("writeConsent", () => {
  it("persists value + timestamp", () => {
    writeConsent("granted");
    const raw = JSON.parse(localStorage.getItem(CONSENT_STORAGE_KEY) as string);
    expect(raw.value).toBe("granted");
    expect(typeof raw.at).toBe("string");
    expect(Number.isNaN(Date.parse(raw.at))).toBe(false);
  });

  it("dispatches the consent-change event carrying the new value", () => {
    const listener = vi.fn();
    window.addEventListener(CONSENT_CHANGE_EVENT, listener);
    writeConsent("denied");
    expect(listener).toHaveBeenCalledOnce();
    const evt = listener.mock.calls[0][0] as CustomEvent;
    expect(evt.detail).toBe("denied");
    window.removeEventListener(CONSENT_CHANGE_EVENT, listener);
  });
});

describe("effectiveConsent", () => {
  it("falls back to CONSENT_DEFAULT with no stored choice", () => {
    expect(effectiveConsent()).toBe(CONSENT_DEFAULT);
  });

  it("prefers an explicit stored choice over the default", () => {
    writeConsent("denied");
    expect(effectiveConsent()).toBe("denied");
  });
});

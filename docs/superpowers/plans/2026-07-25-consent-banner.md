# Analytics Consent Banner Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a Consent Mode v2 opt-out consent banner: analytics runs by default, an explicit Decline stops GA entirely, and the choice persists for 12 months.

**Architecture:** Consent state lives in one pure module (`lib/analytics/consent.ts`) that owns localStorage reads/writes and expiry — no React, fully testable. `ConsentBanner.tsx` renders the bar and writes choices. `GoogleAnalytics.tsx` gains a client-side consent gate plus Consent Mode v2 defaults in its init script. The two components communicate through a `window` CustomEvent rather than a React context, so no provider is added to the root layout.

**Tech Stack:** Next.js 14 App Router client components, gtag.js Consent Mode v2, vitest + @testing-library/react + jsdom.

## Global Constraints

- Spec: `docs/superpowers/specs/2026-07-25-consent-banner-design.md`
- Baselines: **229/229 tests across 38 files** · `npx tsc --noEmit` = exactly **3 pre-existing** test-file errors (2× `tests/admin/lead-update.test.ts`, 1× `tests/api/chat.test.ts`) · `npm run build` = **85 routes**. Add nothing to any of these.
- **Opt-out is JA's decision, not a bug.** Default is `granted`; undecided visitors ARE tracked. `CONSENT_DEFAULT` must be a single named constant so the posture flips in one line after the lawyer review (HANDOVER item I).
- `ad_storage`, `ad_user_data`, `ad_personalization` are ALWAYS `'denied'` (no ads product in use).
- Decline must be visually equal effort to Accept — no dark patterns, no pre-checked bias, no hidden dismiss.
- Banner never renders on `/admin/*` — reuse the existing `EXCLUDED_PATHS` check, do not duplicate the list.
- Brand tokens only: `bg-navy`, `text-gold`, `gold-gradient` (all exist). No raw hex.
- **Hydration:** localStorage is client-only. Any consent read MUST happen in an effect after mount, never during render, or SSR and client markup disagree. Both new components render `null` until mounted.
- **Honest limitation to preserve in comments:** once gtag.js has loaded in a page, Decline cannot unload it. `gtag('consent','update')` stops collection immediately and the script never loads on subsequent page loads. Do not write comments claiming the script is removed.
- Stage only your task's files; never `git add -A`; never stage `HANDOVER.md`.
- Commit messages: conventional commits ending with
  `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`
- **NO DEPLOY in this plan.** The branch already carries the item-P-gated mobile nav and Batch 16. This joins them; JA ships all three together.

---

### Task 1: Consent state module

**Files:**
- Create: `lib/analytics/consent.ts`
- Test: `tests/analytics/consent.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `type ConsentValue = "granted" | "denied"`
  - `const CONSENT_DEFAULT: ConsentValue` — `"granted"` (the one-line flip)
  - `const CONSENT_STORAGE_KEY = "gto_analytics_consent"`
  - `const CONSENT_CHANGE_EVENT = "gto-consent-change"`
  - `const CONSENT_MAX_AGE_MS` — 12 months
  - `readConsent(): ConsentValue | null` — null means "no valid stored choice" (absent, malformed, or expired)
  - `writeConsent(value: ConsentValue): void` — persists and dispatches the CustomEvent
  - `effectiveConsent(): ConsentValue` — stored choice, else `CONSENT_DEFAULT`

- [ ] **Step 1: Write the failing test**

```ts
// tests/analytics/consent.test.ts
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/analytics/consent.test.ts`
Expected: FAIL — cannot resolve `@/lib/analytics/consent`

- [ ] **Step 3: Write the module**

```ts
// lib/analytics/consent.ts

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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/analytics/consent.test.ts`
Expected: PASS (11 tests)

- [ ] **Step 5: Commit**

```bash
git add lib/analytics/consent.ts tests/analytics/consent.test.ts
git commit -m "feat(analytics): consent state module with 12-month expiry"
```

---

### Task 2: ConsentBanner component

**Files:**
- Create: `components/analytics/ConsentBanner.tsx`
- Test: `tests/analytics/consent-banner.test.tsx`

**Interfaces:**
- Consumes: `readConsent`, `writeConsent`, `ConsentValue` (Task 1); `isExcludedRoute` — **exported in Task 3**, so during Task 2 implement against the import and expect a red typecheck until Task 3 lands (the vitest run still passes because the test mocks `next/navigation` and the module resolves at runtime once Task 3 exports it). **If that import cannot resolve while you work, stop and report NEEDS_CONTEXT rather than duplicating the path list.**
- Produces: `ConsentBanner()` — renders `null` before mount, on excluded routes, and once a valid choice exists.

- [ ] **Step 1: Write the failing test**

```tsx
// tests/analytics/consent-banner.test.tsx
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, fireEvent, cleanup, waitFor } from "@testing-library/react";
import { ConsentBanner } from "@/components/analytics/ConsentBanner";
import { readConsent, CONSENT_STORAGE_KEY } from "@/lib/analytics/consent";

const pathnameMock = vi.fn(() => "/");
vi.mock("next/navigation", () => ({
  usePathname: () => pathnameMock(),
}));

beforeEach(() => {
  localStorage.clear();
  document.body.className = "";
  pathnameMock.mockReturnValue("/");
});

afterEach(cleanup);

describe("ConsentBanner", () => {
  it("shows Accept and Decline when no choice is stored", async () => {
    render(<ConsentBanner />);
    await waitFor(() => expect(screen.getByRole("region", { name: /cookie consent/i })).toBeTruthy());
    expect(screen.getByRole("button", { name: /^accept$/i })).toBeTruthy();
    expect(screen.getByRole("button", { name: /^decline$/i })).toBeTruthy();
  });

  it("links to the privacy policy", async () => {
    render(<ConsentBanner />);
    await waitFor(() => screen.getByRole("region", { name: /cookie consent/i }));
    expect(screen.getByRole("link", { name: /privacy/i }).getAttribute("href")).toBe("/privacy");
  });

  it("stores 'granted' and hides itself on Accept", async () => {
    render(<ConsentBanner />);
    await waitFor(() => screen.getByRole("region", { name: /cookie consent/i }));
    fireEvent.click(screen.getByRole("button", { name: /^accept$/i }));
    expect(readConsent()).toBe("granted");
    await waitFor(() =>
      expect(screen.queryByRole("region", { name: /cookie consent/i })).toBeNull(),
    );
  });

  it("stores 'denied' and hides itself on Decline", async () => {
    render(<ConsentBanner />);
    await waitFor(() => screen.getByRole("region", { name: /cookie consent/i }));
    fireEvent.click(screen.getByRole("button", { name: /^decline$/i }));
    expect(readConsent()).toBe("denied");
    await waitFor(() =>
      expect(screen.queryByRole("region", { name: /cookie consent/i })).toBeNull(),
    );
  });

  it("stays hidden when a valid choice already exists", async () => {
    localStorage.setItem(
      CONSENT_STORAGE_KEY,
      JSON.stringify({ value: "granted", at: new Date().toISOString() }),
    );
    const { container } = render(<ConsentBanner />);
    await waitFor(() => expect(container.innerHTML).toBe(""));
  });

  it("never renders on admin routes", async () => {
    pathnameMock.mockReturnValue("/admin/leads");
    const { container } = render(<ConsentBanner />);
    await waitFor(() => expect(container.innerHTML).toBe(""));
  });

  it("toggles the body class so floating buttons lift while it is visible", async () => {
    render(<ConsentBanner />);
    await waitFor(() => expect(document.body.classList.contains("consent-banner-open")).toBe(true));
    fireEvent.click(screen.getByRole("button", { name: /^accept$/i }));
    await waitFor(() => expect(document.body.classList.contains("consent-banner-open")).toBe(false));
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/analytics/consent-banner.test.tsx`
Expected: FAIL — cannot resolve `@/components/analytics/ConsentBanner`

- [ ] **Step 3: Write the component**

```tsx
// components/analytics/ConsentBanner.tsx
"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { readConsent, writeConsent, type ConsentValue } from "@/lib/analytics/consent";
import { isExcludedRoute } from "@/components/analytics/GoogleAnalytics";

/**
 * Consent bar (spec 2026-07-25-consent-banner-design.md).
 *
 * Opt-out model: this asks, it does not gate. Accept and Decline are
 * deliberately equal in weight — same size, same prominence — because a
 * refusal that is harder than acceptance is not a real choice.
 *
 * Mounted state exists because localStorage cannot be read during SSR;
 * rendering the bar before mount would produce a hydration mismatch.
 */
export function ConsentBanner() {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const [decided, setDecided] = useState(true);

  useEffect(() => {
    setMounted(true);
    setDecided(readConsent() !== null);
  }, []);

  const visible = mounted && !decided && !isExcludedRoute(pathname);

  // Lift the floating WhatsApp/Omar buttons while the bar occupies the
  // bottom edge (see .consent-banner-open in globals.css).
  useEffect(() => {
    document.body.classList.toggle("consent-banner-open", visible);
    return () => document.body.classList.remove("consent-banner-open");
  }, [visible]);

  if (!visible) return null;

  function choose(value: ConsentValue) {
    writeConsent(value);
    setDecided(true);
  }

  return (
    <div
      role="region"
      aria-label="Cookie consent"
      className="fixed bottom-0 left-0 right-0 z-[60] bg-navy text-white px-4 py-3 shadow-lg"
    >
      <div className="mx-auto max-w-5xl flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6">
        <p className="text-sm text-white/90 flex-1">
          We use analytics to understand how this site is used and improve it.{" "}
          <Link href="/privacy" className="underline hover:text-gold transition-colors">
            Privacy policy
          </Link>
          .
        </p>
        <div className="flex gap-3 flex-shrink-0">
          <button
            type="button"
            onClick={() => choose("denied")}
            className="px-5 py-2 rounded-lg text-sm font-semibold border border-white/40 text-white hover:bg-white/10 transition-colors"
          >
            Decline
          </button>
          <button
            type="button"
            onClick={() => choose("granted")}
            className="px-5 py-2 rounded-lg text-sm font-semibold gold-gradient text-white hover:shadow-lg transition-shadow"
          >
            Accept
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/analytics/consent-banner.test.tsx`
Expected: PASS (7 tests)

- [ ] **Step 5: Commit**

```bash
git add components/analytics/ConsentBanner.tsx tests/analytics/consent-banner.test.tsx
git commit -m "feat(analytics): consent banner with equal-weight Accept/Decline"
```

---

### Task 3: Consent gating + Consent Mode v2 in GoogleAnalytics

**Files:**
- Modify: `components/analytics/GoogleAnalytics.tsx`
- Test: `tests/analytics/google-analytics-consent.test.tsx`

**Interfaces:**
- Consumes: `readConsent`, `effectiveConsent`, `CONSENT_DEFAULT`, `CONSENT_CHANGE_EVENT` (Task 1).
- Produces: `isExcludedRoute` becomes **exported** (Task 2 imports it). Component behavior: renders `null` before mount and when consent is `denied`.

- [ ] **Step 1: Write the failing test**

```tsx
// tests/analytics/google-analytics-consent.test.tsx
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, cleanup, waitFor, act } from "@testing-library/react";
import { GoogleAnalytics } from "@/components/analytics/GoogleAnalytics";
import { writeConsent, CONSENT_STORAGE_KEY } from "@/lib/analytics/consent";

const pathnameMock = vi.fn(() => "/");
vi.mock("next/navigation", () => ({
  usePathname: () => pathnameMock(),
  useSearchParams: () => new URLSearchParams(),
}));

// next/script renders nothing useful in jsdom; stand in with a marker element
// so "did the tag render?" is observable.
vi.mock("next/script", () => ({
  default: ({ id, src }: { id?: string; src?: string }) => (
    <div data-testid="ga-script" data-id={id ?? ""} data-src={src ?? ""} />
  ),
}));

beforeEach(() => {
  localStorage.clear();
  pathnameMock.mockReturnValue("/");
  vi.stubEnv("NEXT_PUBLIC_GA_MEASUREMENT_ID", "G-TEST12345");
});

afterEach(() => {
  cleanup();
  vi.unstubAllEnvs();
});

describe("GoogleAnalytics consent gating", () => {
  it("loads gtag when no choice is stored (opt-out default)", async () => {
    const { queryAllByTestId } = render(<GoogleAnalytics />);
    await waitFor(() => expect(queryAllByTestId("ga-script").length).toBeGreaterThan(0));
  });

  it("loads gtag after an explicit Accept", async () => {
    writeConsent("granted");
    const { queryAllByTestId } = render(<GoogleAnalytics />);
    await waitFor(() => expect(queryAllByTestId("ga-script").length).toBeGreaterThan(0));
  });

  it("does NOT load gtag when consent is denied", async () => {
    localStorage.setItem(
      CONSENT_STORAGE_KEY,
      JSON.stringify({ value: "denied", at: new Date().toISOString() }),
    );
    const { container } = render(<GoogleAnalytics />);
    await waitFor(() => expect(container.innerHTML).toBe(""));
  });

  it("unmounts the tag when Decline happens live on the page", async () => {
    const { queryAllByTestId } = render(<GoogleAnalytics />);
    await waitFor(() => expect(queryAllByTestId("ga-script").length).toBeGreaterThan(0));
    act(() => {
      writeConsent("denied");
    });
    await waitFor(() => expect(queryAllByTestId("ga-script").length).toBe(0));
  });

  it("still never loads on admin routes regardless of consent", async () => {
    writeConsent("granted");
    pathnameMock.mockReturnValue("/admin");
    const { container } = render(<GoogleAnalytics />);
    await waitFor(() => expect(container.innerHTML).toBe(""));
  });

  it("sets Consent Mode v2 defaults before config, with ad storage always denied", async () => {
    const { findAllByTestId } = render(<GoogleAnalytics />);
    const scripts = await findAllByTestId("ga-script");
    const init = scripts.find((s) => s.getAttribute("data-id") === "gtag-init");
    expect(init).toBeTruthy();
    // The inline script body is passed via dangerouslySetInnerHTML, which the
    // mock drops — assert on the component's exported builder instead.
    const { buildGtagInit } = await import("@/components/analytics/GoogleAnalytics");
    const body = buildGtagInit("G-TEST12345", "granted");
    expect(body.indexOf("consent', 'default'")).toBeGreaterThan(-1);
    expect(body.indexOf("consent', 'default'")).toBeLessThan(body.indexOf("'config'"));
    expect(body).toContain("ad_storage: 'denied'");
    expect(body).toContain("ad_user_data: 'denied'");
    expect(body).toContain("ad_personalization: 'denied'");
    expect(body).toContain("analytics_storage: 'granted'");
  });

  it("builds the init script with analytics_storage denied when that is the default", async () => {
    const { buildGtagInit } = await import("@/components/analytics/GoogleAnalytics");
    expect(buildGtagInit("G-TEST12345", "denied")).toContain("analytics_storage: 'denied'");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/analytics/google-analytics-consent.test.tsx`
Expected: FAIL — `buildGtagInit` is not exported; denied-consent cases still render scripts.

- [ ] **Step 3: Rewrite GoogleAnalytics.tsx**

Replace the file's contents from the `const GA_ID` line to the end with:

```tsx
const GA_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;

const EXCLUDED_PATHS = ["/admin"];

export const isExcludedRoute = (pathname: string | null) => {
  if (!pathname) return false;
  return EXCLUDED_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`)
  );
};

/**
 * The gtag bootstrap. Consent Mode v2 defaults are set BEFORE `config` —
 * that ordering is the whole point: gtag applies the defaults to everything
 * that follows, so a denied default never collects. Ad storage is denied
 * unconditionally; this property runs no ads product.
 */
export function buildGtagInit(gaId: string, analyticsStorage: ConsentValue): string {
  return `
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    window.gtag = gtag;
    gtag('consent', 'default', {
      analytics_storage: '${analyticsStorage}',
      ad_storage: 'denied',
      ad_user_data: 'denied',
      ad_personalization: 'denied'
    });
    gtag('js', new Date());
    // page_path is set per-event by GoogleAnalyticsInner so we don't
    // also fire it here on the initial config call.
    gtag('config', '${gaId}', { send_page_view: false });
  `;
}

function GoogleAnalyticsInner() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Re-fire page_view on every App Router navigation. Without this, only
  // the very first page after a cold load is tracked.
  useEffect(() => {
    if (!GA_ID || typeof window === "undefined") return;
    const w = window as unknown as {
      gtag?: (...args: unknown[]) => void;
    };
    if (typeof w.gtag !== "function") return;
    const query = searchParams?.toString();
    const url = pathname + (query ? `?${query}` : "");
    w.gtag("event", "page_view", {
      page_path: url,
      page_location: window.location.href,
      page_title: document.title,
    });
  }, [pathname, searchParams]);

  return null;
}

export function GoogleAnalytics() {
  const pathname = usePathname();
  // null = not yet read (pre-mount). localStorage is unavailable during SSR,
  // so consent is resolved in an effect; rendering scripts before that would
  // desync hydration.
  const [consent, setConsent] = useState<ConsentValue | null>(null);

  useEffect(() => {
    setConsent(effectiveConsent());
    const onChange = (e: Event) => {
      const next = (e as CustomEvent<ConsentValue>).detail;
      setConsent(next);
      // Tell gtag immediately if it is already on the page. The script itself
      // cannot be unloaded mid-session — this stops collection now, and the
      // tag simply never loads on subsequent page loads.
      const w = window as unknown as { gtag?: (...args: unknown[]) => void };
      if (typeof w.gtag === "function") {
        w.gtag("consent", "update", { analytics_storage: next });
      }
    };
    window.addEventListener(CONSENT_CHANGE_EVENT, onChange);
    return () => window.removeEventListener(CONSENT_CHANGE_EVENT, onChange);
  }, []);

  if (!GA_ID || isExcludedRoute(pathname)) return null;
  if (consent === null || consent === "denied") return null;

  return (
    <>
      <Script
        strategy="afterInteractive"
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
      />
      <Script
        id="gtag-init"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{ __html: buildGtagInit(GA_ID, consent) }}
      />
      {/* useSearchParams() requires a Suspense boundary in the App Router. */}
      <Suspense fallback={null}>
        <GoogleAnalyticsInner />
      </Suspense>
    </>
  );
}
```

Update the imports at the top of the file to:

```tsx
import Script from "next/script";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import {
  effectiveConsent,
  CONSENT_CHANGE_EVENT,
  type ConsentValue,
} from "@/lib/analytics/consent";
```

Also update the file's doc comment: replace the "Consent banner — DEFERRED" paragraph with a short note that consent is now live via `lib/analytics/consent.ts`, opt-out by default, and that Decline stops collection immediately and prevents the tag loading on later page loads.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/analytics/google-analytics-consent.test.tsx`
Expected: PASS (7 tests)

- [ ] **Step 5: Confirm Task 2's import now resolves**

Run: `npx vitest run tests/analytics/`
Expected: PASS (all three analytics test files, 25 tests)

- [ ] **Step 6: Commit**

```bash
git add components/analytics/GoogleAnalytics.tsx tests/analytics/google-analytics-consent.test.tsx
git commit -m "feat(analytics): gate gtag on consent + Consent Mode v2 defaults"
```

---

### Task 4: Mount the banner, lift the floating buttons, verify

**Files:**
- Modify: `app/layout.tsx` (import + mount next to `<GoogleAnalytics />`)
- Modify: `app/globals.css` (append the lift rule)
- Modify: `components/chat/WhatsAppFloatingButton.tsx:46` and `components/chat/ChatWidget.tsx:451` (add one class name each)

**Interfaces:**
- Consumes: `ConsentBanner` (Task 2).
- Produces: nothing downstream.

- [ ] **Step 1: Mount the banner**

In `app/layout.tsx`, add to the imports:

```tsx
import { ConsentBanner } from "@/components/analytics/ConsentBanner";
```

and render it immediately after `<GoogleAnalytics />`:

```tsx
        <GoogleAnalytics />
        <ConsentBanner />
```

- [ ] **Step 2: Tag the two floating buttons**

Both buttons are pinned to the bottom-right and would sit under the bar. Add the class `gto-floating-action` to each button's existing `className` string (keep every existing class):

- `components/chat/WhatsAppFloatingButton.tsx:46` — the `fixed bottom-6 right-[92px] …` button
- `components/chat/ChatWidget.tsx:451` — the `fixed bottom-6 right-6 …` button

Example (WhatsApp): `className="gto-floating-action fixed bottom-6 right-[92px] h-14 w-14 …"`

Using a dedicated class rather than a utility-class selector keeps the CSS from breaking the next time those Tailwind classes change.

- [ ] **Step 3: Append the lift rule to `app/globals.css`**

```css
/* Consent banner (spec 2026-07-25): lift the floating actions clear of the
   bar while it is visible, so it can never cover the chat/WhatsApp buttons
   on mobile. Removed the moment a choice is made. */
body.consent-banner-open .gto-floating-action {
  bottom: 6.5rem;
}
```

- [ ] **Step 4: Full verification**

Run: `npx vitest run` → Expected: **254 passing** (229 baseline + 25 new)
Run: `npx tsc --noEmit` → Expected: exactly the 3 pre-existing test-file errors, nothing new
Run: `npm run build` → Expected: clean, 85 routes

- [ ] **Step 5: Commit**

```bash
git add app/layout.tsx app/globals.css components/chat/WhatsAppFloatingButton.tsx components/chat/ChatWidget.tsx
git commit -m "feat(analytics): mount consent banner + lift floating buttons"
```

- [ ] **Step 6: STOP — no deploy**

Per Global Constraints, this ships with the mobile nav and Batch 16 in JA's single production deploy. Report to the controller instead of deploying.

---

## Self-review notes (done at write time)

- Spec coverage: opt-out default as one-line constant ✓ (T1), 12-month expiry ✓ (T1), localStorage shape ✓ (T1), Consent Mode v2 defaults before config with ads denied ✓ (T3), Decline stops GA immediately + never loads later ✓ (T3), banner UI with equal-weight buttons + privacy link ✓ (T2), never on `/admin` ✓ (T2 via T3's exported helper), floating buttons lift ✓ (T4), `trackEvent` unchanged ✓ (untouched by design).
- Deviation, documented: the spec says Decline means "gtag.js never loads" — true for subsequent loads, but a script already on the page cannot be unloaded, so the live-Decline path also fires `consent update`. Comments and the plan say this plainly rather than overclaiming.
- Cross-task dependency called out explicitly: Task 2 imports `isExcludedRoute`, which Task 3 exports. Sequencing note is in Task 2's Interfaces block with a stop-and-report instruction rather than a silent duplicate list.
- Test counts: 11 + 7 + 7 = 25 new, matching Task 4's expected 254.

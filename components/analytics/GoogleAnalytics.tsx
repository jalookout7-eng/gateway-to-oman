"use client";

import Script from "next/script";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import {
  effectiveConsent,
  CONSENT_CHANGE_EVENT,
  CONSENT_STORAGE_KEY,
  type ConsentValue,
} from "@/lib/analytics/consent";

/**
 * Google Analytics 4 (Notes 7).
 *
 * Drops the official gtag.js into the page and re-fires a `page_view`
 * event whenever the App Router pathname or search params change (Next.js
 * doesn't reload between routes, so the default gtag page_view only fires
 * once on first paint — that would miss every SPA navigation).
 *
 * The measurement ID is read from `NEXT_PUBLIC_GA_MEASUREMENT_ID` (set in
 * Vercel env, format `G-XXXXXXXXXX`). If the env var is missing the whole
 * component renders nothing — safe to commit + deploy with no value set;
 * the integration "turns on" the moment the env var lands and is redeployed.
 *
 * Consent is live via `lib/analytics/consent.ts` (spec
 * 2026-07-25-consent-banner-design.md). Opt-out by default: with no stored
 * choice, gtag loads with Consent Mode v2 defaults reflecting
 * `CONSENT_DEFAULT`, and the banner asks. Decline stops collection
 * immediately via `gtag('consent', 'update', ...)` — but the script itself
 * cannot be unloaded mid-session once it's on the page; it simply never
 * loads again on subsequent page loads.
 *
 * Pages/sections listed in EXCLUDED_PATHS are excluded entirely (gtag.js
 * never loads there) so their usage doesn't pollute visitor analytics — the
 * script itself is gone, not just the manual page_view, so GA4 Enhanced
 * Measurement can't autotrack scroll/clicks there either. To stop tracking
 * a new page or section, add its path below — no other changes needed.
 * Each entry excludes that exact path AND everything under it
 * (e.g. "/admin" also covers "/admin/leads", "/admin/settings", etc).
 *
 * To track custom conversions, import `trackEvent()` from `lib/analytics/track.ts`.
 */

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

    const applyConsent = (next: ConsentValue) => {
      setConsent(next);
      const w = window as unknown as {
        gtag?: (...args: unknown[]) => void;
        [key: `ga-disable-${string}`]: boolean | undefined;
      };
      // Tell gtag immediately if it is already on the page. This flips
      // Consent Mode's analytics_storage signal going forward — it does NOT
      // retroactively erase hits already sent, and the script tag itself
      // stays loaded for the rest of this page view (it simply never loads
      // again on a later page load once Decline persists).
      if (typeof w.gtag === "function") {
        w.gtag("consent", "update", { analytics_storage: next });
      }
      // Google's documented per-property kill switch (gtag.js checks this
      // before every hit). Consent Mode alone isn't enough on a live
      // Decline: GA4 Enhanced Measurement and trackEvent() calls keep firing
      // cookieless pings as long as gtag.js is loaded, and this flag is what
      // actually stops those. Reset to false on a later Accept in the same
      // session so re-enabling works without a reload.
      if (GA_ID) {
        w[`ga-disable-${GA_ID}`] = next === "denied";
      }
    };

    const onChange = (e: Event) => {
      applyConsent((e as CustomEvent<ConsentValue>).detail);
    };
    window.addEventListener(CONSENT_CHANGE_EVENT, onChange);

    // Cross-tab: writeConsent() only dispatches CONSENT_CHANGE_EVENT in the
    // tab that made the choice. The browser's `storage` event fires in every
    // OTHER open tab once the localStorage write lands (never in the
    // writing tab), so this is what keeps a Decline in tab B from leaving
    // tab A's already-loaded gtag instance collecting until its next load.
    const onStorage = (e: StorageEvent) => {
      if (e.key !== CONSENT_STORAGE_KEY) return;
      applyConsent(effectiveConsent());
    };
    window.addEventListener("storage", onStorage);

    return () => {
      window.removeEventListener(CONSENT_CHANGE_EVENT, onChange);
      window.removeEventListener("storage", onStorage);
    };
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

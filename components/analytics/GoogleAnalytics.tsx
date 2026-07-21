"use client";

import Script from "next/script";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense, useEffect } from "react";

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
 * Consent banner — DEFERRED (Notes 7 — JA "later, but priority"). Once the
 * banner ships, the gating pattern is:
 *   1. Initialise gtag with Consent Mode v2 defaults (analytics_storage='denied')
 *   2. On Accept click, call `gtag('consent', 'update', {analytics_storage:'granted'})`
 * The current component fires events unconditionally — known compliance gap
 * documented in HANDOVER §11.
 *
 * `/admin/*` is excluded entirely (gtag.js never loads there) so internal
 * dashboard usage doesn't pollute visitor analytics — the script itself is
 * gone, not just the manual page_view, so GA4 Enhanced Measurement can't
 * autotrack scroll/clicks on admin pages either.
 *
 * To track custom conversions, import `trackEvent()` from `lib/analytics/track.ts`.
 */

const GA_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
const isAdminRoute = (pathname: string | null) =>
  pathname === "/admin" || (pathname?.startsWith("/admin/") ?? false);

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
  if (!GA_ID || isAdminRoute(pathname)) return null;
  return (
    <>
      <Script
        strategy="afterInteractive"
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
      />
      <Script
        id="gtag-init"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            window.gtag = gtag;
            gtag('js', new Date());
            // page_path is set per-event by GoogleAnalyticsInner so we don't
            // also fire it here on the initial config call.
            gtag('config', '${GA_ID}', { send_page_view: false });
          `,
        }}
      />
      {/* useSearchParams() requires a Suspense boundary in the App Router. */}
      <Suspense fallback={null}>
        <GoogleAnalyticsInner />
      </Suspense>
    </>
  );
}

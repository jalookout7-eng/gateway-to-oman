"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
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
  const bannerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
    setDecided(readConsent() !== null);
  }, []);

  const visible = mounted && !decided && !isExcludedRoute(pathname);

  // Lift the floating WhatsApp/Omar buttons while the bar occupies the
  // bottom edge (see .consent-banner-open in globals.css), and keep the
  // lift accurate to the banner's REAL rendered height — it wraps to 2-3
  // lines on narrow phones once the copy grows, so a hardcoded lift value
  // falls short there. A ResizeObserver publishes the live height as a CSS
  // custom property that globals.css consumes; both the class and the
  // property are cleared together in the same cleanup so they can never
  // drift out of sync.
  useEffect(() => {
    if (!visible) {
      document.body.classList.remove("consent-banner-open");
      document.body.style.removeProperty("--consent-banner-h");
      return;
    }

    document.body.classList.add("consent-banner-open");

    const el = bannerRef.current;
    const setHeight = (height: number) => {
      document.body.style.setProperty("--consent-banner-h", `${height}px`);
    };

    // Set once synchronously on mount so the lift is correct immediately,
    // and so the behavior is observable in environments (tests) where no
    // ResizeObserver ever actually fires.
    if (el) setHeight(el.getBoundingClientRect().height);

    let observer: ResizeObserver | undefined;
    if (el && typeof ResizeObserver !== "undefined") {
      observer = new ResizeObserver((entries) => {
        const entry = entries[0];
        if (entry) setHeight(entry.contentRect.height);
      });
      observer.observe(el);
    }

    return () => {
      document.body.classList.remove("consent-banner-open");
      document.body.style.removeProperty("--consent-banner-h");
      observer?.disconnect();
    };
  }, [visible]);

  if (!visible) return null;

  function choose(value: ConsentValue) {
    writeConsent(value);
    setDecided(true);
  }

  // z-40, NOT z-50+: the Omar chat window, its teaser bubble, and the
  // floating action buttons all sit at z-50 and must stack ABOVE this
  // banner, or the banner covers the chat input for every undecided (i.e.
  // every first-time) visitor. Nothing on public pages occupies
  // z-40..z-50, so this is a safe gap. The admin mobile nav also uses
  // z-40, but this banner never renders on /admin (isExcludedRoute). Do
  // not raise this back toward z-50+ without re-checking that.
  return (
    <div
      ref={bannerRef}
      role="region"
      aria-label="Cookie consent"
      className="fixed bottom-0 left-0 right-0 z-40 bg-navy text-white px-4 py-3 shadow-lg"
    >
      <div className="mx-auto max-w-5xl flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6">
        <p className="text-sm text-white/90 flex-1">
          We use analytics to understand how this site is used and improve it.{" "}
          <Link href="/privacy" className="underline hover:text-gold transition-colors">
            Privacy policy
          </Link>
          .
        </p>
        {/* Respect the iPhone home-indicator safe area in PWA/standalone
            mode so the buttons don't sit under it. */}
        <div
          className="flex gap-3 flex-shrink-0"
          style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
        >
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

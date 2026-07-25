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

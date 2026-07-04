"use client";

import Link from "next/link";
import { Lock, LogIn, ShieldCheck, ArrowRight } from "lucide-react";
import { formatOMR } from "@/lib/businesses/format";
import { trackEvent } from "@/lib/analytics/track";
import { TrackOnMount } from "@/components/analytics/TrackOnMount";

/**
 * Overlay shown on top of a blurred listings grid when a visitor is not an
 * activated subscriber. Offers the two ways forward: sign in (existing account)
 * or request access (new subscriber — one-time fee, team approves in the admin).
 */
export function PaywallOverlay({ fee }: { fee: number }) {
  return (
    <div className="absolute inset-0 z-20 flex items-start justify-center px-4 pt-12 sm:pt-20">
      <TrackOnMount event="paywall_view" params={{ fee }} />
      <div className="w-full max-w-lg rounded-2xl bg-white/95 backdrop-blur ring-1 ring-gray-200 shadow-xl overflow-hidden">
        <div className="bg-gradient-to-br from-navy to-navy-light px-7 py-6 text-white">
          <span className="inline-flex items-center gap-2 rounded-full bg-gold/20 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-gold-light ring-1 ring-gold/30">
            <Lock className="h-3.5 w-3.5" />
            Subscriber access required
          </span>
          <h2 className="mt-4 font-heading text-2xl font-semibold leading-tight">
            Browse the full marketplace
          </h2>
          <p className="mt-2 text-sm text-gray-200 leading-relaxed">
            Full listings — financials, ownership, location and contact paths —
            are open to vetted subscribers. It&apos;s a one-time access fee, then
            you&apos;re in.
          </p>
        </div>

        <div className="px-7 py-5 border-b border-gray-100 bg-warm-cream/40 flex items-baseline justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
              One-time access fee
            </p>
            <p className="mt-1 font-heading text-3xl font-semibold text-gold">
              {formatOMR(fee)}
            </p>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-gray-500">
            <ShieldCheck className="h-4 w-4 text-gold" />
            Vetted listings only
          </div>
        </div>

        <div className="px-7 py-6 space-y-3">
          <Link
            href="/businesses/access"
            onClick={() => trackEvent("cta_click", { surface: "paywall", cta: "request_access" })}
            className="flex w-full items-center justify-center gap-2 rounded-lg gold-gradient px-5 py-3 text-sm font-semibold text-white shadow-sm hover:shadow-md transition-shadow"
          >
            Request subscriber access
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href="/businesses/sign-in"
            onClick={() => trackEvent("cta_click", { surface: "paywall", cta: "sign_in" })}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-5 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <LogIn className="h-4 w-4" />
            I already have an account
          </Link>
        </div>
      </div>
    </div>
  );
}

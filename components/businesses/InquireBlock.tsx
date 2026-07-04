"use client";

import { useState } from "react";
import { MessageCircle, Mail } from "lucide-react";
import type { Listing } from "@/lib/businesses/types";
import { trackEvent } from "@/lib/analytics/track";

export function InquireBlock({ listing }: { listing: Listing }) {
  const [submitted, setSubmitted] = useState(false);

  const whatsappMessage = encodeURIComponent(
    `Hi, I'm interested in the listing "${listing.title}" on Gateway to Oman businesses.`,
  );

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    trackEvent("inquire_submit", {
      listing: listing.slug,
      category: listing.category_slug,
    });
    setSubmitted(true);
  }

  return (
    <div className="rounded-xl bg-white ring-1 ring-gray-200 p-6 shadow-sm">
      <h3 className="font-heading text-xl font-semibold text-navy">Interested in this listing?</h3>
      <p className="mt-1.5 text-sm text-gray-600">
        Inquire directly. Gateway to Oman connects you with the seller and supports the transaction
        on both sides.
      </p>

      <a
        href={`https://wa.me/?text=${whatsappMessage}`}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() =>
          trackEvent("whatsapp_click", {
            surface: "listing_detail",
            source: "inquire_block",
            listing: listing.slug,
          })
        }
        className="mt-5 flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-500 px-5 py-3 text-base font-semibold text-white shadow-sm hover:bg-emerald-600 transition-colors"
      >
        <MessageCircle className="h-5 w-5" />
        Inquire on WhatsApp
      </a>

      <div className="mt-5 flex items-center gap-3">
        <span className="h-px flex-1 bg-gray-200" />
        <span className="text-xs uppercase tracking-wider text-gray-400">or</span>
        <span className="h-px flex-1 bg-gray-200" />
      </div>

      {submitted ? (
        <div className="mt-5 rounded-lg bg-emerald-50 p-4 text-sm text-emerald-800 ring-1 ring-emerald-200">
          <p className="font-semibold">Thanks — your inquiry is in.</p>
          <p className="mt-1 text-emerald-700">
            Gateway to Oman will be in touch shortly. Watch your inbox and WhatsApp.
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="mt-5 space-y-3">
          <input
            type="text"
            placeholder="Your name"
            required
            className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm focus:border-gold focus:ring-2 focus:ring-gold/20 outline-none"
          />
          <input
            type="email"
            placeholder="Email address"
            required
            className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm focus:border-gold focus:ring-2 focus:ring-gold/20 outline-none"
          />
          <input
            type="tel"
            placeholder="WhatsApp / phone number"
            className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm focus:border-gold focus:ring-2 focus:ring-gold/20 outline-none"
          />
          <textarea
            placeholder="Optional — anything you'd like the seller to know"
            rows={3}
            className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm focus:border-gold focus:ring-2 focus:ring-gold/20 outline-none resize-none"
          />
          <button
            type="submit"
            className="w-full rounded-lg bg-navy px-5 py-3 text-base font-semibold text-white hover:bg-navy-light transition-colors"
          >
            Send inquiry
          </button>
        </form>
      )}

      <p className="mt-5 flex items-center gap-2 text-xs text-gray-500">
        <Mail className="h-3.5 w-3.5" />
        Inquiries route to the GTO admin and the seller simultaneously.
      </p>
    </div>
  );
}

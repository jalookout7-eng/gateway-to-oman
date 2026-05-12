"use client";

import { useState } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";

export function AccessRequestForm({ referredListingSlug }: { referredListingSlug?: string }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/businesses/access-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, phone, message, listing: referredListingSlug }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Submission failed");
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Submission failed");
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div className="rounded-xl bg-emerald-50 ring-1 ring-emerald-200 p-6 text-center">
        <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-500" />
        <p className="mt-3 font-heading text-lg font-semibold text-emerald-900">
          Your request is in.
        </p>
        <p className="mt-2 text-sm text-emerald-800">
          Our team will be in touch within 24 hours with the invoice and access details.
          Watch your email and WhatsApp.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">Your name</label>
        <input
          type="text"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm focus:border-gold focus:ring-2 focus:ring-gold/20 outline-none"
          placeholder="Full name"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm focus:border-gold focus:ring-2 focus:ring-gold/20 outline-none"
            placeholder="you@example.com"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Mobile number</label>
          <input
            type="tel"
            required
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm focus:border-gold focus:ring-2 focus:ring-gold/20 outline-none"
            placeholder="+968 9XXX XXXX"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          What are you looking for?
        </label>
        <textarea
          required
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={4}
          className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm focus:border-gold focus:ring-2 focus:ring-gold/20 outline-none resize-none"
          placeholder="Briefly — sector, budget range, timeline, what would make a business a fit for you."
        />
      </div>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 ring-1 ring-red-200 rounded-lg px-4 py-2.5">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="w-full inline-flex items-center justify-center gap-2 rounded-lg gold-gradient px-6 py-3 text-base font-semibold text-white shadow-md shadow-gold/30 hover:shadow-lg hover:shadow-gold/40 transition-all disabled:opacity-60"
      >
        {submitting ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Sending…
          </>
        ) : (
          "Request access"
        )}
      </button>

      <p className="text-xs text-gray-500 text-center">
        By submitting, you agree to be contacted by Gateway to Oman regarding marketplace access.
      </p>
    </form>
  );
}

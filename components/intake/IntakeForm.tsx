"use client";

import { useState } from "react";
import { Loader2, CheckCircle2 } from "lucide-react";
import {
  INVESTMENT_TIMELINES,
  INVESTMENT_PURPOSES,
  PREFERRED_LOCATIONS,
  RESIDENCY_OPTIONS,
  SERVICES_OPTIONS,
} from "@/lib/intake/constants";
import { trackEvent } from "@/lib/analytics/track";

type FormState = "idle" | "submitting" | "success" | "error";

/**
 * Shared intake form. Rendered full-width on /intake and inside the timed
 * popup, which is why sizing is driven by the parent container rather than
 * fixed widths here.
 *
 * `text-base sm:text-sm` on every focusable field is deliberate: iOS
 * auto-zooms on focus when a field is under 16px and never zooms back out.
 */

// Shared field styling. Repeated as a constant rather than a component so
// the native <select> and <textarea> semantics stay untouched.
const FIELD_CLASS =
  "w-full rounded-lg border border-gray-200 bg-warm-white px-3 py-2.5 text-base sm:text-sm " +
  "text-navy focus:border-gold focus:ring-2 focus:ring-gold/20 outline-none transition-all";

const LABEL_CLASS = "block text-sm font-medium text-gray-700 mb-1";

export interface IntakeFormProps {
  variant: "page" | "popup";
  onSubmitted?: () => void;
}

export function IntakeForm({ variant, onSubmitted }: IntakeFormProps) {
  const [state, setState] = useState<FormState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [services, setServices] = useState<string[]>([]);

  function toggleService(service: string) {
    setServices((prev) =>
      prev.includes(service) ? prev.filter((s) => s !== service) : [...prev, service],
    );
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (state === "submitting") return;
    setState("submitting");
    setError(null);

    const fd = new FormData(e.currentTarget);
    const payload = {
      name: String(fd.get("name") ?? ""),
      email: String(fd.get("email") ?? ""),
      phone: String(fd.get("phone") ?? ""),
      countryCode: String(fd.get("countryCode") ?? ""),
      countryOfResidence: String(fd.get("countryOfResidence") ?? ""),
      investmentTimeline: String(fd.get("investmentTimeline") ?? ""),
      investmentPurpose: String(fd.get("investmentPurpose") ?? ""),
      preferredLocation: String(fd.get("preferredLocation") ?? ""),
      residencyInterest: String(fd.get("residencyInterest") ?? ""),
      servicesNeeded: services,
      additionalComments: String(fd.get("additionalComments") ?? ""),
      _trap: String(fd.get("_trap") ?? ""),
    };

    try {
      const res = await fetch("/api/intake", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Something went wrong. Please try again.");
        setState("error");
        return;
      }
      trackEvent("intake_submit", { location: variant });
      setState("success");
      onSubmitted?.();
    } catch {
      setError("Connection error. Please try again.");
      setState("error");
    }
  }

  if (state === "success") {
    return (
      <div className="flex flex-col items-center gap-4 py-10 text-center">
        <div className="w-14 h-14 rounded-full bg-gold/15 flex items-center justify-center">
          <CheckCircle2 className="w-7 h-7 text-gold" />
        </div>
        <h2 className="font-heading text-2xl text-navy">Thank you</h2>
        <p className="text-sm text-gray-600 max-w-sm">
          Your enquiry has reached the Gateway to Oman team. We will review it and get back to you
          shortly.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Honeypot. Real visitors never see or tab to this; bots fill it. */}
      <input
        type="text"
        name="_trap"
        autoComplete="off"
        tabIndex={-1}
        aria-hidden="true"
        className="hidden"
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="intake-name" className={LABEL_CLASS}>
            Full Name <span className="text-red-500">*</span>
          </label>
          <input id="intake-name" name="name" required maxLength={120}
            placeholder="Jane Smith" className={FIELD_CLASS} />
        </div>
        <div>
          <label htmlFor="intake-email" className={LABEL_CLASS}>
            Email Address <span className="text-red-500">*</span>
          </label>
          <input id="intake-email" name="email" type="email" required maxLength={200}
            placeholder="jane@example.com" className={FIELD_CLASS} />
        </div>
        <div>
          <label htmlFor="intake-code" className={LABEL_CLASS}>Country Code</label>
          <input id="intake-code" name="countryCode" maxLength={8}
            placeholder="+968" className={FIELD_CLASS} />
        </div>
        <div>
          <label htmlFor="intake-phone" className={LABEL_CLASS}>Phone Number</label>
          <input id="intake-phone" name="phone" type="tel" maxLength={30}
            placeholder="9123 4567" className={FIELD_CLASS} />
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="intake-country" className={LABEL_CLASS}>Country of Residence</label>
          <input id="intake-country" name="countryOfResidence" maxLength={100}
            placeholder="United Kingdom" className={FIELD_CLASS} />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="intake-timeline" className={LABEL_CLASS}>Investment Timeline</label>
          <select id="intake-timeline" name="investmentTimeline" className={FIELD_CLASS} defaultValue="">
            <option value="">Select an option</option>
            {INVESTMENT_TIMELINES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="intake-purpose" className={LABEL_CLASS}>Purpose</label>
          <select id="intake-purpose" name="investmentPurpose" className={FIELD_CLASS} defaultValue="">
            <option value="">Select an option</option>
            {INVESTMENT_PURPOSES.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="intake-location" className={LABEL_CLASS}>Preferred Location in Oman</label>
          <select id="intake-location" name="preferredLocation" className={FIELD_CLASS} defaultValue="">
            <option value="">Select an option</option>
            {PREFERRED_LOCATIONS.map((l) => <option key={l} value={l}>{l}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="intake-residency" className={LABEL_CLASS}>Residency or Sponsorship Interest</label>
          <select id="intake-residency" name="residencyInterest" className={FIELD_CLASS} defaultValue="">
            <option value="">Select an option</option>
            {RESIDENCY_OPTIONS.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>
      </div>

      <fieldset>
        <legend className={LABEL_CLASS}>Services Needed</legend>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {SERVICES_OPTIONS.map((s) => (
            <label key={s} className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer select-none">
              <input
                type="checkbox"
                aria-label={s}
                checked={services.includes(s)}
                onChange={() => toggleService(s)}
                className="h-4 w-4 rounded border-gray-300 text-gold focus:ring-gold/30"
              />
              {s}
            </label>
          ))}
        </div>
      </fieldset>

      <div>
        <label htmlFor="intake-comments" className={LABEL_CLASS}>
          Additional Comments or Questions
        </label>
        <textarea
          id="intake-comments"
          name="additionalComments"
          maxLength={2000}
          rows={variant === "popup" ? 3 : 4}
          placeholder="Anything else you would like us to know"
          // In the popup, desktop gets a shorter box so the whole form fits a
          // laptop screen without scrolling past the close button. `rows` is
          // not responsive, so the desktop height is a CSS override and the
          // mobile height (rows=3) is left exactly as it was.
          className={`${FIELD_CLASS} resize-none${variant === "popup" ? " sm:h-16" : ""}`}
        />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={state === "submitting"}
        className="w-full gold-gradient text-white font-semibold rounded-lg px-6 py-3 inline-flex items-center justify-center gap-2 shadow-md shadow-gold/20 hover:shadow-lg transition-shadow disabled:opacity-60"
      >
        {state === "submitting" && <Loader2 className="w-4 h-4 animate-spin" />}
        {state === "submitting" ? "Submitting" : "Submit Enquiry"}
      </button>
    </form>
  );
}

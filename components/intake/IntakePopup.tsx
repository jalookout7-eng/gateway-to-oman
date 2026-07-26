"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { X } from "lucide-react";
import { IntakeForm } from "@/components/intake/IntakeForm";
import { trackEvent } from "@/lib/analytics/track";
import {
  INTAKE_POPUP_DELAY_MS,
  readPopupGateState,
  shouldArmIntakePopup,
  markIntakeDismissed,
  markIntakeSubmitted,
  broadcastIntakeDismissed,
} from "@/lib/intake/popup";

/**
 * Timed intake popup (spec 2026-07-26): fires 8 seconds into a visit, on
 * the main home page and the marketplace home page only.
 *
 * z-[60] is above the consent banner (z-40) and the Omar chat (z-50). That
 * is intentional for a modal, and safe: this closes in one click and the
 * banner is interactive again immediately. Gating on a consent decision was
 * rejected, because the banner persists until clicked and indifferent
 * visitors would then never see the popup at all.
 *
 * Sizing note (JA click-test 2026-07-27): the dialog is top-aligned at every
 * width, never vertically centred. A centred flex child taller than the
 * viewport overflows ABOVE the scroll origin, which put the close button out
 * of reach on a short laptop screen. Desktop also gets a wider card and a
 * shorter comments box; the mobile layout is deliberately untouched, so
 * every change here is behind `sm:`.
 */
export function IntakePopup() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    // Storage is only readable after mount, so arming happens here rather
    // than during render (the same constraint the consent banner has).
    if (!shouldArmIntakePopup(readPopupGateState(pathname))) return;

    const timer = window.setTimeout(() => {
      // Re-check at fire time: the visitor may have opened the chat or
      // submitted the form during the 15 seconds.
      if (!shouldArmIntakePopup(readPopupGateState(pathname))) return;
      setOpen(true);
      trackEvent("intake_popup_shown", { path: pathname });
    }, INTAKE_POPUP_DELAY_MS);

    return () => window.clearTimeout(timer);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") close();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  });

  function close() {
    markIntakeDismissed();
    trackEvent("intake_popup_dismissed", { path: pathname, submitted });
    setOpen(false);
    // Hand the visitor over to Omar only if they walked away without
    // submitting. Someone who filled the form in is already captured, and
    // popping a chat teaser at them would be pestering, not helping.
    if (!submitted) broadcastIntakeDismissed();
  }

  function handleSubmitted() {
    // Persistent, unlike the dismissal: someone who submitted is never
    // prompted again, on this visit or any later one.
    markIntakeSubmitted();
    setSubmitted(true);
  }

  if (!open) return null;

  return (
    <div
      data-testid="intake-popup-backdrop"
      onClick={close}
      className="fixed inset-0 z-[60] bg-navy/60 backdrop-blur-sm flex items-start justify-center p-4 sm:py-6 overflow-y-auto"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="intake-popup-title"
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-lg sm:max-w-2xl bg-white rounded-2xl shadow-2xl my-8 sm:my-0 p-5 sm:p-6"
      >
        <button
          type="button"
          onClick={close}
          aria-label="Close"
          className="absolute top-3 right-3 p-1.5 rounded-lg text-gray-400 hover:text-navy hover:bg-gray-100 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <h2 id="intake-popup-title" className="font-heading text-2xl text-navy pr-8">
          Planning a move to Oman?
        </h2>
        <p className="mt-1.5 mb-5 text-sm text-gray-600">
          Tell us what you are exploring and our advisory team will be in touch.
        </p>

        <IntakeForm variant="popup" onSubmitted={handleSubmitted} />
      </div>
    </div>
  );
}

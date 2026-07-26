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
} from "@/lib/intake/popup";

/**
 * Timed intake popup (spec 2026-07-26): fires 15 seconds into a visit, on
 * the main home page and the marketplace home page only.
 *
 * z-[60] is above the consent banner (z-40) and the Omar chat (z-50). That
 * is intentional for a modal, and safe: this closes in one click and the
 * banner is interactive again immediately. Gating on a consent decision was
 * rejected, because the banner persists until clicked and indifferent
 * visitors would then never see the popup at all.
 */
export function IntakePopup() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

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
    trackEvent("intake_popup_dismissed", { path: pathname });
    setOpen(false);
  }

  function handleSubmitted() {
    // Persistent, unlike the dismissal: someone who submitted is never
    // prompted again, on this visit or any later one.
    markIntakeSubmitted();
  }

  if (!open) return null;

  return (
    <div
      data-testid="intake-popup-backdrop"
      onClick={close}
      className="fixed inset-0 z-[60] bg-navy/60 backdrop-blur-sm flex items-start sm:items-center justify-center p-4 overflow-y-auto"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="intake-popup-title"
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl my-8 p-5 sm:p-7"
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

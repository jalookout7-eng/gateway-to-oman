"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowRight, Minus } from "lucide-react";

/**
 * The idle screen shown when Omar is opened with no conversation yet
 * (AWS "Ask AWS" pattern in GTO navy/gold — spec 2026-07-25).
 *
 * Deliberately stateless beyond its own input: `onStart` hands the text to
 * ChatWidget, which owns every piece of conversation state. Once a message
 * exists this panel is gone for the session, so it never competes with the
 * message list for control.
 */

/**
 * Chip copy maps onto Omar's qualification segments (entrepreneur/investor,
 * professional, retiree), so the first click already advances qualification
 * instead of costing an exchange.
 */
export const STARTER_CHIPS = [
  "I want to explore business or investment opportunities",
  "I'm considering relocating or working in Oman",
  "I'm planning retirement in Oman",
] as const;

export function ChatIdlePanel({
  onStart,
  onMinimize,
}: {
  onStart: (text: string) => void;
  onMinimize: () => void;
}) {
  const [draft, setDraft] = useState("");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const text = draft.trim();
    if (!text) return;
    setDraft("");
    onStart(text);
  }

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      {/* Header block — navy gradient with a gold underline accent. */}
      <div className="bg-gradient-to-b from-navy to-[#252542] px-5 pt-4 pb-6 border-b-2 border-gold/60 flex-shrink-0">
        <div className="flex justify-end">
          <button
            type="button"
            onClick={onMinimize}
            aria-label="Minimize chat"
            className="text-white/80 hover:text-white p-1 -m-1 rounded-md hover:bg-white/10 transition-colors"
          >
            <Minus className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-1 flex items-center gap-2.5">
          <h2 className="text-white text-2xl font-bold leading-none">Ask Omar</h2>
          <span className="inline-flex items-center rounded-md border border-white/40 px-2 py-0.5 text-[11px] font-medium text-white/90">
            AI advisor
          </span>
        </div>

        <p className="mt-2.5 text-sm text-white/80 leading-relaxed">
          Get guidance on investing, relocating, and doing business in Oman.
        </p>

        <form onSubmit={submit} className="mt-4 relative">
          <input
            type="text"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Ask a question"
            aria-label="Ask a question"
            className="w-full rounded-lg bg-white py-3 pl-4 pr-12 text-sm text-navy placeholder:text-gray-400 outline-none focus:ring-2 focus:ring-gold/50"
          />
          <button
            type="submit"
            aria-label="Send"
            className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full gold-gradient text-white flex items-center justify-center hover:shadow-md transition-shadow"
          >
            <ArrowRight className="h-4 w-4" />
          </button>
        </form>
      </div>

      {/* Starter chips */}
      <div className="flex-1 px-5 py-5">
        <h3 className="text-navy font-semibold text-base">Want help getting started?</h3>
        <p className="mt-1 text-sm text-gray-500">
          Tell us a little bit about what you&apos;re looking for.
        </p>

        <div className="mt-4 flex flex-col gap-2.5">
          {STARTER_CHIPS.map((chip) => (
            <button
              key={chip}
              type="button"
              onClick={() => onStart(chip)}
              className="text-left rounded-xl border border-gold/40 bg-gradient-to-r from-gold/10 to-navy/5 px-4 py-3 text-sm text-navy hover:border-gold hover:shadow-sm transition-all"
            >
              {chip}
            </button>
          ))}
        </div>
      </div>

      <p className="flex-shrink-0 px-5 pb-4 text-center text-xs text-gray-400">
        By chatting, you agree to this{" "}
        <Link href="/terms" className="text-gray-500 underline hover:text-navy transition-colors">
          disclaimer
        </Link>
        .
      </p>
    </div>
  );
}

"use client";

import { useState, useEffect, useRef } from "react";

interface ChatInputProps {
  onSend: (message: string) => void;
  disabled: boolean;
}

export function ChatInput({ onSend, disabled }: ChatInputProps) {
  const [text, setText] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // Re-focus the input after Omar finishes typing (Notes 4) — keeps the
  // visitor on the keyboard so the next exchange flows without an extra
  // tap. Only fires on desktop and tablet; on iOS we deliberately skip
  // auto-focus because it would force the on-screen keyboard back up
  // every reply, which is more annoying than the missed focus.
  useEffect(() => {
    if (!disabled && inputRef.current) {
      // Touch heuristic — `matchMedia("(pointer: coarse)")` is the safest
      // way to detect a phone/tablet without UA sniffing. Coarse-pointer
      // devices keep manual focus control.
      const isCoarsePointer =
        typeof window !== "undefined" &&
        window.matchMedia &&
        window.matchMedia("(pointer: coarse)").matches;
      if (!isCoarsePointer) {
        inputRef.current.focus({ preventScroll: true });
      }
    }
  }, [disabled]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (text.trim() && !disabled) {
      onSend(text.trim());
      setText("");
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      // flex-shrink-0 so the input is never squeezed out of view when the
      // parent flex column runs out of vertical space (Notes 3 item 5 — the
      // ChatModal input was vanishing on shorter viewports because the
      // messages area's flex-1 was winning the layout fight).
      className="flex items-center gap-2 px-3 py-2 border-t border-gray-100 bg-white flex-shrink-0"
    >
      <input
        ref={inputRef}
        type="text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Message..."
        disabled={disabled}
        style={{ fontSize: "16px" }}
        className="flex-1 bg-gray-100 rounded-full px-4 py-2.5 outline-none focus:ring-2 focus:ring-gold/20 placeholder:text-gray-400 text-navy"
      />
      <button
        type="submit"
        disabled={disabled || !text.trim()}
        className="w-10 h-10 rounded-full gold-gradient text-white flex items-center justify-center flex-shrink-0 disabled:opacity-40 active:scale-95 transition-transform"
        aria-label="Send message"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="M5 12h14M12 5l7 7-7 7" />
        </svg>
      </button>
    </form>
  );
}

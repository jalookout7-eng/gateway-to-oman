"use client";

import { useEffect, useRef, useState } from "react";
import { Menu } from "lucide-react";

interface ChatHeaderMenuProps {
  onConnect: () => void;
  onCloseSession: () => void;
}

/**
 * ChatHeaderMenu — replaces the decorative Omar avatar in the open widget's
 * header with a menu button offering two actions: connect with a human
 * representative (skips Omar's opt-in prompt and jumps straight to the lead
 * capture form), or close the session entirely (distinct from the minimize
 * dash — this ends the conversation rather than just hiding the widget).
 *
 * Keeps the avatar's 36px round footprint so the header layout doesn't
 * shift.
 */
export function ChatHeaderMenu({ onConnect, onCloseSession }: ChatHeaderMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close on Escape, wherever focus happens to be.
  useEffect(() => {
    if (!isOpen) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setIsOpen(false);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen]);

  // Close on any click outside the trigger + panel.
  useEffect(() => {
    if (!isOpen) return;
    function onDocumentClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", onDocumentClick);
    return () => document.removeEventListener("mousedown", onDocumentClick);
  }, [isOpen]);

  return (
    <div ref={containerRef} className="relative flex-shrink-0">
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-label="Chat options"
        aria-haspopup="menu"
        aria-expanded={isOpen}
        className="h-9 w-9 rounded-full bg-white/15 flex items-center justify-center text-white hover:bg-white/25 transition-colors"
      >
        <Menu className="h-4 w-4" />
      </button>

      {isOpen && (
        <div
          role="menu"
          className="absolute left-0 top-11 z-10 w-64 rounded-lg bg-white shadow-xl border border-gray-200 py-1"
        >
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setIsOpen(false);
              onConnect();
            }}
            className="w-full text-left px-4 py-2.5 text-sm text-navy hover:bg-gray-50 transition-colors"
          >
            Connect with a representative
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setIsOpen(false);
              onCloseSession();
            }}
            className="w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
          >
            Close session
          </button>
        </div>
      )}
    </div>
  );
}

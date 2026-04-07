"use client";

import { useState } from "react";

interface ChatInputProps {
  onSend: (message: string) => void;
  disabled: boolean;
}

export function ChatInput({ onSend, disabled }: ChatInputProps) {
  const [text, setText] = useState("");

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
      className="flex items-center gap-2 px-3 py-2 border-t border-gray-100 bg-white"
    >
      <input
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

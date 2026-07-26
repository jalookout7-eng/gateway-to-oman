export interface Signals {
  captureReady: boolean;
  segment: string | null;
  interest: string | null;
  highIntent: boolean;
  closeChat: boolean;
  bookingDay: string | null;
  bookingTime: string | null;
  whatsappHandoff: boolean;
  kbGap: boolean;
}

const VALID_SEGMENTS = ["entrepreneur", "investor", "professional", "retiree"];

export function parseSignals(text: string): Signals {
  // Extract segment — handle malformed outputs like [SEGMENT:entrepreneur|investor|...]
  const segmentMatch = text.match(/\[SEGMENT:([^\]]+)\]/);
  let segment: string | null = null;
  if (segmentMatch) {
    // If AI output multiple options with pipes, take the first valid one
    const candidates = segmentMatch[1].split(/[|,/]/).map(s => s.trim().toLowerCase());
    segment = candidates.find(c => VALID_SEGMENTS.includes(c)) ?? null;
  }

  return {
    captureReady: /\[CAPTURE_READY\]/.test(text),
    segment,
    interest: text.match(/\[INTEREST:([^\]]+)\]/)?.[1]?.trim() ?? null,
    highIntent: /\[HIGH_INTENT\]/.test(text),
    closeChat: /\[CLOSE_CHAT\]/.test(text),
    bookingDay: text.match(/\[BOOKING_DAY:([^\]]+)\]/)?.[1]?.trim() ?? null,
    bookingTime: text.match(/\[BOOKING_TIME:([^\]]+)\]/)?.[1]?.trim() ?? null,
    whatsappHandoff: /\[WHATSAPP_HANDOFF\]/.test(text),
    kbGap: /\[KB_GAP\]/.test(text),
  };
}

/**
 * Omar must never use em or en dashes (JA, 2026-07-26 — the style leaked from
 * the prompt copy itself). The prompt now says so, but model instructions leak,
 * so every reply is normalised here: stripSignals is the single chokepoint each
 * assistant message passes through before it is persisted and displayed
 * (app/api/chat/route.ts).
 *
 * Hyphens are left alone — "follow-up" and "Al-Azizi" are correct.
 */
export function normaliseDashes(text: string): string {
  return text
    // Dash immediately before terminal punctuation: drop the dash.
    .replace(/\s*[—–]\s*(?=[.!?,;:])/g, "")
    // Dash at end of string (with or without trailing space): drop it.
    .replace(/\s*[—–]\s*$/g, "")
    // Any remaining dash, spaced or not, becomes a comma.
    .replace(/\s*[—–]\s*/g, ", ");
}

export function stripSignals(text: string): string {
  const stripped = text
    .replace(/\[CAPTURE_READY\]/g, "")
    .replace(/\[SEGMENT:[^\]]*\]/g, "")
    .replace(/\[INTEREST:[^\]]*\]/g, "")
    .replace(/\[HIGH_INTENT\]/g, "")
    .replace(/\[CLOSE_CHAT\]/g, "")
    .replace(/\[BOOKING_DAY:[^\]]*\]/g, "")
    .replace(/\[BOOKING_TIME:[^\]]*\]/g, "")
    .replace(/\[WHATSAPP_HANDOFF\]/g, "")
    .replace(/\[KB_GAP\]/g, "")
    .replace(/\s{2,}/g, " ");
  return normaliseDashes(stripped).trim();
}

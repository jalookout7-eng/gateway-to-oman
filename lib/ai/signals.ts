export interface Signals {
  captureReady: boolean;
  segment: string | null;
  interest: string | null;
  highIntent: boolean;
  closeChat: boolean;
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
  };
}

export function stripSignals(text: string): string {
  return text
    .replace(/\[CAPTURE_READY\]/g, "")
    .replace(/\[SEGMENT:[^\]]*\]/g, "")
    .replace(/\[INTEREST:[^\]]*\]/g, "")
    .replace(/\[HIGH_INTENT\]/g, "")
    .replace(/\[CLOSE_CHAT\]/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

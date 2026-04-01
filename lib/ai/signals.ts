export interface Signals {
  captureReady: boolean;
  segment: string | null;
  interest: string | null;
  highIntent: boolean;
  closeChat: boolean;
}

export function parseSignals(text: string): Signals {
  return {
    captureReady: /\[CAPTURE_READY\]/.test(text),
    segment: text.match(/\[SEGMENT:(\w+)\]/)?.[1] ?? null,
    interest: text.match(/\[INTEREST:(\w+)\]/)?.[1] ?? null,
    highIntent: /\[HIGH_INTENT\]/.test(text),
    closeChat: /\[CLOSE_CHAT\]/.test(text),
  };
}

export function stripSignals(text: string): string {
  return text
    .replace(/\[CAPTURE_READY\]/g, "")
    .replace(/\[SEGMENT:\w+\]/g, "")
    .replace(/\[INTEREST:\w+\]/g, "")
    .replace(/\[HIGH_INTENT\]/g, "")
    .replace(/\[CLOSE_CHAT\]/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

// lib/ai/version.ts
export interface ChangelogEntry { version: string; date: string; summary: string; }

export const OMAR_VERSION = "1.0";

// Newest first. Bump OMAR_VERSION and prepend an entry whenever the prompt
// (lib/ai/prompts.ts) or scoring model (lib/ai/scoring.ts) changes.
export const OMAR_CHANGELOG: ChangelogEntry[] = [
  { version: "1.0", date: "2026-05", summary: "Initial 100-point scoring model + Omar prompt (main + businesses variants)." },
];

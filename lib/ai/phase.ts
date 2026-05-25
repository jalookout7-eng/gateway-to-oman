import type { Client } from "@libsql/client";
import { getOmarPrecision } from "@/lib/intelligence/queries";

export type PhaseNumber = 1 | 2 | 3;
export const DEFAULT_PHASE: PhaseNumber = 1;
const SETTINGS_KEY = "omar_phase";

export interface PhaseCapability { minPhase: PhaseNumber; instruction: string; }

export interface PhaseDef {
  phase: PhaseNumber;
  name: string;
  summary: string;
  capabilities: PhaseCapability[];
  guardrails: string[];
  unlock: { precisionTarget: number | null; minResolvedLeads: number | null; notes: string };
}

export const PHASES: PhaseDef[] = [
  {
    phase: 1,
    name: "Qualifier + Librarian",
    summary: "Qualify visitors and answer their questions accurately from the knowledge base.",
    capabilities: [
      { minPhase: 1, instruction: "Ask targeted qualifying questions to learn whether Oman is the right fit." },
      { minPhase: 1, instruction: "Answer visitor questions using only the knowledge base provided above." },
      { minPhase: 1, instruction: "Classify the visitor (hot/warm/cold/jobs) and route them to the right next step." },
      { minPhase: 1, instruction: "Capture the lead's details once you have enough context." },
    ],
    guardrails: [
      "Do not promise or quote anything beyond what the knowledge base states.",
      "Do not book or schedule on Ahmed's behalf — offer the WhatsApp handoff or the booking option instead.",
      "Do not collect documents — you may say what's needed, but documents go to the team directly.",
      "Do not give legal, tax, or financial advice beyond the knowledge base; tell visitors to verify specifics with the team.",
    ],
    unlock: { precisionTarget: null, minResolvedLeads: null, notes: "Set once enough resolved leads exist to set a credible bar." },
  },
  {
    phase: 2,
    name: "Limited Concierge",
    summary: "Adds limited customer-service: walk visitors through process questions and ease relocation/visa anxiety.",
    capabilities: [
      { minPhase: 2, instruction: "Walk visitors through process questions (required documents, license-transfer steps, typical timelines) using the knowledge base." },
      { minPhase: 2, instruction: "Proactively ease relocation and visa anxiety by pointing warm visitors to the relevant residency, visa, and ownership topics." },
    ],
    guardrails: [
      "Do not promise or quote anything beyond what the knowledge base states.",
      "Do not book or schedule on Ahmed's behalf — offer the WhatsApp handoff or the booking option instead.",
      "Do not collect documents — you may say what's needed, but documents go to the team directly.",
      "Do not give legal, tax, or financial advice beyond the knowledge base; tell visitors to verify specifics with the team.",
    ],
    unlock: { precisionTarget: null, minResolvedLeads: null, notes: "Sustained precision + low KB-gap rate + Ahmed sign-off." },
  },
  {
    phase: 3,
    name: "Scheduler",
    summary: "Omar books consultations directly into Ahmed's calendar (needs calendar integration).",
    capabilities: [
      { minPhase: 3, instruction: "Offer to book a consultation directly into Ahmed's calendar when a visitor is ready." },
    ],
    guardrails: [
      "Do not promise or quote anything beyond what the knowledge base states.",
      "Do not collect documents — you may say what's needed, but documents go to the team directly.",
      "Do not give legal, tax, or financial advice beyond the knowledge base; tell visitors to verify specifics with the team.",
    ],
    unlock: { precisionTarget: null, minResolvedLeads: null, notes: "Sustained precision + booking accuracy." },
  },
];

export function capabilitiesFor(phase: PhaseNumber): string[] {
  return PHASES.flatMap((p) => p.capabilities)
    .filter((c) => c.minPhase <= phase)
    .map((c) => c.instruction);
}

// Guardrails are intentionally per-phase, NOT accumulated: higher phases LIFT
// restrictions (e.g. Phase 3 removes the no-booking rule). The KB-grounding rule
// applies at every phase, so it is repeated in each phase's list.
export function guardrailsFor(phase: PhaseNumber): string[] {
  return PHASES.find((p) => p.phase === phase)?.guardrails ?? PHASES[0].guardrails;
}

function coercePhase(raw: unknown): PhaseNumber {
  const n = Number(raw);
  return n === 2 || n === 3 ? n : DEFAULT_PHASE;
}

export async function getActivePhase(db: Client): Promise<PhaseNumber> {
  const res = await db.execute({ sql: "SELECT value FROM settings WHERE key = ?", args: [SETTINGS_KEY] });
  const v = res.rows[0]?.value;
  return typeof v === "string" && v.length > 0 ? coercePhase(v) : DEFAULT_PHASE;
}

export async function setActivePhase(db: Client, phase: PhaseNumber): Promise<void> {
  await db.execute({
    sql: `INSERT INTO settings (key, value, updated_at) VALUES (?, ?, datetime('now'))
          ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')`,
    args: [SETTINGS_KEY, String(phase)],
  });
}

export interface PhaseProgress {
  activePhase: PhaseNumber;
  resolvedLeads: number;     // correct + wrong (verdict-eligible)
  precisionPct: number | null;
  nextTarget: number | null;
}

export async function getPhaseProgress(db: Client): Promise<PhaseProgress> {
  const activePhase = await getActivePhase(db);
  const { overall } = await getOmarPrecision(db);
  const next = PHASES.find((p) => p.phase > activePhase);
  return {
    activePhase,
    resolvedLeads: overall.correct + overall.wrong,
    precisionPct: overall.precisionPct,
    nextTarget: next?.unlock.precisionTarget ?? null,
  };
}

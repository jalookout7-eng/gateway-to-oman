import { BASE_PROMPT, MAIN_SITE_VARIANT, BUSINESSES_VARIANT } from "./prompts";
import { topicsFor, BUYER_QUALIFICATION, GTO_REFERENCES } from "./knowledge-base";
import { capabilitiesFor, guardrailsFor, type PhaseNumber } from "./phase";
import type { Surface } from "./surface";

export interface AssembleContext {
  intent?: string;
  topic?: string;
  availability?: string; // pre-fetched availability fragment, if any
  /** True when the visitor has already submitted the lead-capture form on
   *  the client. When set, the assembler appends a [LEAD CAPTURED] marker
   *  that tells Omar he must NOT ask for name/email/phone again — the team
   *  already has them (Notes 5). */
  leadCaptured?: boolean;
}

export interface AssembleInput {
  surface: Surface;
  phase: PhaseNumber;
  context?: AssembleContext;
}

function renderKb(surface: Surface, phase: PhaseNumber): string {
  const blocks = topicsFor(surface, phase)
    .map((t) => `### ${t.title}\n${t.body}`)
    .join("\n\n");
  return `## KNOWLEDGE BASE\n\nUse these to answer accurately.\n\n${blocks}`;
}

function renderQualification(): string {
  const q = BUYER_QUALIFICATION;
  const list = (xs: string[]) => xs.map((x) => `- ${x}`).join("\n");
  const cls = (Object.keys(q.classification) as (keyof typeof q.classification)[])
    .map((k) => `- ${k}: ${q.classification[k]}`)
    .join("\n");
  return [
    "## BUYER QUALIFICATION (this marketplace)",
    `${q.dualIntentFilter}\n\nKey question to separate operators from speculators: "${q.keyQuestion}"`,
    `Hot signals:\n${list(q.hotSignals)}`,
    `Seriousness triggers:\n${list(q.seriousnessTriggers)}`,
    `Cold signals:\n${list(q.coldSignals)}`,
    `Classification → action:\n${cls}`,
  ].join("\n\n");
}

function renderCapabilities(phase: PhaseNumber): string {
  const can = capabilitiesFor(phase).map((c) => `- ${c}`).join("\n");
  const cannot = guardrailsFor(phase).map((c) => `- ${c}`).join("\n");
  return `## WHAT YOU CAN DO RIGHT NOW (CURRENT PHASE)\n${can}\n\n## CURRENT LIMITS\n${cannot}`;
}

function renderReferences(surface: Surface): string {
  const lines = [
    `If a visitor only wants jobs: point them to ${GTO_REFERENCES.cvSubmission} (jobs platform in development).`,
    `If a visitor only wants residency/visa (not buying a business): point them to the Golden Visa waitlist ${GTO_REFERENCES.goldenVisaWaitlist}.`,
  ];
  if (surface === "businesses") {
    lines.push(
      "For a HOT, ready-to-talk visitor (after capturing their details), offer to connect them with Ahmed directly on WhatsApp and embed [WHATSAPP_HANDOFF]."
    );
  }
  return `## ROUTING REFERENCES\n${lines.map((l) => `- ${l}`).join("\n")}`;
}

/** Compose the full system prompt. Pure — no I/O. */
export function buildSystemPrompt(input: AssembleInput): string {
  const { surface, phase, context } = input;
  const variant = surface === "businesses" ? BUSINESSES_VARIANT : MAIN_SITE_VARIANT;

  const sections = [
    BASE_PROMPT,
    variant,
    renderKb(surface, phase),
    surface === "businesses" ? renderQualification() : "",
    renderCapabilities(phase),
    renderReferences(surface),
  ];

  if (context?.intent) {
    sections.push(
      `[CONTEXT: visitor clicked '${context.topic ?? context.intent}' — they are interested in ${
        context.intent === "consultation" ? "booking a consultation with our team" : context.topic
      }. Open with the right qualifying question for this specific interest.]`
    );
  }
  if (context?.availability) {
    sections.push(context.availability);
    sections.push(
      "For consultation bookings: after qualifying, ask for preferred day from AVAILABLE_DAYS above, then preferred time from that day's slots. Embed [BOOKING_DAY:YYYY-MM-DD] and [BOOKING_TIME:HH:MM] when visitor confirms."
    );
  }
  // Post-capture marker (Notes 5): the visitor has already submitted the
  // lead-capture form on the client. Omar must NOT re-collect personal
  // details — the team already has them. This is the runtime counterpart
  // to the POST-CAPTURE section in BASE_PROMPT.
  if (context?.leadCaptured) {
    sections.push(
      "[LEAD CAPTURED: the visitor has already submitted the lead-capture form. The team has their name, email, and phone (and WhatsApp where given). DO NOT ask for these details again — not as a follow-up, not in a 'just confirming' message, not at all. Answer their substantive question and continue qualifying their fit / specifics. Embed [HIGH_INTENT] if they ask 2+ specific follow-up questions about pricing, timeline, visa, or sectors.]"
    );
  }

  return sections.filter(Boolean).join("\n\n");
}

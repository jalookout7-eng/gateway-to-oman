import { chat, type ChatMessage } from "@/lib/ai/provider";

/**
 * Shared lead-summary generator used by BOTH:
 *   - /api/leads/route.ts (auto-generation when the form is submitted)
 *   - /api/admin/leads/[id]/summarize/route.ts (manual "Regenerate" button)
 *
 * Previously each path had its own copy; the auto-generation path was still
 * pointing at the old Groq llama-3.1-8b + old prompt (which hallucinated the
 * lead's name and emitted markdown asterisks). Centralising here keeps the
 * two paths in lockstep — any future prompt tweak lands on both at once.
 */

export interface LeadFacts {
  name: string | null;
  email: string | null;
  phone: string | null;
  country_code: string | null;
  segment: string | null;
  interests: string | null;
}

function buildSystemPrompt(facts: LeadFacts): string {
  const factLines: string[] = [];
  if (facts.name) factLines.push(`- Name: ${facts.name}`);
  if (facts.email) factLines.push(`- Email: ${facts.email}`);
  const phoneCombined =
    facts.phone && facts.country_code
      ? `${facts.country_code} ${facts.phone}`
      : facts.phone ?? null;
  if (phoneCombined) factLines.push(`- Phone: ${phoneCombined}`);
  if (facts.segment) factLines.push(`- Segment: ${facts.segment}`);
  if (facts.interests) factLines.push(`- Stated interests: ${facts.interests}`);

  const factsBlock =
    factLines.length > 0
      ? `KNOWN FACTS about this lead (captured via the lead form — use these directly, do not say "not captured"):\n${factLines.join("\n")}`
      : `KNOWN FACTS about this lead: none beyond the transcript below. If the visitor's name doesn't appear in the transcript, write "Name not captured" — do NOT invent a name and do NOT use the name of anyone on the consulting team.`;

  return [
    "You are summarising a sales-qualification conversation for the Gateway to Oman team.",
    "",
    "The PERSON BEING SUMMARISED is the website visitor — the human on the USER side of the transcript below. They are the lead, the potential customer. They are NOT a member of the Gateway to Oman team.",
    "",
    factsBlock,
    "",
    "Write a concise summary with EXACTLY these five labeled sections, each 1-2 sentences, plain prose:",
    "",
    "WHO: Who this visitor is (use the name from the KNOWN FACTS if available; mention background, country, profession if any are evident from the transcript or the segment field).",
    "WANTS: What they want in Oman (use stated interests + transcript).",
    "SIGNALS: Qualifying indicators and a hot/warm/cold assessment.",
    "BOTTLENECKS: Concerns or obstacles raised. If none, write \"None identified.\"",
    "NEXT STEP: Recommended action for the team.",
    "",
    "FORMATTING RULES (strict):",
    "- Use PLAIN TEXT only. No markdown. No asterisks. No bold. No italics. No underscores. No headers.",
    "- Section labels are written exactly as shown above: uppercase word followed by a colon and a space.",
    "- Separate the five sections with single blank lines.",
    "- Do not preface or close with any sentence outside the five labelled sections.",
  ].join("\n");
}

/**
 * Defensive: strip stray markdown emphasis ( **text**, __text__, *text*, _text_ )
 * the model may emit despite the prompt asking for plain text.
 */
export function stripMarkdown(input: string): string {
  return input
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/__(.+?)__/g, "$1")
    .replace(/(?<![A-Za-z0-9])\*([^*\n]+?)\*(?![A-Za-z0-9])/g, "$1")
    .replace(/(?<![A-Za-z0-9])_([^_\n]+?)_(?![A-Za-z0-9])/g, "$1")
    .trim();
}

/**
 * Builds the messages array for the AI call. Exposed so callers that want
 * to inspect or augment can — but most should just use `summariseLead()`
 * which wraps the full call.
 */
export function buildSummaryMessages(
  facts: LeadFacts,
  transcript: string | null,
): ChatMessage[] {
  const userMessage = transcript && transcript.length > 0
    ? `Transcript of the conversation to summarise:\n\n${transcript}`
    : `No chat transcript exists for this lead (added manually or never engaged with Omar). Write the five-section summary using only the KNOWN FACTS above. For BOTTLENECKS, write "None identified — no transcript". For SIGNALS, mark "warm — no transcript to grade" unless segment alone is a strong signal.`;

  return [
    { role: "system", content: buildSystemPrompt(facts) },
    { role: "user", content: userMessage },
  ];
}

/**
 * Full-cycle: facts + transcript in → clean plain-text summary out. Uses
 * the AI provider chain (Anthropic primary, Groq failover). Returns the
 * stripMarkdown-cleaned text. Throws on AI provider failure — callers
 * decide whether to surface or swallow.
 */
export async function summariseLead(
  facts: LeadFacts,
  transcript: string | null,
): Promise<string> {
  const messages = buildSummaryMessages(facts, transcript);
  const raw = await chat(messages);
  return stripMarkdown(raw);
}

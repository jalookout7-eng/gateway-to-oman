import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db/client";
import { requireAuth } from "@/lib/auth/token";
import { chat, type ChatMessage } from "@/lib/ai/provider";

/**
 * Build the system prompt with the lead's form-captured facts baked in.
 *
 * The visitor's name, email, phone, segment, and stated interests are NOT
 * always (or even usually) inside the chat transcript — they're collected via
 * the lead-capture form. The earlier prompt only saw the transcript and so
 * defaulted to "Name not captured in conversation" even when we DID know the
 * name. Pass the form-captured facts in as a separate block of "known facts
 * about this lead" so the summariser uses them directly.
 *
 * Why not the role of GTO team names in the prompt: weaker models (the old
 * llama-3.1-8b path) confused the audience for the subject — they would write
 * "WHO: Ahmed Al-Azizi" because Ahmed was named in the prompt. We address the
 * audience generically as "the team" and never name them.
 */
function buildSystemPrompt(facts: {
  name: string | null;
  email: string | null;
  phone: string | null;
  country_code: string | null;
  segment: string | null;
  interests: string | null;
}): string {
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
 * the model may emit despite the prompt asking for plain text. Conservative —
 * only strips the marker characters when they wrap text, leaving the content.
 */
function stripMarkdown(input: string): string {
  return input
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/__(.+?)__/g, "$1")
    .replace(/(?<![A-Za-z0-9])\*([^*\n]+?)\*(?![A-Za-z0-9])/g, "$1")
    .replace(/(?<![A-Za-z0-9])_([^_\n]+?)_(?![A-Za-z0-9])/g, "$1")
    .trim();
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const authError = await requireAuth(request);
  if (authError) return authError;

  const db = getDb();
  const lead = await db.execute({
    sql: "SELECT conversation_id, name, email, phone, country_code, segment, interests FROM leads WHERE id = ?",
    args: [params.id],
  });

  if (!lead.rows[0]) {
    return NextResponse.json({ error: "Lead not found" }, { status: 404 });
  }

  const row = lead.rows[0];
  const conversationId = row.conversation_id as string | null;

  // Build the facts payload from the form-captured fields. ALL of these may
  // exist even when there's no conversation transcript (e.g., manual lead add).
  const facts = {
    name: (row.name as string | null) ?? null,
    email: (row.email as string | null) ?? null,
    phone: (row.phone as string | null) ?? null,
    country_code: (row.country_code as string | null) ?? null,
    segment: (row.segment as string | null) ?? null,
    interests: (row.interests as string | null) ?? null,
  };

  // Pull the transcript if any — when present it gives BOTTLENECKS/SIGNALS.
  // When absent (manual lead add), the summary still has WHO/WANTS from facts.
  let transcript = "";
  if (conversationId) {
    const msgs = await db.execute({
      sql: "SELECT role, content FROM messages WHERE conversation_id = ? ORDER BY created_at ASC",
      args: [conversationId],
    });
    transcript = msgs.rows
      .map((m) => {
        const role = String(m.role).toLowerCase();
        const label =
          role === "user"
            ? "VISITOR (lead)"
            : role === "assistant"
              ? "OMAR (bot)"
              : role.toUpperCase();
        return `${label}: ${String(m.content)}`;
      })
      .join("\n");
  }

  const userMessage = transcript
    ? `Transcript of the conversation to summarise:\n\n${transcript}`
    : `No chat transcript exists for this lead (added manually or never engaged with Omar). Write the five-section summary using only the KNOWN FACTS above. For BOTTLENECKS, write "None identified — no transcript". For SIGNALS, mark "warm — no transcript to grade" unless segment alone is a strong signal.`;

  const messages: ChatMessage[] = [
    { role: "system", content: buildSystemPrompt(facts) },
    { role: "user", content: userMessage },
  ];

  let raw: string;
  try {
    raw = await chat(messages);
  } catch (err) {
    console.error("[summarize] AI provider failed", err);
    return NextResponse.json(
      { error: "AI summary generation failed; try again shortly." },
      { status: 502 },
    );
  }

  const summary = stripMarkdown(raw);

  await db.execute({
    sql: "UPDATE leads SET ai_summary = ? WHERE id = ?",
    args: [summary, params.id],
  });

  return NextResponse.json({ summary });
}

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db/client";
import { requireAuth } from "@/lib/auth/token";
import { chat, type ChatMessage } from "@/lib/ai/provider";

// System prompt for lead summarization.
//
// IMPORTANT: do NOT name the GTO team (Ahmed, JA, etc.) inside this prompt.
// Earlier prompts said "summarising for Ahmed Al-Azizi" and weaker models
// (llama-3.1-8b) confused the audience for the subject — the "WHO" section
// would come back saying the lead was Ahmed Al-Azizi. We now address the
// audience generically and explicitly state who the subject is.
const SYSTEM_PROMPT = [
  "You are summarising a sales-qualification conversation for the Gateway to Oman team.",
  "",
  "The PERSON BEING SUMMARISED is the website visitor — the human on the USER side of the transcript below. They are the lead, the potential customer. They are NOT a member of the Gateway to Oman team.",
  "",
  "If the visitor's name does not appear in the transcript, write \"Name not captured in conversation\" — do NOT invent a name and do NOT use the name of anyone on the consulting team.",
  "",
  "Write a concise summary with EXACTLY these five labeled sections, each 1-2 sentences, plain prose:",
  "",
  "WHO: Who this visitor is (background, country, profession if mentioned).",
  "WANTS: What they want in Oman.",
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
    sql: "SELECT conversation_id FROM leads WHERE id = ?",
    args: [params.id],
  });

  if (!lead.rows[0]) {
    return NextResponse.json({ error: "Lead not found" }, { status: 404 });
  }

  const conversationId = lead.rows[0].conversation_id as string | null;
  if (!conversationId) {
    return NextResponse.json({ error: "No conversation for this lead" }, { status: 400 });
  }

  const msgs = await db.execute({
    sql: "SELECT role, content FROM messages WHERE conversation_id = ? ORDER BY created_at ASC",
    args: [conversationId],
  });

  // Label sides clearly so the model can't mistake who's who.
  const transcript = msgs.rows
    .map((m) => {
      const role = String(m.role).toLowerCase();
      const label = role === "user" ? "VISITOR (lead)" : role === "assistant" ? "OMAR (bot)" : role.toUpperCase();
      return `${label}: ${String(m.content)}`;
    })
    .join("\n");

  const messages: ChatMessage[] = [
    { role: "system", content: SYSTEM_PROMPT },
    { role: "user", content: `Transcript of the conversation to summarise:\n\n${transcript}` },
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

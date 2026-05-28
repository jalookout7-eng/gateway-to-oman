import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db/client";
import { rateLimit, getClientIp } from "@/lib/rate-limit";
import { chat, type ChatMessage } from "@/lib/ai/provider";
import { stripMarkdown } from "@/lib/ai/lead-summary";

/**
 * POST /api/chat/event
 *
 * Visitor-facing endpoint (NOT admin-auth-gated) that logs Omar's
 * post-capture "auto-notes" to the lead_notes timeline. The frontend calls
 * this when the visitor clicks one of the inline CTAs Omar surfaces during
 * the keep-chat phase:
 *
 *   - `whatsapp_click`      → Omar wrote: "Visitor clicked WhatsApp Ahmed."
 *   - `calendly_click`      → Omar wrote: "Visitor clicked Book consultation."
 *   - `keep_chat_started`   → Omar wrote: "Visitor opted to keep chatting."
 *   - `keep_chat_ended`     → Omar wrote: "Keep-chat session ended after N exchanges."
 *
 * Identification: the caller passes `sessionId` (same opaque id used by
 * /api/chat). We look up the conversation → lead via leads.conversation_id.
 * If no lead is found (caller called before capture, or lead never persisted),
 * the request is a no-op with a clean 200 — we don't error so the frontend
 * doesn't have to know about our internal state.
 *
 * Rate-limited (60/min/IP) to defend against trivial spam — only the
 * visitor's own chat widget should call this.
 */

const ALLOWED_EVENTS = new Set([
  "whatsapp_click",
  "calendly_click",
  "keep_chat_started",
  "keep_chat_ended",
] as const);

type EventType = "whatsapp_click" | "calendly_click" | "keep_chat_started" | "keep_chat_ended";

function buildStaticNoteBody(
  event: Exclude<EventType, "keep_chat_ended">,
): string {
  switch (event) {
    case "whatsapp_click":
      return "Visitor clicked the WhatsApp button to message Ahmed directly.";
    case "calendly_click":
      return "Visitor clicked the Book consultation button (Calendly).";
    case "keep_chat_started":
      return "Visitor opted to keep chatting with Omar after the lead form.";
  }
}

/**
 * Generate Omar AI's reflective note about a keep-chat session.
 *
 * Replaces the old static "Keep-chat session ended after N exchanges" note
 * (JA flagged it as irrelevant in Notes 2 #6). Instead, Omar reads the full
 * conversation transcript + the known lead facts and writes a 2-3 sentence
 * quality assessment focused on:
 *   - What the visitor asked during keep-chat (intent signals)
 *   - Omar's gut read on the lead's quality (hot/warm/cold + why)
 *   - One concrete recommendation for the team
 *
 * Falls back to a short static note if the AI call fails — Omar's auto-note
 * is never blocking, and we'd rather log SOMETHING than lose the event.
 */
async function generateKeepChatQualityNote(opts: {
  transcript: string;
  facts: {
    name: string | null;
    segment: string | null;
    interests: string | null;
  };
  exchanges: number;
  reason: string;
}): Promise<string> {
  const factLines: string[] = [];
  if (opts.facts.name) factLines.push(`- Name: ${opts.facts.name}`);
  if (opts.facts.segment) factLines.push(`- Segment: ${opts.facts.segment}`);
  if (opts.facts.interests)
    factLines.push(`- Stated interests: ${opts.facts.interests}`);
  const factsBlock =
    factLines.length > 0 ? factLines.join("\n") : "(no form-captured facts)";

  const system = [
    "You are Omar, an AI sales-qualification assistant for Gateway to Oman. The visitor has just finished a 'keep chatting' session with you AFTER completing the lead form, so you already know their basic details (below). Write a SHORT internal note for the human Gateway-to-Oman team about this visitor.",
    "",
    "Format: 2-3 sentences, plain prose, no markdown, no headers, no bullets. Write in FIRST PERSON as Omar (e.g. 'I noticed they kept circling back to industrial properties...').",
    "",
    "What to focus on (cover at least one of these):",
    "1. What did they actually want? — sector, budget, timeline, geography that came up in the keep-chat exchanges.",
    "2. Quality read — hot / warm / cold and a one-line reason grounded in what they said.",
    "3. One concrete recommendation for the team's first reply.",
    "",
    "Do NOT just describe the session length — that's already logged. Focus on INSIGHTS the team can act on. If the session was thin (visitor barely engaged), say so honestly.",
    "",
    "KNOWN FACTS about this lead:",
    factsBlock,
  ].join("\n");

  const user = `Keep-chat transcript (${opts.exchanges} additional exchange${opts.exchanges === 1 ? "" : "s"} after the lead form; ended via "${opts.reason}"):\n\n${opts.transcript}\n\nWrite your 2-3 sentence note now.`;

  const messages: ChatMessage[] = [
    { role: "system", content: system },
    { role: "user", content: user },
  ];

  const raw = await chat(messages);
  return stripMarkdown(raw);
}

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request);
    const rl = await rateLimit("chat_event", ip, 60, 60);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: "Too many requests." },
        { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } },
      );
    }

    const { sessionId, event, metadata } = await request.json().catch(() => ({}));

    if (typeof sessionId !== "string" || sessionId.length === 0) {
      return NextResponse.json({ error: "sessionId is required" }, { status: 400 });
    }
    if (typeof event !== "string" || !ALLOWED_EVENTS.has(event as EventType)) {
      return NextResponse.json(
        { error: `event must be one of: ${Array.from(ALLOWED_EVENTS).join(", ")}` },
        { status: 400 },
      );
    }

    const db = getDb();

    // Find the conversation, then the lead. If either is missing, no-op
    // gracefully — Omar would just not have anywhere to write the note.
    const conv = await db.execute({
      sql: "SELECT id FROM conversations WHERE session_id = ?",
      args: [sessionId],
    });
    if (conv.rows.length === 0) {
      return NextResponse.json({ ok: true, logged: false, reason: "no_conversation" });
    }
    const conversationId = conv.rows[0].id as string;

    const lead = await db.execute({
      sql: "SELECT id, name, segment, interests FROM leads WHERE conversation_id = ?",
      args: [conversationId],
    });
    if (lead.rows.length === 0) {
      return NextResponse.json({ ok: true, logged: false, reason: "no_lead" });
    }
    const leadRow = lead.rows[0];
    const leadId = leadRow.id as string;

    let noteBody: string;

    if (event === "keep_chat_ended") {
      // Pull the full conversation transcript so Omar can reflect on it.
      const msgs = await db.execute({
        sql: "SELECT role, content FROM messages WHERE conversation_id = ? ORDER BY created_at ASC",
        args: [conversationId],
      });
      const transcript = msgs.rows
        .map((m) => {
          const role = String(m.role).toLowerCase();
          const label =
            role === "user"
              ? "VISITOR"
              : role === "assistant"
                ? "OMAR"
                : role.toUpperCase();
          return `${label}: ${String(m.content)}`;
        })
        .join("\n");

      const md = typeof metadata === "object" && metadata !== null ? metadata : {};
      try {
        noteBody = await generateKeepChatQualityNote({
          transcript,
          facts: {
            name: (leadRow.name as string | null) ?? null,
            segment: (leadRow.segment as string | null) ?? null,
            interests: (leadRow.interests as string | null) ?? null,
          },
          exchanges: Number((md as Record<string, unknown>).exchanges ?? 0),
          reason: String((md as Record<string, unknown>).reason ?? "ended"),
        });
      } catch (aiErr) {
        // Hard fallback so we always log SOMETHING on keep-chat end.
        console.error("[chat/event] keep-chat AI summary failed:", aiErr);
        noteBody =
          "Keep-chat session ended. AI quality summary could not be generated — review the transcript directly.";
      }
    } else {
      noteBody = buildStaticNoteBody(event as Exclude<EventType, "keep_chat_ended">);
    }

    await db.execute({
      sql: `INSERT INTO lead_notes (lead_id, author_type, author_id, author_name, body)
            VALUES (?, 'omar', NULL, 'Omar AI', ?)`,
      args: [leadId, noteBody],
    });

    return NextResponse.json({ ok: true, logged: true });
  } catch (err) {
    console.error("[chat/event] failed:", err);
    return NextResponse.json({ error: "Failed to log event" }, { status: 500 });
  }
}

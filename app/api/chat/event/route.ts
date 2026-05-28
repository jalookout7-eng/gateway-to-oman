import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db/client";
import { rateLimit, getClientIp } from "@/lib/rate-limit";

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

function buildNoteBody(event: EventType, metadata: Record<string, unknown>): string {
  switch (event) {
    case "whatsapp_click":
      return "Visitor clicked the WhatsApp button to message Ahmed directly.";
    case "calendly_click":
      return "Visitor clicked the Book consultation button (Calendly).";
    case "keep_chat_started":
      return "Visitor opted to keep chatting with Omar after the lead form.";
    case "keep_chat_ended": {
      const exchanges = Number(metadata.exchanges ?? 0);
      const reason = String(metadata.reason ?? "ended");
      return `Keep-chat session ${reason} after ${exchanges} additional exchange${exchanges === 1 ? "" : "s"}.`;
    }
  }
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
      sql: "SELECT id FROM leads WHERE conversation_id = ?",
      args: [conversationId],
    });
    if (lead.rows.length === 0) {
      return NextResponse.json({ ok: true, logged: false, reason: "no_lead" });
    }
    const leadId = lead.rows[0].id as string;

    const body = buildNoteBody(
      event as EventType,
      typeof metadata === "object" && metadata !== null ? metadata : {},
    );

    await db.execute({
      sql: `INSERT INTO lead_notes (lead_id, author_type, author_id, author_name, body)
            VALUES (?, 'omar', NULL, 'Omar AI', ?)`,
      args: [leadId, body],
    });

    return NextResponse.json({ ok: true, logged: true });
  } catch (err) {
    console.error("[chat/event] failed:", err);
    return NextResponse.json({ error: "Failed to log event" }, { status: 500 });
  }
}

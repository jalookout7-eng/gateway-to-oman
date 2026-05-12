import { NextRequest, NextResponse } from "next/server";
import { chat, type ChatMessage } from "@/lib/ai/provider";
import { parseSignals, stripSignals } from "@/lib/ai/signals";
import { getDb } from "@/lib/db/client";
import { getSystemPrompt } from "@/lib/ai/prompts";

function normalizeSource(raw: unknown): "main" | "businesses" {
  return raw === "businesses" ? "businesses" : "main";
}

async function getAvailabilityContext(): Promise<string> {
  try {
    const baseUrl = process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : "http://localhost:3000";
    const res = await fetch(`${baseUrl}/api/availability`);
    const data = await res.json();
    if (!data.availableDays?.length) return "";

    const days = data.availableDays
      .map((d: string) => {
        const date = new Date(d + "T12:00:00Z");
        const label = date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
        const slots = data.slotsByDay[d] ?? [];
        return `${label} (${slots.join(", ")})`;
      })
      .join("; ");

    return `\n[AVAILABLE_DAYS: ${days}]`;
  } catch {
    return "";
  }
}

export async function POST(request: NextRequest) {
  try {
    const { message, sessionId, history = [], context, source: requestSource } = await request.json();

    if (!message || !sessionId) {
      return NextResponse.json(
        { error: "message and sessionId are required" },
        { status: 400 }
      );
    }

    const source = normalizeSource(requestSource);
    const db = getDb();

    const existing = await db.execute({
      sql: "SELECT id, source FROM conversations WHERE session_id = ?",
      args: [sessionId],
    });

    let conversationId: string;
    let conversationSource: "main" | "businesses";
    if (existing.rows.length === 0) {
      const result = await db.execute({
        sql: "INSERT INTO conversations (session_id, source) VALUES (?, ?) RETURNING id",
        args: [sessionId, source],
      });
      conversationId = result.rows[0].id as string;
      conversationSource = source;
    } else {
      conversationId = existing.rows[0].id as string;
      conversationSource = normalizeSource(existing.rows[0].source);
    }

    await db.execute({
      sql: "INSERT INTO messages (conversation_id, role, content) VALUES (?, 'user', ?)",
      args: [conversationId, message],
    });

    let systemPrompt = getSystemPrompt(conversationSource);
    if (context?.intent) {
      systemPrompt += `\n\n[CONTEXT: visitor clicked '${context.topic ?? context.intent}' — they are interested in ${context.intent === "consultation" ? "booking a consultation with Ahmed" : context.topic}. Open with the right qualifying question for this specific interest.]`;
    }
    if (context?.intent === "consultation") {
      const availabilityContext = await getAvailabilityContext();
      systemPrompt += availabilityContext;
      systemPrompt += "\n\nFor consultation bookings: after qualifying, ask for preferred day from AVAILABLE_DAYS above, then preferred time from that day's slots. Embed [BOOKING_DAY:YYYY-MM-DD] and [BOOKING_TIME:HH:MM] when visitor confirms.";
    }

    const messages: ChatMessage[] = [
      { role: "system", content: systemPrompt },
      ...history.map((m: { role: string; content: string }) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })),
      { role: "user" as const, content: message },
    ];

    const rawResponse = await chat(messages);
    const signals = parseSignals(rawResponse);
    const cleanResponse = stripSignals(rawResponse);

    await db.execute({
      sql: "INSERT INTO messages (conversation_id, role, content, raw_content) VALUES (?, 'assistant', ?, ?)",
      args: [conversationId, cleanResponse, rawResponse],
    });

    const updates: string[] = [];
    const args: (string | number)[] = [];
    if (signals.segment) { updates.push("segment = ?"); args.push(signals.segment); }
    if (signals.interest) { updates.push("interests = ?"); args.push(signals.interest); }
    updates.push("message_count = message_count + 2");
    if (signals.closeChat) {
      updates.push("outcome = 'closed'");
      updates.push("ended_at = datetime('now')");
    }
    if (updates.length > 0) {
      args.push(conversationId);
      await db.execute({
        sql: `UPDATE conversations SET ${updates.join(", ")} WHERE id = ?`,
        args,
      });
    }

    if (signals.bookingDay && signals.bookingTime) {
      await db.execute({
        sql: "INSERT OR IGNORE INTO bookings (conversation_id, preferred_date, preferred_time) VALUES (?, ?, ?)",
        args: [conversationId, signals.bookingDay, signals.bookingTime],
      });
    }

    return NextResponse.json({
      message: cleanResponse,
      signals: {
        captureReady: signals.captureReady,
        segment: signals.segment,
        interest: signals.interest,
        highIntent: signals.highIntent,
        closeChat: signals.closeChat,
        bookingDay: signals.bookingDay,
        bookingTime: signals.bookingTime,
      },
      conversationId,
    });
  } catch (error) {
    console.error("Chat error:", error);
    return NextResponse.json({ error: "Failed to process chat message" }, { status: 500 });
  }
}

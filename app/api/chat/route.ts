import { NextRequest, NextResponse } from "next/server";
import { chat, type ChatMessage } from "@/lib/ai/provider";
import { parseSignals, stripSignals } from "@/lib/ai/signals";
import { getDb } from "@/lib/db/client";
import { buildSystemPrompt, type AssembleContext } from "@/lib/ai/prompt-assembler";
import { getActivePhase } from "@/lib/ai/phase";
import { buildWhatsAppHandoff } from "@/lib/ai/whatsapp";
import { rateLimit, getClientIp } from "@/lib/rate-limit";

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
    // Rate limit: 20 requests per minute per IP (H-1)
    const ip = getClientIp(request);
    const rl = await rateLimit("chat", ip, 20, 60);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: "Too many requests. Please slow down." },
        { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } },
      );
    }

    const {
      message,
      sessionId,
      history: rawHistory = [],
      context,
      source: requestSource,
      hookVariantId,
    } = await request.json();

    if (!message || !sessionId) {
      return NextResponse.json(
        { error: "message and sessionId are required" },
        { status: 400 }
      );
    }

    // M-4: input cap — reject messages over 1000 chars
    if (typeof message === "string" && message.length > 1000) {
      return NextResponse.json(
        { error: "Message is too long. Please keep it under 1000 characters." },
        { status: 400 },
      );
    }

    // M-4: history cap — truncate to last 20 entries; strip non-user/assistant roles
    const history = (Array.isArray(rawHistory) ? rawHistory : [])
      .filter((m: { role: string; content: string }) => m.role === "user" || m.role === "assistant")
      .slice(-20);

    const source = normalizeSource(requestSource);
    const db = getDb();

    const existing = await db.execute({
      sql: "SELECT id, source FROM conversations WHERE session_id = ?",
      args: [sessionId],
    });

    let conversationId: string;
    let conversationSource: "main" | "businesses";
    if (existing.rows.length === 0) {
      // Capture hook_variant_id ONLY on conversation creation; subsequent
      // messages don't get to overwrite which hook the visitor first saw.
      // Format guard: only persist if it matches the pattern <section>-<n>.
      const safeVariantId =
        typeof hookVariantId === "string" && /^[a-z-]+-\d{1,2}$/.test(hookVariantId)
          ? hookVariantId
          : null;
      const result = await db.execute({
        sql: "INSERT INTO conversations (session_id, source, hook_variant_id) VALUES (?, ?, ?) RETURNING id",
        args: [sessionId, source, safeVariantId],
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

    const phase = await getActivePhase(db);
    const assembleContext: AssembleContext = {};
    if (context?.intent) {
      assembleContext.intent = context.intent;
      assembleContext.topic = context.topic;
    }
    if (context?.intent === "consultation") {
      assembleContext.availability = await getAvailabilityContext();
    }
    const systemPrompt = buildSystemPrompt({
      surface: conversationSource,
      phase,
      context: assembleContext,
    });

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
    const whatsappUrl = signals.whatsappHandoff
      ? buildWhatsAppHandoff({
          segment: signals.segment,
          interest: signals.interest,
          surface: conversationSource,
        })
      : null;
    if (signals.kbGap) {
      console.warn("[KB_GAP]", { conversationId, message });
    }
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
        whatsappHandoff: signals.whatsappHandoff,
        kbGap: signals.kbGap,
      },
      whatsappUrl,
      conversationId,
    });
  } catch (error) {
    console.error("Chat error:", error);
    return NextResponse.json({ error: "Failed to process chat message" }, { status: 500 });
  }
}

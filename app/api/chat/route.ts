import { NextRequest, NextResponse } from "next/server";
import { chat, type ChatMessage } from "@/lib/ai/provider";
import { parseSignals, stripSignals } from "@/lib/ai/signals";
import { getDb } from "@/lib/db/client";

export async function POST(request: NextRequest) {
  try {
    const { message, sessionId, history = [] } = await request.json();

    if (!message || !sessionId) {
      return NextResponse.json(
        { error: "message and sessionId are required" },
        { status: 400 }
      );
    }

    const db = getDb();

    // Ensure conversation exists
    const existing = await db.execute({
      sql: "SELECT id FROM conversations WHERE session_id = ?",
      args: [sessionId],
    });

    let conversationId: string;
    if (existing.rows.length === 0) {
      const result = await db.execute({
        sql: "INSERT INTO conversations (session_id) VALUES (?) RETURNING id",
        args: [sessionId],
      });
      conversationId = result.rows[0].id as string;
    } else {
      conversationId = existing.rows[0].id as string;
    }

    // Save user message
    await db.execute({
      sql: "INSERT INTO messages (conversation_id, role, content) VALUES (?, 'user', ?)",
      args: [conversationId, message],
    });

    // Build message history for AI
    const messages: ChatMessage[] = [
      ...history.map((m: { role: string; content: string }) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })),
      { role: "user" as const, content: message },
    ];

    // Get AI response
    const rawResponse = await chat(messages);
    const signals = parseSignals(rawResponse);
    const cleanResponse = stripSignals(rawResponse);

    // Save assistant message (both clean and raw)
    await db.execute({
      sql: "INSERT INTO messages (conversation_id, role, content, raw_content) VALUES (?, 'assistant', ?, ?)",
      args: [conversationId, cleanResponse, rawResponse],
    });

    // Update conversation with signals
    const updates: string[] = [];
    const args: (string | number)[] = [];

    if (signals.segment) {
      updates.push("segment = ?");
      args.push(signals.segment);
    }
    if (signals.interest) {
      updates.push("interests = ?");
      args.push(signals.interest);
    }

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

    return NextResponse.json({
      message: cleanResponse,
      signals: {
        captureReady: signals.captureReady,
        segment: signals.segment,
        interest: signals.interest,
        highIntent: signals.highIntent,
        closeChat: signals.closeChat,
      },
      conversationId,
    });
  } catch (error) {
    console.error("Chat error:", error);
    return NextResponse.json(
      { error: "Failed to process chat message" },
      { status: 500 }
    );
  }
}

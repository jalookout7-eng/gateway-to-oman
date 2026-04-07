import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db/client";
import { requireAuth } from "@/lib/auth/token";
import Groq from "groq-sdk";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const authError = requireAuth(request);
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

  const transcript = msgs.rows
    .map((m) => `${String(m.role).toUpperCase()}: ${String(m.content)}`)
    .join("\n");

  const client = new Groq({ apiKey: process.env.GROQ_API_KEY });
  const response = await client.chat.completions.create({
    model: "llama-3.1-8b-instant",
    temperature: 0.3,
    max_tokens: 300,
    messages: [
      {
        role: "system",
        content: "You are summarizing a sales qualification conversation for Ahmed Al-Azizi at Gateway to Oman. Write a concise summary with exactly these five labeled sections, each 1-2 sentences, plain prose:\n\nWHO: Who this person is.\nWANTS: What they want in Oman.\nSIGNALS: Qualifying indicators and hot/warm/cold assessment.\nBOTTLENECKS: Concerns or obstacles. If none, write 'None identified.'\nNEXT STEP: Recommended action for Ahmed.",
      },
      { role: "user", content: `Conversation:\n\n${transcript}` },
    ],
  });

  const summary = response.choices[0]?.message?.content ?? "";
  await db.execute({
    sql: "UPDATE leads SET ai_summary = ? WHERE id = ?",
    args: [summary, params.id],
  });

  return NextResponse.json({ summary });
}

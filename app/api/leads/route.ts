import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db/client";
import { requireAuth } from "@/lib/auth/token";
import Groq from "groq-sdk";
import { sendPushNotification } from "@/lib/push/notify";

async function generateLeadSummary(leadId: string, conversationId: string | null, db: ReturnType<typeof getDb>) {
  if (!conversationId) return;

  try {
    const msgs = await db.execute({
      sql: "SELECT role, content FROM messages WHERE conversation_id = ? ORDER BY created_at ASC",
      args: [conversationId],
    });

    if (msgs.rows.length < 2) {
      await db.execute({
        sql: "UPDATE leads SET ai_summary = ? WHERE id = ?",
        args: ["Lead submitted with minimal conversation. Review lead details directly.", leadId],
      });
      return;
    }

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
          content: `You are summarizing a sales qualification conversation for Ahmed Al-Azizi at Gateway to Oman. Write a concise summary with exactly these five labeled sections, each 1-2 sentences, plain prose, no bullet points within sections:\n\nWHO: Who this person is — background, country, situation.\nWANTS: What they are specifically looking for in Oman.\nSIGNALS: Key qualifying indicators and hot/warm/cold assessment.\nBOTTLENECKS: Concerns, hesitations, or obstacles they raised. If none, write "None identified."\nNEXT STEP: Recommended action for Ahmed.`,
        },
        {
          role: "user",
          content: `Conversation:\n\n${transcript}`,
        },
      ],
    });

    const summary = response.choices[0]?.message?.content ?? "";
    await db.execute({
      sql: "UPDATE leads SET ai_summary = ? WHERE id = ?",
      args: [summary, leadId],
    });
  } catch (err) {
    console.error("Summary generation failed:", err);
  }
}

export async function POST(request: NextRequest) {
  try {
    const { name, email, phone, countryCode, conversationId, segment, interests } =
      await request.json();

    if (!name || !email) {
      return NextResponse.json(
        { error: "name and email are required" },
        { status: 400 }
      );
    }

    const db = getDb();

    const result = await db.execute({
      sql: `INSERT INTO leads (name, email, phone, country_code, conversation_id, segment, interests)
            VALUES (?, ?, ?, ?, ?, ?, ?) RETURNING *`,
      args: [
        name,
        email,
        phone ?? null,
        countryCode ?? null,
        conversationId ?? null,
        segment ?? null,
        interests ?? null,
      ],
    });

    // Update conversation outcome
    if (conversationId) {
      await db.execute({
        sql: "UPDATE conversations SET outcome = 'captured', ended_at = datetime('now') WHERE id = ?",
        args: [conversationId],
      });
    }

    const leadId = result.rows[0].id as string;

    // Fire-and-forget: generate AI summary without blocking response
    generateLeadSummary(leadId, conversationId ?? null, db).catch(console.error);

    // Fire-and-forget: notify admin of new lead
    sendPushNotification({
      title: "New Lead",
      body: `${name} — ${segment ?? "unknown segment"}`,
      url: "/admin/leads",
    }).catch(console.error);

    return NextResponse.json(result.rows[0], { status: 201 });
  } catch (error) {
    console.error("Lead creation error:", error);
    return NextResponse.json({ error: "Failed to create lead" }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  const authError = requireAuth(request);
  if (authError) return authError;

  try {
    const db = getDb();
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const qualification = searchParams.get("qualification");
    const segment = searchParams.get("segment");

    let sql = "SELECT * FROM leads";
    const conditions: string[] = [];
    const args: string[] = [];

    if (status) {
      conditions.push("status = ?");
      args.push(status);
    }
    if (qualification) {
      conditions.push("qualification = ?");
      args.push(qualification);
    }
    if (segment) {
      conditions.push("segment = ?");
      args.push(segment);
    }

    if (conditions.length > 0) {
      sql += " WHERE " + conditions.join(" AND ");
    }
    sql += " ORDER BY created_at DESC";

    const result = await db.execute({ sql, args });
    return NextResponse.json(result.rows);
  } catch (error) {
    console.error("Leads list error:", error);
    return NextResponse.json({ error: "Failed to fetch leads" }, { status: 500 });
  }
}

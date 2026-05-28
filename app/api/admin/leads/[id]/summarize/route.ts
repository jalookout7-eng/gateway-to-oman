import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db/client";
import { requireAuth } from "@/lib/auth/token";
import { summariseLead, type LeadFacts } from "@/lib/ai/lead-summary";

/**
 * Admin-triggered "Regenerate" of a lead's AI summary. Delegates to the
 * shared `summariseLead()` helper so it uses the same prompt + provider
 * chain as the auto-generation path in /api/leads.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } },
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

  const facts: LeadFacts = {
    name: (row.name as string | null) ?? null,
    email: (row.email as string | null) ?? null,
    phone: (row.phone as string | null) ?? null,
    country_code: (row.country_code as string | null) ?? null,
    segment: (row.segment as string | null) ?? null,
    interests: (row.interests as string | null) ?? null,
  };

  let transcript: string | null = null;
  if (conversationId) {
    const msgs = await db.execute({
      sql: "SELECT role, content FROM messages WHERE conversation_id = ? ORDER BY created_at ASC",
      args: [conversationId],
    });
    if (msgs.rows.length > 0) {
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
  }

  let summary: string;
  try {
    summary = await summariseLead(facts, transcript);
  } catch (err) {
    console.error("[summarize] AI provider failed", err);
    return NextResponse.json(
      { error: "AI summary generation failed; try again shortly." },
      { status: 502 },
    );
  }

  await db.execute({
    sql: "UPDATE leads SET ai_summary = ? WHERE id = ?",
    args: [summary, params.id],
  });

  return NextResponse.json({ summary });
}

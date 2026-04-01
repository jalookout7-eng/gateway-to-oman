import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db/client";
import { requireAuth } from "@/lib/auth/token";

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

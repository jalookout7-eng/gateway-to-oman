import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db/client";
import { requireAuth } from "@/lib/auth/token";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const authError = requireAuth(request);
  if (authError) return authError;

  const db = getDb();

  const conversation = await db.execute({
    sql: "SELECT * FROM conversations WHERE id = ?",
    args: [params.id],
  });

  if (conversation.rows.length === 0) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const messages = await db.execute({
    sql: "SELECT * FROM messages WHERE conversation_id = ? ORDER BY created_at ASC",
    args: [params.id],
  });

  return NextResponse.json({
    ...conversation.rows[0],
    messages: messages.rows,
  });
}

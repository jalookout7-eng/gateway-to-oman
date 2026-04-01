import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db/client";
import { requireAuth } from "@/lib/auth/token";

export async function GET(request: NextRequest) {
  const authError = requireAuth(request);
  if (authError) return authError;

  const db = getDb();
  const { searchParams } = new URL(request.url);
  const outcome = searchParams.get("outcome");

  let sql = "SELECT * FROM conversations";
  const args: string[] = [];

  if (outcome) {
    sql += " WHERE outcome = ?";
    args.push(outcome);
  }
  sql += " ORDER BY started_at DESC";

  const result = await db.execute({ sql, args });
  return NextResponse.json(result.rows);
}

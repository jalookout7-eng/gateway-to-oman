import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db/client";
import { requireAuth } from "@/lib/auth/token";

export async function GET(request: NextRequest) {
  const authError = await requireAuth(request);
  if (authError) return authError;

  const db = getDb();
  const { searchParams } = new URL(request.url);
  const outcome = searchParams.get("outcome");
  const source = searchParams.get("source");

  let sql = "SELECT * FROM conversations";
  const conditions: string[] = [];
  const args: string[] = [];

  if (outcome) {
    conditions.push("outcome = ?");
    args.push(outcome);
  }
  if (source) {
    conditions.push("source = ?");
    args.push(source);
  }
  if (conditions.length > 0) {
    sql += " WHERE " + conditions.join(" AND ");
  }
  sql += " ORDER BY started_at DESC";

  const result = await db.execute({ sql, args });
  return NextResponse.json(result.rows);
}

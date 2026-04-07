import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db/client";
import { requireAuth } from "@/lib/auth/token";

export async function GET(request: NextRequest) {
  const authError = requireAuth(request);
  if (authError) return authError;

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  const db = getDb();

  let sql = "SELECT id, lead_id, booking_id, to_address, subject, status, approved_at FROM emails";
  const args: string[] = [];

  if (status) {
    sql += " WHERE status = ?";
    args.push(status);
  }

  sql += " ORDER BY rowid DESC";

  const result = await db.execute({ sql, args });
  return NextResponse.json(result.rows);
}

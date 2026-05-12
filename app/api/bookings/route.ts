import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db/client";
import { requireAuth } from "@/lib/auth/token";

export async function GET(request: NextRequest) {
  const authError = await requireAuth(request);
  if (authError) return authError;

  const db = getDb();
  const { searchParams } = new URL(request.url);
  const source = searchParams.get("source");

  const conditions: string[] = [];
  const args: string[] = [];
  if (source) {
    conditions.push("b.source = ?");
    args.push(source);
  }
  const whereClause = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

  const result = await db.execute({
    sql: `SELECT b.id, b.lead_id, b.preferred_date, b.preferred_time, b.status, b.source, b.created_at,
                 l.name as leadName, l.email, l.phone
          FROM bookings b
          LEFT JOIN leads l ON l.id = b.lead_id
          ${whereClause}
          ORDER BY b.preferred_date ASC, b.preferred_time ASC`,
    args,
  });
  return NextResponse.json(result.rows);
}

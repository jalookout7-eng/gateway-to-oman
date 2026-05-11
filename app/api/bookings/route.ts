import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db/client";
import { requireAuth } from "@/lib/auth/token";

export async function GET(request: NextRequest) {
  const authError = await requireAuth(request);
  if (authError) return authError;

  const db = getDb();
  const result = await db.execute({
    sql: `SELECT b.id, b.lead_id, b.preferred_date, b.preferred_time, b.status, b.created_at,
                 l.name as leadName, l.email, l.phone
          FROM bookings b
          LEFT JOIN leads l ON l.id = b.lead_id
          ORDER BY b.preferred_date ASC, b.preferred_time ASC`,
    args: [],
  });
  return NextResponse.json(result.rows);
}

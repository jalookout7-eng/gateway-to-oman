import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/token";
import { getDb } from "@/lib/db/client";

export async function GET(request: NextRequest) {
  const authError = await requireAuth(request);
  if (authError) return authError;

  const db = getDb();
  const result = await db.execute(`
    SELECT id, email, full_name, phone, country_code,
           email_verified, access_activated, google_id, lead_id,
           last_login_at, created_at
    FROM marketplace_users
    ORDER BY access_activated DESC, created_at DESC
  `);

  return NextResponse.json({
    users: result.rows.map((row) => ({
      id: row.id,
      email: row.email,
      full_name: row.full_name,
      phone: row.phone,
      country_code: row.country_code,
      email_verified: Number(row.email_verified) === 1,
      access_activated: Number(row.access_activated) === 1,
      google_signin: Boolean(row.google_id),
      lead_id: row.lead_id,
      last_login_at: row.last_login_at,
      created_at: row.created_at,
    })),
  });
}

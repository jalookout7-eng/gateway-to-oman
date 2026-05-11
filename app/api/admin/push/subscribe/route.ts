import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db/client";
import { requireAuth } from "@/lib/auth/token";

export async function POST(request: NextRequest) {
  const authError = await requireAuth(request);
  if (authError) return authError;

  const { endpoint, keys } = await request.json();

  if (!endpoint || typeof endpoint !== "string" || !keys?.p256dh || !keys?.auth) {
    return NextResponse.json({ error: "Invalid subscription" }, { status: 400 });
  }

  const db = getDb();

  await db.execute({
    sql: `INSERT INTO push_subscriptions (endpoint, p256dh, auth)
          VALUES (?, ?, ?)
          ON CONFLICT(endpoint) DO UPDATE SET p256dh = excluded.p256dh, auth = excluded.auth`,
    args: [endpoint, keys.p256dh, keys.auth],
  });

  return NextResponse.json({ ok: true });
}

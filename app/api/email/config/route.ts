import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db/client";
import { requireAuth } from "@/lib/auth/token";

export async function GET(request: NextRequest) {
  const authError = await requireAuth(request);
  if (authError) return authError;

  const db = getDb();
  const result = await db.execute({
    sql: "SELECT * FROM settings WHERE key LIKE 'email_%'",
    args: [],
  });

  const config: Record<string, string> = {};
  for (const row of result.rows) {
    config[row.key as string] = row.value as string;
  }

  return NextResponse.json(config);
}

export async function POST(request: NextRequest) {
  const authError = await requireAuth(request);
  if (authError) return authError;

  const settings = await request.json();
  const db = getDb();

  for (const [key, value] of Object.entries(settings)) {
    await db.execute({
      sql: `INSERT INTO settings (key, value) VALUES (?, ?)
            ON CONFLICT(key) DO UPDATE SET value = ?, updated_at = datetime('now')`,
      args: [key, value as string, value as string],
    });
  }

  return NextResponse.json({ saved: true });
}

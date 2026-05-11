import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db/client";
import { requireAuth } from "@/lib/auth/token";

export async function GET(request: NextRequest) {
  const authError = await requireAuth(request);
  if (authError) return authError;
  const db = getDb();
  const result = await db.execute({ sql: "SELECT * FROM blocked_slots ORDER BY date ASC", args: [] });
  return NextResponse.json(result.rows);
}

export async function POST(request: NextRequest) {
  const authError = await requireAuth(request);
  if (authError) return authError;
  const body = await request.json();
  const { date, timeSlot, reason } = body;
  if (!date || typeof date !== "string") {
    return NextResponse.json({ error: "date is required" }, { status: 400 });
  }
  const db = getDb();
  await db.execute({
    sql: "INSERT INTO blocked_slots (date, time_slot, reason) VALUES (?, ?, ?)",
    args: [date, timeSlot ?? null, reason ?? null],
  });
  return NextResponse.json({ ok: true }, { status: 201 });
}

export async function DELETE(request: NextRequest) {
  const authError = await requireAuth(request);
  if (authError) return authError;
  const body = await request.json();
  const { id } = body;
  if (!id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }
  const db = getDb();
  await db.execute({ sql: "DELETE FROM blocked_slots WHERE id = ?", args: [id] });
  return NextResponse.json({ ok: true });
}

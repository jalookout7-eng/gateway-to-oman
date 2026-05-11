import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db/client";
import { requireAuth } from "@/lib/auth/token";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const authError = await requireAuth(request);
  if (authError) return authError;

  const db = getDb();
  const result = await db.execute({
    sql: "SELECT * FROM leads WHERE id = ?",
    args: [params.id],
  });

  if (result.rows.length === 0) {
    return NextResponse.json({ error: "Lead not found" }, { status: 404 });
  }

  return NextResponse.json(result.rows[0]);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const authError = await requireAuth(request);
  if (authError) return authError;

  const updates = await request.json();
  const db = getDb();

  const allowed = ["status", "qualification", "name", "email", "phone", "country_code"];
  const setClauses: string[] = [];
  const args: string[] = [];

  for (const [key, value] of Object.entries(updates)) {
    if (allowed.includes(key)) {
      setClauses.push(`${key} = ?`);
      args.push(value as string);
    }
  }

  if (setClauses.length === 0) {
    return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
  }

  setClauses.push("updated_at = datetime('now')");
  args.push(params.id);

  const result = await db.execute({
    sql: `UPDATE leads SET ${setClauses.join(", ")} WHERE id = ? RETURNING *`,
    args,
  });

  return NextResponse.json(result.rows[0]);
}

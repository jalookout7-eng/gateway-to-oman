import { NextRequest, NextResponse } from "next/server";
import { requireAuth, requireOwner, getRequestUser } from "@/lib/auth/token";
import { getDb } from "@/lib/db/client";
import { hashPassword } from "@/lib/auth/password";

export async function GET(request: NextRequest) {
  const authError = await requireAuth(request);
  if (authError) return authError;

  const db = getDb();
  const result = await db.execute(`
    SELECT id, email, full_name, role, active, created_at, last_login_at
    FROM admin_users
    ORDER BY role = 'owner' DESC, active DESC, created_at ASC
  `);

  return NextResponse.json({
    users: result.rows.map((row) => ({
      id: row.id,
      email: row.email,
      full_name: row.full_name,
      role: row.role,
      active: Number(row.active) === 1,
      created_at: row.created_at,
      last_login_at: row.last_login_at,
    })),
  });
}

export async function POST(request: NextRequest) {
  const authError = await requireOwner(request);
  if (authError) return authError;
  const currentUser = await getRequestUser(request);

  const body = await request.json().catch(() => ({}));
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const fullName = typeof body.full_name === "string" ? body.full_name.trim() : null;
  const password = typeof body.password === "string" ? body.password : "";
  const role = ["owner", "admin", "viewer"].includes(body.role) ? body.role : "admin";

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Valid email required" }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
  }

  const db = getDb();
  const existing = await db.execute({
    sql: "SELECT id FROM admin_users WHERE lower(email) = ?",
    args: [email],
  });
  if (existing.rows.length > 0) {
    return NextResponse.json({ error: "An admin with that email already exists" }, { status: 409 });
  }

  const passwordHash = await hashPassword(password);
  const inserted = await db.execute({
    sql: `INSERT INTO admin_users (email, full_name, password_hash, role)
          VALUES (?, ?, ?, ?) RETURNING id`,
    args: [email, fullName, passwordHash, role],
  });
  const newId = inserted.rows[0].id as string;

  await db.execute({
    sql: `INSERT INTO activity_log (actor_type, actor_id, action, target_type, target_id, metadata_json)
          VALUES (?, ?, ?, ?, ?, ?)`,
    args: [
      currentUser ? "admin" : "system",
      currentUser?.id ?? null,
      "admin_user_created",
      "admin_user",
      newId,
      JSON.stringify({ email, role }),
    ],
  });

  return NextResponse.json({ id: newId }, { status: 201 });
}

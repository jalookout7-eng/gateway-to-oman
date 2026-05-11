import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getDb } from "@/lib/db/client";
import { verifyPassword } from "@/lib/auth/password";
import { createSession, SESSION_COOKIE_NAME, cookieOptions } from "@/lib/auth/sessions";

export async function POST(request: NextRequest) {
  let body: { email?: string; password?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const email = body.email?.trim().toLowerCase();
  const password = body.password;

  if (!email || !password) {
    return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
  }

  const db = getDb();
  const result = await db.execute({
    sql: "SELECT id, email, password_hash, full_name, role, active FROM admin_users WHERE email = ? LIMIT 1",
    args: [email],
  });

  if (result.rows.length === 0) {
    return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
  }
  const user = result.rows[0];
  if (Number(user.active) !== 1) {
    return NextResponse.json({ error: "Account is inactive" }, { status: 403 });
  }

  const ok = await verifyPassword(password, user.password_hash as string);
  if (!ok) {
    return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
  }

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
  const userAgent = request.headers.get("user-agent");
  const token = await createSession(user.id as string, ip, userAgent);

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, token, cookieOptions());

  await db.execute({
    sql: `INSERT INTO activity_log (actor_type, actor_id, action, target_type, target_id, source, ip, user_agent)
          VALUES ('admin', ?, 'admin_logged_in', 'admin_users', ?, 'main', ?, ?)`,
    args: [user.id, user.id, ip, userAgent],
  });

  return NextResponse.json({
    user: {
      id: user.id,
      email: user.email,
      full_name: user.full_name,
      role: user.role,
    },
  });
}

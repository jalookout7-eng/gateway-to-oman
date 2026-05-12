import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/token";
import { getDb } from "@/lib/db/client";

const PAGE_SIZE = 50;

export async function GET(request: NextRequest) {
  const authError = await requireAuth(request);
  if (authError) return authError;

  const url = new URL(request.url);
  const actor = url.searchParams.get("actor"); // bot | admin | system | visitor | null
  const source = url.searchParams.get("source"); // main | businesses | null
  const action = url.searchParams.get("action"); // free-text contains
  const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1", 10));

  const where: string[] = [];
  const args: (string | number)[] = [];
  if (actor) { where.push("a.actor_type = ?"); args.push(actor); }
  if (source) { where.push("a.source = ?"); args.push(source); }
  if (action) { where.push("a.action LIKE ?"); args.push(`%${action}%`); }

  const whereClause = where.length ? `WHERE ${where.join(" AND ")}` : "";
  const offset = (page - 1) * PAGE_SIZE;

  const db = getDb();
  const result = await db.execute({
    sql: `
      SELECT
        a.id, a.actor_type, a.actor_id, a.action, a.target_type, a.target_id,
        a.source, a.metadata_json, a.ip, a.user_agent, a.created_at,
        u.email AS actor_email, u.full_name AS actor_name
      FROM activity_log a
      LEFT JOIN admin_users u ON u.id = a.actor_id AND a.actor_type = 'admin'
      ${whereClause}
      ORDER BY a.created_at DESC
      LIMIT ? OFFSET ?
    `,
    args: [...args, PAGE_SIZE + 1, offset],
  });

  const rows = result.rows.slice(0, PAGE_SIZE);
  const hasMore = result.rows.length > PAGE_SIZE;

  const totalRow = await db.execute({
    sql: `SELECT COUNT(*) AS c FROM activity_log a ${whereClause}`,
    args,
  });
  const total = Number(totalRow.rows[0].c);

  return NextResponse.json({
    entries: rows.map((r) => ({
      id: r.id,
      actor_type: r.actor_type,
      actor_id: r.actor_id,
      actor_email: r.actor_email,
      actor_name: r.actor_name,
      action: r.action,
      target_type: r.target_type,
      target_id: r.target_id,
      source: r.source,
      metadata: r.metadata_json ? safeJson(r.metadata_json as string) : null,
      ip: r.ip,
      created_at: r.created_at,
    })),
    page,
    pageSize: PAGE_SIZE,
    hasMore,
    total,
  });
}

function safeJson(s: string): unknown {
  try {
    return JSON.parse(s);
  } catch {
    return s;
  }
}

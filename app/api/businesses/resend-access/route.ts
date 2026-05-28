import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db/client";

/**
 * Stub for "Sign in" on the businesses marketplace.
 * For now we treat sign-in as: "if you've requested access before, we'll resend
 * your access details to your email." No password auth yet — Phase 2 work.
 * Always returns 200 so we don't leak which emails are in the system.
 */
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Valid email required" }, { status: 400 });
  }

  const db = getDb();
  try {
    const result = await db.execute({
      sql: `SELECT id, name, outcome FROM leads WHERE source = 'businesses' AND lower(email) = ? ORDER BY created_at DESC LIMIT 1`,
      args: [email],
    });

    if (result.rows.length > 0) {
      await db.execute({
        sql: `INSERT INTO activity_log (actor_type, action, target_type, target_id, source, metadata_json)
              VALUES (?, ?, ?, ?, ?, ?)`,
        args: [
          "visitor",
          "marketplace_signin_request",
          "lead",
          result.rows[0].id,
          "businesses",
          JSON.stringify({ email, outcome: result.rows[0].outcome }),
        ],
      });
    }
  } catch (err) {
    console.error("resend-access lookup failed:", err);
  }

  return NextResponse.json({
    ok: true,
    message:
      "If your email matches a previous request, our team will resend your access details shortly. If you don't hear back within 24 hours, please request access via the sign-up tab.",
  });
}

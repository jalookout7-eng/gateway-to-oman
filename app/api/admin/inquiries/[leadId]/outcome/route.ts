import { NextRequest, NextResponse } from "next/server";
import { requireAuth, getRequestUser } from "@/lib/auth/token";
import { getDb } from "@/lib/db/client";

const VALID_OUTCOMES = ["pending", "contacted", "converted", "nurture", "rejected"] as const;
type Outcome = (typeof VALID_OUTCOMES)[number];

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ leadId: string }> },
) {
  const authError = await requireAuth(request);
  if (authError) return authError;

  const { leadId } = await params;
  let body: { outcome?: string; admin_notes?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const outcome = body.outcome as Outcome | undefined;
  if (outcome && !VALID_OUTCOMES.includes(outcome)) {
    return NextResponse.json(
      { error: `Invalid outcome. Must be one of: ${VALID_OUTCOMES.join(", ")}` },
      { status: 400 },
    );
  }

  const db = getDb();
  const sets: string[] = [];
  const args: (string | null)[] = [];
  if (outcome) {
    sets.push("outcome = ?", "outcome_updated_at = datetime('now')");
    args.push(outcome);
  }
  if (typeof body.admin_notes === "string") {
    sets.push("admin_notes = ?");
    args.push(body.admin_notes);
  }
  if (sets.length === 0) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }
  args.push(leadId);

  await db.execute({
    sql: `UPDATE leads SET ${sets.join(", ")}, updated_at = datetime('now') WHERE id = ?`,
    args,
  });

  const user = await getRequestUser(request);
  await db.execute({
    sql: `INSERT INTO activity_log (actor_type, actor_id, action, target_type, target_id, source, metadata_json)
          VALUES ('admin', ?, 'inquiry_updated', 'leads', ?, 'businesses', ?)`,
    args: [
      user?.id ?? null,
      leadId,
      JSON.stringify({ outcome: outcome ?? null, admin_notes: body.admin_notes ?? null }),
    ],
  });

  return NextResponse.json({ ok: true, leadId, outcome });
}

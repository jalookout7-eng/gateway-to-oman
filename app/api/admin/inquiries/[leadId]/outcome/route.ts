import { NextRequest, NextResponse } from "next/server";
import { requireAuth, getRequestUser } from "@/lib/auth/token";
import { getDb } from "@/lib/db/client";

const VALID_OUTCOMES = ["pending", "contacted", "converted", "nurture", "rejected"] as const;
type Outcome = (typeof VALID_OUTCOMES)[number];
const VALID_REASONS = ["won", "lost_not_qualified", "lost_execution", "lost_external", "lost_unresponsive", "nurturing"] as const;
const VALID_GRADE = ["yes", "no", "unsure"] as const;

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ leadId: string }> },
) {
  const authError = await requireAuth(request);
  if (authError) return authError;

  const { leadId } = await params;
  let body: { outcome?: string; admin_notes?: string; outcome_reason?: string; omar_grade_correct?: string };
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
  const outcomeReason = body.outcome_reason as string | undefined;
  if (outcomeReason && !VALID_REASONS.includes(outcomeReason as (typeof VALID_REASONS)[number])) {
    return NextResponse.json({ error: `Invalid outcome_reason` }, { status: 400 });
  }
  const gradeCorrect = body.omar_grade_correct as string | undefined;
  if (gradeCorrect && !VALID_GRADE.includes(gradeCorrect as (typeof VALID_GRADE)[number])) {
    return NextResponse.json({ error: `Invalid omar_grade_correct` }, { status: 400 });
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
  if (outcomeReason) { sets.push("outcome_reason = ?"); args.push(outcomeReason); }
  if (gradeCorrect) { sets.push("omar_grade_correct = ?"); args.push(gradeCorrect); }
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
      JSON.stringify({ outcome: outcome ?? null, admin_notes: body.admin_notes ?? null, outcome_reason: outcomeReason ?? null, omar_grade_correct: gradeCorrect ?? null }),
    ],
  });

  return NextResponse.json({ ok: true, leadId, outcome });
}

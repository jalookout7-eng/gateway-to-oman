import { NextRequest, NextResponse } from "next/server";
import { requireAuth, getRequestUser } from "@/lib/auth/token";
import { getDb } from "@/lib/db/client";

// Allowlisted editable fields and their validators
const VALID_STATUS = ["new", "contacted", "in_progress", "converted", "closed"] as const;
const VALID_QUALIFICATION = ["hot", "warm", "cold"] as const;
const VALID_SEGMENT = ["entrepreneur", "investor", "professional", "retiree"] as const;

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const authError = await requireAuth(request);
  if (authError) return authError;

  const { id: leadId } = await params;

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // --- Validate each allowed field ---
  const status = body.status as string | undefined;
  if (status !== undefined) {
    if (!VALID_STATUS.includes(status as (typeof VALID_STATUS)[number])) {
      return NextResponse.json(
        { error: `Invalid status. Must be one of: ${VALID_STATUS.join(", ")}` },
        { status: 400 },
      );
    }
  }

  const qualification = body.qualification as string | undefined;
  if (qualification !== undefined) {
    if (!VALID_QUALIFICATION.includes(qualification as (typeof VALID_QUALIFICATION)[number])) {
      return NextResponse.json(
        { error: `Invalid qualification. Must be one of: ${VALID_QUALIFICATION.join(", ")}` },
        { status: 400 },
      );
    }
  }

  const segment = body.segment as string | undefined;
  if (segment !== undefined) {
    if (!VALID_SEGMENT.includes(segment as (typeof VALID_SEGMENT)[number])) {
      return NextResponse.json(
        { error: `Invalid segment. Must be one of: ${VALID_SEGMENT.join(", ")}` },
        { status: 400 },
      );
    }
  }

  const admin_notes = body.admin_notes as string | undefined;
  if (admin_notes !== undefined) {
    if (typeof admin_notes !== "string") {
      return NextResponse.json({ error: "admin_notes must be a string" }, { status: 400 });
    }
    if (admin_notes.length > 5000) {
      return NextResponse.json({ error: "admin_notes must be at most 5000 characters" }, { status: 400 });
    }
  }

  // At least one recognized field must be present
  if (
    status === undefined &&
    qualification === undefined &&
    segment === undefined &&
    admin_notes === undefined
  ) {
    return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
  }

  const db = getDb();

  // SELECT current values of fields about to change (for activity_log before/after)
  const currentRow = await db.execute({
    sql: "SELECT status, qualification, segment, admin_notes FROM leads WHERE id = ?",
    args: [leadId],
  });
  if (currentRow.rows.length === 0) {
    return NextResponse.json({ error: "Lead not found" }, { status: 404 });
  }
  const current = currentRow.rows[0] as unknown as {
    status: string | null;
    qualification: string | null;
    segment: string | null;
    admin_notes: string | null;
  };

  // Build dynamic UPDATE
  const sets: string[] = [];
  const args: (string | null)[] = [];

  if (status !== undefined) { sets.push("status = ?"); args.push(status); }
  if (qualification !== undefined) { sets.push("qualification = ?"); args.push(qualification); }
  if (segment !== undefined) { sets.push("segment = ?"); args.push(segment); }
  if (admin_notes !== undefined) { sets.push("admin_notes = ?"); args.push(admin_notes); }

  args.push(leadId);

  await db.execute({
    sql: `UPDATE leads SET ${sets.join(", ")}, updated_at = datetime('now') WHERE id = ?`,
    args,
  });

  // Build changes object — only include fields that actually changed
  const changes: Record<string, { before: string | null; after: string }> = {};
  if (status !== undefined && status !== current.status) {
    changes.status = { before: current.status, after: status };
  }
  if (qualification !== undefined && qualification !== current.qualification) {
    changes.qualification = { before: current.qualification, after: qualification };
  }
  if (segment !== undefined && segment !== current.segment) {
    changes.segment = { before: current.segment, after: segment };
  }
  if (admin_notes !== undefined && admin_notes !== current.admin_notes) {
    changes.admin_notes = { before: current.admin_notes, after: admin_notes };
  }

  // Only write activity_log if something actually changed
  if (Object.keys(changes).length > 0) {
    const user = await getRequestUser(request);
    const ip = request.headers.get("x-forwarded-for") ?? request.headers.get("x-real-ip") ?? null;
    const userAgent = request.headers.get("user-agent") ?? null;

    await db.execute({
      sql: `INSERT INTO activity_log
              (actor_type, actor_id, action, target_type, target_id, source, metadata_json, ip, user_agent)
            VALUES ('admin', ?, 'lead_update', 'lead', ?, 'main', ?, ?, ?)`,
      args: [
        user?.id ?? null,
        leadId,
        JSON.stringify({ changes }),
        ip,
        userAgent,
      ],
    });
  }

  return NextResponse.json({ ok: true });
}

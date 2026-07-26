import { NextRequest, NextResponse } from "next/server";
import { requireAuth, getRequestUser } from "@/lib/auth/token";
import { getDb } from "@/lib/db/client";
import { deleteLeadCascade } from "@/lib/admin/lead-delete";

/**
 * Single-lead read for the admin detail page (/admin/leads/[id]).
 *
 * Returns the lead, its transcript, and any pending draft email in one
 * round trip so the page does not waterfall three requests.
 *
 * score_breakdown is stripped: it is internal scoring state that the
 * browser has no use for (closes audit finding C-1 for this route; the
 * list endpoint still selects it and is tracked separately).
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const authError = await requireAuth(request);
  if (authError) return authError;

  const { id: leadId } = await params;
  const db = getDb();

  const leadRow = await db.execute({
    sql: "SELECT * FROM leads WHERE id = ?",
    args: [leadId],
  });
  if (leadRow.rows.length === 0) {
    return NextResponse.json({ error: "Lead not found" }, { status: 404 });
  }

  const { score_breakdown: _omit, ...lead } = leadRow.rows[0] as unknown as Record<string, unknown>;

  let messages: { role: string; content: string; created_at: string }[] = [];
  if (lead.conversation_id) {
    const msgRows = await db.execute({
      sql: "SELECT role, content, created_at FROM messages WHERE conversation_id = ? ORDER BY created_at ASC",
      args: [String(lead.conversation_id)],
    });
    messages = msgRows.rows.map((m) => ({
      role: String(m.role),
      content: String(m.content),
      created_at: String(m.created_at),
    }));
  }

  const emailRow = await db.execute({
    sql: "SELECT id, subject FROM emails WHERE lead_id = ? AND status = 'draft' ORDER BY created_at DESC LIMIT 1",
    args: [leadId],
  });
  const pendingEmail = emailRow.rows[0]
    ? { id: String(emailRow.rows[0].id), subject: String(emailRow.rows[0].subject) }
    : null;

  return NextResponse.json({ lead, messages, pendingEmail });
}

/**
 * Validate that a candidate value exists as an active slug in the lead_options
 * lookup for the given kind. Replaces the previous hardcoded enum allowlist.
 */
async function isValidOption(kind: "status" | "qualification" | "segment", slug: string): Promise<boolean> {
  const db = getDb();
  const r = await db.execute({
    sql: "SELECT 1 FROM lead_options WHERE kind = ? AND slug = ? AND active = 1 LIMIT 1",
    args: [kind, slug],
  });
  return r.rows.length > 0;
}

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

  // --- Validate each allowed field against the lead_options lookup ---
  const status = body.status as string | undefined;
  if (status !== undefined && !(await isValidOption("status", status))) {
    return NextResponse.json(
      { error: `Invalid status '${status}'. Manage allowed values in Settings → Lead options.` },
      { status: 400 },
    );
  }

  const qualification = body.qualification as string | undefined;
  if (qualification !== undefined && !(await isValidOption("qualification", qualification))) {
    return NextResponse.json(
      { error: `Invalid qualification '${qualification}'. Manage allowed values in Settings → Lead options.` },
      { status: 400 },
    );
  }

  const segment = body.segment as string | undefined;
  if (segment !== undefined && !(await isValidOption("segment", segment))) {
    return NextResponse.json(
      { error: `Invalid segment '${segment}'. Manage allowed values in Settings → Lead options.` },
      { status: 400 },
    );
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

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const authError = await requireAuth(request);
  if (authError) return authError;

  const { id: leadId } = await params;
  const user = await getRequestUser(request);
  const ip = request.headers.get("x-forwarded-for") ?? request.headers.get("x-real-ip") ?? null;
  const userAgent = request.headers.get("user-agent") ?? null;

  try {
    const result = await deleteLeadCascade(leadId, user?.id ?? null, ip, userAgent);
    if (!result.deleted) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[admin/leads delete] failed:", err);
    return NextResponse.json({ error: "Delete failed" }, { status: 500 });
  }
}


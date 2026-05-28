import { NextRequest, NextResponse } from "next/server";
import { requireAuth, getRequestUser } from "@/lib/auth/token";
import { deleteLeadCascade } from "@/lib/admin/lead-delete";

/**
 * POST /api/admin/leads/bulk-delete
 *
 * Body: { ids: string[] }
 *
 * Multi-row test-data cleanup (Notes 7). Each ID goes through the same
 * cascade as the single-row endpoint — emails, lead_notes, inquiries,
 * bookings.lead_id→NULL, messages+conversation if the lead had one, then
 * the lead row itself. Each delete writes its own activity_log entry so
 * the audit trail records exactly what went.
 *
 * Per-row failures don't abort the batch — we collect the failures and
 * return them in the response so the UI can show "deleted N of M" with
 * a sensible error per failed row.
 *
 * Hard cap of 200 ids per request — anything bigger should be done in
 * batches by the client.
 */

const MAX_BULK = 200;

export async function POST(request: NextRequest) {
  const authError = await requireAuth(request);
  if (authError) return authError;

  let body: { ids?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const ids = body.ids;
  if (!Array.isArray(ids) || ids.length === 0) {
    return NextResponse.json({ error: "ids must be a non-empty array" }, { status: 400 });
  }
  if (ids.length > MAX_BULK) {
    return NextResponse.json(
      { error: `Too many ids — max ${MAX_BULK} per request.` },
      { status: 400 },
    );
  }
  if (!ids.every((id) => typeof id === "string" && id.length > 0)) {
    return NextResponse.json({ error: "ids must be non-empty strings" }, { status: 400 });
  }

  const user = await getRequestUser(request);
  const ip = request.headers.get("x-forwarded-for") ?? request.headers.get("x-real-ip") ?? null;
  const userAgent = request.headers.get("user-agent") ?? null;

  let deleted = 0;
  const failed: { id: string; reason: string }[] = [];

  for (const id of ids) {
    try {
      const result = await deleteLeadCascade(id, user?.id ?? null, ip, userAgent);
      if (result.deleted) {
        deleted += 1;
      } else {
        failed.push({ id, reason: result.reason ?? "unknown" });
      }
    } catch (err) {
      console.error(`[bulk-delete] failed for lead ${id}:`, err);
      failed.push({
        id,
        reason: err instanceof Error ? err.message : "unknown error",
      });
    }
  }

  return NextResponse.json({
    deleted,
    failed,
    total: ids.length,
  });
}

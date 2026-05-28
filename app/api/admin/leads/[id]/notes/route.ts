import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db/client";
import { requireAuth, getRequestUser } from "@/lib/auth/token";

/**
 * GET /api/admin/leads/[id]/notes
 *
 * Returns the notes timeline for a lead in chronological order. Each note
 * carries author info + a timestamp. Used by the admin lead-detail view to
 * render the timeline between AI Summary and Conversation Transcript.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const authError = await requireAuth(request);
  if (authError) return authError;

  const { id: leadId } = await params;
  const db = getDb();
  const result = await db.execute({
    sql: `SELECT id, author_type, author_id, author_name, body, created_at
          FROM lead_notes
          WHERE lead_id = ?
          ORDER BY created_at ASC`,
    args: [leadId],
  });
  return NextResponse.json({
    notes: result.rows.map((r) => ({
      id: r.id as string,
      author_type: r.author_type as "admin" | "omar",
      author_id: (r.author_id as string | null) ?? null,
      author_name: r.author_name as string,
      body: r.body as string,
      created_at: r.created_at as string,
    })),
  });
}

/**
 * POST /api/admin/leads/[id]/notes
 * body: { body: string }
 *
 * Creates an admin note (author_type='admin'). The signed-in admin is the
 * author. Omar's auto-notes use a separate path (/api/chat/event) so this
 * endpoint stays strictly an "admin manual write".
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const authError = await requireAuth(request);
  if (authError) return authError;

  const { id: leadId } = await params;
  const user = await getRequestUser(request);
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const noteBody = body.body;
  if (typeof noteBody !== "string" || noteBody.trim().length === 0) {
    return NextResponse.json({ error: "body is required" }, { status: 400 });
  }
  if (noteBody.length > 5000) {
    return NextResponse.json(
      { error: "body must be ≤ 5000 characters" },
      { status: 400 },
    );
  }

  const db = getDb();

  // Confirm lead exists before we write — return 404 cleanly rather than FK errors.
  const leadCheck = await db.execute({
    sql: "SELECT id FROM leads WHERE id = ?",
    args: [leadId],
  });
  if (leadCheck.rows.length === 0) {
    return NextResponse.json({ error: "Lead not found" }, { status: 404 });
  }

  const authorName = user.full_name ?? user.email;
  const inserted = await db.execute({
    sql: `INSERT INTO lead_notes (lead_id, author_type, author_id, author_name, body)
          VALUES (?, 'admin', ?, ?, ?)
          RETURNING id, created_at`,
    args: [leadId, user.id, authorName, noteBody.trim()],
  });

  const noteId = inserted.rows[0].id as string;
  const createdAt = inserted.rows[0].created_at as string;

  return NextResponse.json(
    {
      id: noteId,
      author_type: "admin",
      author_id: user.id,
      author_name: authorName,
      body: noteBody.trim(),
      created_at: createdAt,
    },
    { status: 201 },
  );
}

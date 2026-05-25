// app/api/admin/intelligence/notes/route.ts
import { NextRequest, NextResponse } from "next/server";
import { requireOwner } from "@/lib/auth/token";
import { getDb } from "@/lib/db/client";
import { listNotes, createNote, updateNote, deleteNote, type NoteKind, type NoteStatus } from "@/lib/intelligence/notes";

const KINDS = ["hypothesis", "learning", "analysis_run"];
const STATUSES = ["open", "confirmed", "archived"];

export async function GET(request: NextRequest) {
  const authError = await requireOwner(request);
  if (authError) return authError;
  return NextResponse.json({ notes: await listNotes(getDb()) });
}

export async function POST(request: NextRequest) {
  const authError = await requireOwner(request);
  if (authError) return authError;
  const body = await request.json().catch(() => ({}));
  if (!KINDS.includes(body.kind) || typeof body.title !== "string" || !body.title.trim()) {
    return NextResponse.json({ error: "kind and title required" }, { status: 400 });
  }
  const id = await createNote(getDb(), { kind: body.kind as NoteKind, title: body.title, body: body.body ?? null });
  return NextResponse.json({ id });
}

export async function PATCH(request: NextRequest) {
  const authError = await requireOwner(request);
  if (authError) return authError;
  const body = await request.json().catch(() => ({}));
  if (typeof body.id !== "string") return NextResponse.json({ error: "id required" }, { status: 400 });
  if (body.status && !STATUSES.includes(body.status)) return NextResponse.json({ error: "bad status" }, { status: 400 });
  const status: NoteStatus | undefined = STATUSES.includes(body.status) ? (body.status as NoteStatus) : undefined;
  await updateNote(getDb(), body.id, { title: body.title, body: body.body, status });
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: NextRequest) {
  const authError = await requireOwner(request);
  if (authError) return authError;
  const id = request.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  await deleteNote(getDb(), id);
  return NextResponse.json({ ok: true });
}

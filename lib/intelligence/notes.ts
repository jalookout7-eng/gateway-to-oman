// lib/intelligence/notes.ts
import type { Client } from "@libsql/client";

export type NoteKind = "hypothesis" | "learning" | "analysis_run";
export type NoteStatus = "open" | "confirmed" | "archived";

export interface IntelNote {
  id: string; kind: NoteKind; title: string; body: string | null;
  status: NoteStatus; created_at: string; updated_at: string;
}

export async function listNotes(db: Client): Promise<IntelNote[]> {
  const res = await db.execute("SELECT id, kind, title, body, status, created_at, updated_at FROM intelligence_notes ORDER BY updated_at DESC");
  return res.rows.map((r) => ({
    id: String(r.id), kind: r.kind as NoteKind, title: String(r.title),
    body: (r.body as string | null) ?? null, status: r.status as NoteStatus,
    created_at: String(r.created_at), updated_at: String(r.updated_at),
  }));
}

export async function createNote(db: Client, input: { kind: NoteKind; title: string; body?: string | null }): Promise<string> {
  const res = await db.execute({
    sql: "INSERT INTO intelligence_notes (kind, title, body) VALUES (?, ?, ?) RETURNING id",
    args: [input.kind, input.title.trim(), input.body ?? null],
  });
  return String(res.rows[0].id);
}

export async function updateNote(db: Client, id: string, patch: { title?: string; body?: string | null; status?: NoteStatus }): Promise<void> {
  const sets: string[] = []; const args: (string | null)[] = [];
  if (patch.title !== undefined) { sets.push("title = ?"); args.push(patch.title.trim()); }
  if (patch.body !== undefined) { sets.push("body = ?"); args.push(patch.body); }
  if (patch.status !== undefined) { sets.push("status = ?"); args.push(patch.status); }
  if (sets.length === 0) return;
  sets.push("updated_at = datetime('now')");
  args.push(id);
  await db.execute({ sql: `UPDATE intelligence_notes SET ${sets.join(", ")} WHERE id = ?`, args });
}

export async function deleteNote(db: Client, id: string): Promise<void> {
  await db.execute({ sql: "DELETE FROM intelligence_notes WHERE id = ?", args: [id] });
}

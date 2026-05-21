"use client";
import { useEffect, useState, useCallback } from "react";
import { Plus, Check, Archive, Trash2 } from "lucide-react";

type Note = { id: string; kind: string; title: string; body: string | null; status: string };
function authHeaders() {
  return { Authorization: `Bearer ${typeof window !== "undefined" ? localStorage.getItem("admin_token") ?? "" : ""}`, "Content-Type": "application/json" };
}

export function NotesPanel() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [kind, setKind] = useState("hypothesis");
  const [title, setTitle] = useState("");

  const load = useCallback(async () => {
    const r = await fetch("/api/admin/intelligence/notes", { headers: authHeaders(), credentials: "include" });
    if (r.ok) setNotes((await r.json()).notes);
  }, []);
  useEffect(() => { load(); }, [load]);

  async function add() {
    if (!title.trim()) return;
    await fetch("/api/admin/intelligence/notes", { method: "POST", headers: authHeaders(), credentials: "include", body: JSON.stringify({ kind, title }) });
    setTitle(""); load();
  }
  async function patch(id: string, status: string) {
    await fetch("/api/admin/intelligence/notes", { method: "PATCH", headers: authHeaders(), credentials: "include", body: JSON.stringify({ id, status }) });
    load();
  }
  async function remove(id: string) {
    await fetch(`/api/admin/intelligence/notes?id=${id}`, { method: "DELETE", headers: authHeaders(), credentials: "include" });
    load();
  }

  return (
    <div className="rounded-xl bg-white ring-1 ring-gray-200 shadow-sm p-4">
      <h2 className="text-xs uppercase tracking-wide font-bold text-gray-500 mb-3">Hypotheses & confirmed learnings</h2>
      <div className="flex gap-2 mb-3">
        <select value={kind} onChange={(e) => setKind(e.target.value)} className="rounded-md border border-gray-200 text-sm px-2 py-1.5">
          <option value="hypothesis">Hypothesis</option><option value="learning">Learning</option><option value="analysis_run">Analysis run</option>
        </select>
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="New note…" className="flex-1 rounded-md border border-gray-200 text-sm px-3 py-1.5" />
        <button onClick={add} className="inline-flex items-center gap-1 rounded-md bg-navy text-white text-sm px-3 py-1.5"><Plus className="h-4 w-4" />Add</button>
      </div>
      <ul className="divide-y divide-gray-100">
        {notes.map((n) => (
          <li key={n.id} className="py-2 flex items-center gap-2">
            <span className="text-[10px] uppercase font-semibold text-gray-400 w-20">{n.kind}</span>
            <span className={`flex-1 text-sm ${n.status === "archived" ? "line-through text-gray-400" : "text-navy"}`}>{n.title}</span>
            <span className="text-[10px] text-gray-400">{n.status}</span>
            <button title="Confirm" onClick={() => patch(n.id, "confirmed")} className="text-gray-400 hover:text-emerald-600"><Check className="h-4 w-4" /></button>
            <button title="Archive" onClick={() => patch(n.id, "archived")} className="text-gray-400 hover:text-amber-600"><Archive className="h-4 w-4" /></button>
            <button title="Delete" onClick={() => remove(n.id)} className="text-gray-400 hover:text-red-600"><Trash2 className="h-4 w-4" /></button>
          </li>
        ))}
        {notes.length === 0 && <li className="py-2 text-sm text-gray-400 italic">No notes yet — add a hypothesis to start.</li>}
      </ul>
    </div>
  );
}

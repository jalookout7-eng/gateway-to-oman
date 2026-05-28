"use client";

import { useState, useEffect, useCallback } from "react";
import { Send, User as UserIcon, Bot } from "lucide-react";

interface Note {
  id: string;
  author_type: "admin" | "omar";
  author_id: string | null;
  author_name: string;
  body: string;
  created_at: string;
}

/**
 * Notes timeline for a single lead. Lives in the admin lead-detail expanded
 * panel, between AI Summary + Admin Notes (single sticky note) and the
 * Conversation Transcript. Renders the chronological log:
 *
 *   - Omar AI auto-notes (WhatsApp clicks, Calendly bookings, keep-chat
 *     summaries) — written by /api/chat/event when the visitor takes one
 *     of those actions.
 *   - Manual admin notes — added via the inline form below the list.
 *
 * Loads only when the lead row is expanded (caller controls mount), so we
 * don't bulk-fetch notes for the entire leads page.
 */
export function LeadNotesTimeline({ leadId }: { leadId: string }) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [draft, setDraft] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const fetchNotes = useCallback(async () => {
    setError("");
    try {
      const res = await fetch(`/api/admin/leads/${leadId}/notes`, {
        credentials: "include",
      });
      if (!res.ok) {
        setError("Could not load notes.");
        return;
      }
      const data = (await res.json()) as { notes: Note[] };
      setNotes(data.notes);
    } catch {
      setError("Network error loading notes.");
    } finally {
      setLoading(false);
    }
  }, [leadId]);

  useEffect(() => {
    fetchNotes();
  }, [fetchNotes]);

  async function handleAdd() {
    if (!draft.trim() || submitting) return;
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/leads/${leadId}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ body: draft.trim() }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Could not add note.");
        return;
      }
      const newNote = (await res.json()) as Note;
      setNotes((prev) => [...prev, newNote]);
      setDraft("");
    } catch {
      setError("Network error saving note.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mt-4 border-t border-gray-100 pt-4">
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
        Notes timeline
      </p>

      {loading ? (
        <p className="text-xs text-gray-400 italic">Loading…</p>
      ) : notes.length === 0 ? (
        <p className="text-xs text-gray-400 italic">No notes yet — add the first one below.</p>
      ) : (
        <ul className="space-y-2">
          {notes.map((n) => (
            <li
              key={n.id}
              className="flex gap-2 text-sm"
            >
              <span
                className={`flex-shrink-0 mt-0.5 inline-flex h-6 w-6 items-center justify-center rounded-full ${
                  n.author_type === "omar"
                    ? "bg-gold/15 text-gold"
                    : "bg-navy/10 text-navy"
                }`}
                title={n.author_type === "omar" ? "Omar AI" : "Admin"}
              >
                {n.author_type === "omar" ? (
                  <Bot className="h-3 w-3" />
                ) : (
                  <UserIcon className="h-3 w-3" />
                )}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-gray-500">
                  <span className="font-semibold text-gray-700">{n.author_name}</span>
                  {" · "}
                  {new Date(n.created_at + (n.created_at.endsWith("Z") ? "" : "Z")).toLocaleString()}
                </p>
                <p className="text-sm text-gray-700 mt-0.5 whitespace-pre-line leading-relaxed">
                  {n.body}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}

      {error && (
        <p className="mt-2 text-xs text-red-600">{error}</p>
      )}

      {/* Add-note form */}
      <div className="mt-3 flex gap-2">
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleAdd();
            }
          }}
          placeholder="Add a note…"
          className="flex-1 px-3 py-2 text-sm rounded-lg border border-gray-200 focus:border-gold focus:outline-none focus:ring-2 focus:ring-gold/20"
        />
        <button
          onClick={handleAdd}
          disabled={!draft.trim() || submitting}
          aria-label="Add note"
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg gold-gradient text-white text-sm font-semibold hover:shadow disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Send className="h-3.5 w-3.5" />
          {submitting ? "Saving…" : "Add"}
        </button>
      </div>
    </div>
  );
}

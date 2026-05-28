"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Inbox,
  Mail,
  Phone,
  MessageSquare,
  Briefcase,
  ExternalLink,
  Search,
  Loader2,
  CheckCircle2,
  Trash2,
} from "lucide-react";

type Inquiry = {
  lead_id: string;
  name: string;
  email: string;
  phone: string | null;
  message: string | null;
  outcome: "pending" | "contacted" | "converted" | "nurture" | "rejected";
  lead_status: string;
  admin_notes: string | null;
  submitted_at: string;
  outcome_updated_at: string | null;
  outcome_reason: string | null;
  omar_grade_correct: string | null;
  inquiry_id: string | null;
  listing: {
    id: string;
    slug: string;
    title: string;
    city: string | null;
    category: string;
  } | null;
};

const OUTCOME_LABEL: Record<Inquiry["outcome"], string> = {
  pending: "Pending",
  contacted: "Contacted",
  converted: "Converted",
  nurture: "Nurture",
  rejected: "Rejected",
};

const OUTCOME_STYLES: Record<Inquiry["outcome"], string> = {
  pending: "bg-amber-50 text-amber-700 ring-amber-200",
  contacted: "bg-blue-50 text-blue-700 ring-blue-200",
  converted: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  nurture: "bg-purple-50 text-purple-700 ring-purple-200",
  rejected: "bg-gray-100 text-gray-600 ring-gray-200",
};

function authHeaders() {
  return { "Content-Type": "application/json" };
}

export default function AdminInquiriesPage() {
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [outcomeFilter, setOutcomeFilter] = useState<"all" | Inquiry["outcome"]>("all");
  // Multi-select for test-data cleanup (Notes 7). Same Set<string> pattern
  // used in /admin/leads — delete cascades through the same DELETE
  // /api/admin/leads/[id] endpoint since an inquiry IS a businesses-source lead.
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);

  const toggleSelected = useCallback((leadId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(leadId)) next.delete(leadId);
      else next.add(leadId);
      return next;
    });
  }, []);

  async function handleDelete(leadId: string, name: string, email: string) {
    if (!window.confirm(`Delete inquiry from "${name}" (${email})? This also wipes their lead record, chat transcript, and any other inquiries. Cannot be undone.`)) {
      return;
    }
    try {
      const res = await fetch(`/api/admin/leads/${leadId}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        window.alert(`Delete failed: ${data.error ?? res.statusText}`);
        return;
      }
      setInquiries((prev) => prev.filter((i) => i.lead_id !== leadId));
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(leadId);
        return next;
      });
    } catch (err) {
      window.alert(`Delete failed: ${err instanceof Error ? err.message : "Connection error"}`);
    }
  }

  async function handleBulkDelete() {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    if (!window.confirm(`Delete ${ids.length} inquir${ids.length === 1 ? "y" : "ies"}? This wipes the lead records, chat transcripts, and any related rows. Cannot be undone.`)) {
      return;
    }
    setBulkDeleting(true);
    try {
      const res = await fetch(`/api/admin/leads/bulk-delete`, {
        method: "POST",
        credentials: "include",
        headers: authHeaders(),
        body: JSON.stringify({ ids }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        window.alert(`Bulk delete failed: ${data.error ?? res.statusText}`);
        return;
      }
      const deleted: number = data.deleted ?? 0;
      const failed: { id: string; reason: string }[] = data.failed ?? [];
      setInquiries((prev) => prev.filter((i) => !selectedIds.has(i.lead_id) || failed.some((f) => f.id === i.lead_id)));
      setSelectedIds(new Set(failed.map((f) => f.id)));
      if (failed.length > 0) {
        window.alert(`Deleted ${deleted} of ${ids.length}. ${failed.length} failed — they remain selected so you can retry.`);
      }
    } catch (err) {
      window.alert(`Bulk delete failed: ${err instanceof Error ? err.message : "Connection error"}`);
    } finally {
      setBulkDeleting(false);
    }
  }

  const fetchInquiries = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/inquiries", {
        headers: authHeaders(),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setInquiries(data.inquiries);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInquiries();
  }, [fetchInquiries]);

  async function updateAttribution(
    leadId: string,
    patch: { outcome?: Inquiry["outcome"]; outcome_reason?: string; omar_grade_correct?: string },
  ) {
    setInquiries((prev) =>
      prev.map((i) =>
        i.lead_id === leadId
          ? { ...i, ...patch, ...(patch.outcome ? { outcome_updated_at: new Date().toISOString() } : {}) }
          : i,
      ),
    );
    try {
      await fetch(`/api/admin/inquiries/${leadId}/outcome`, {
        method: "PATCH",
        headers: authHeaders(),
        credentials: "include",
        body: JSON.stringify(patch),
      });
    } catch {
      // optimistic update already applied; a reload re-syncs
    }
  }

  async function updateOutcome(leadId: string, outcome: Inquiry["outcome"]) {
    await updateAttribution(leadId, { outcome });
  }

  async function approveAccess(leadId: string) {
    if (!confirm("Approve marketplace access for this visitor? They'll be able to sign in and see the full marketplace.")) return;
    try {
      const res = await fetch(`/api/admin/inquiries/${leadId}/approve`, {
        method: "POST",
        headers: authHeaders(),
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error ?? "Approve failed");
        return;
      }
      if (data.already_activated) {
        alert("This visitor already has marketplace access.");
      } else {
        alert("Access approved. They can now sign in.");
      }
      fetchInquiries();
    } catch {
      alert("Connection error");
    }
  }

  const filtered = inquiries.filter((i) => {
    if (outcomeFilter !== "all" && i.outcome !== outcomeFilter) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      i.name.toLowerCase().includes(q) ||
      i.email.toLowerCase().includes(q) ||
      i.message?.toLowerCase().includes(q) ||
      i.listing?.title.toLowerCase().includes(q)
    );
  });

  const stats = {
    total: inquiries.length,
    pending: inquiries.filter((i) => i.outcome === "pending").length,
    contacted: inquiries.filter((i) => i.outcome === "contacted").length,
    converted: inquiries.filter((i) => i.outcome === "converted").length,
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold text-navy">Marketplace inquiries</h1>
        <p className="text-sm text-gray-500 mt-1">
          Access requests submitted from <span className="font-medium">/businesses/access</span>.
          New ones are pending until you contact the lead and update their status.
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="Total" value={stats.total} accent="navy" />
        <StatCard label="Pending" value={stats.pending} accent="amber" />
        <StatCard label="Contacted" value={stats.contacted} accent="blue" />
        <StatCard label="Converted" value={stats.converted} accent="emerald" />
      </div>

      {/* Bulk-delete action bar — Notes 7. Same UX as /admin/leads. */}
      {selectedIds.size > 0 && (
        <div className="flex items-center justify-between bg-red-50 border border-red-200 rounded-lg px-4 py-2.5">
          <span className="text-sm text-red-700 font-medium">
            {selectedIds.size} selected
          </span>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setSelectedIds(new Set())}
              disabled={bulkDeleting}
              className="text-sm text-red-700 hover:text-red-900 disabled:opacity-50"
            >
              Clear
            </button>
            <button
              type="button"
              onClick={handleBulkDelete}
              disabled={bulkDeleting}
              className="inline-flex items-center gap-1.5 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded-md px-3 py-1.5 transition-colors disabled:opacity-50"
            >
              <Trash2 className="h-3.5 w-3.5" />
              {bulkDeleting ? "Deleting…" : `Delete selected (${selectedIds.size})`}
            </button>
          </div>
        </div>
      )}

      <div className="rounded-xl bg-white ring-1 ring-gray-200 shadow-sm overflow-hidden">
        <div className="border-b border-gray-100 p-4 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, email, message…"
              className="w-full rounded-md border border-gray-200 bg-gray-50 pl-9 pr-3 py-2 text-sm focus:bg-white focus:border-gold focus:ring-2 focus:ring-gold/20 outline-none"
            />
          </div>
          <div className="flex items-center gap-1 flex-wrap">
            {(["all", "pending", "contacted", "converted", "nurture", "rejected"] as const).map((o) => (
              <button
                key={o}
                type="button"
                onClick={() => setOutcomeFilter(o)}
                className={`rounded-md px-2.5 py-1.5 text-xs font-semibold transition-colors ${
                  outcomeFilter === o
                    ? "bg-navy text-white"
                    : "bg-gray-50 text-gray-600 hover:bg-gray-100"
                }`}
              >
                {o === "all" ? "All" : o.charAt(0).toUpperCase() + o.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="p-12 text-center text-gray-400 inline-flex items-center justify-center gap-2 w-full">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading inquiries…
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center">
            <Inbox className="mx-auto h-10 w-10 text-gray-300" strokeWidth={1.5} />
            <p className="mt-3 font-heading text-lg font-semibold text-navy">
              {inquiries.length === 0 ? "No access requests yet." : "No matches."}
            </p>
            <p className="mt-1 text-sm text-gray-500">
              {inquiries.length === 0
                ? "When a visitor clicks a listing card and submits the access form, it'll show up here."
                : "Try clearing filters or broadening your search."}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {filtered.map((i) => (
              <InquiryRow
                key={i.lead_id}
                inquiry={i}
                selected={selectedIds.has(i.lead_id)}
                onToggleSelect={() => toggleSelected(i.lead_id)}
                onDelete={() => handleDelete(i.lead_id, i.name, i.email)}
                onUpdateOutcome={updateOutcome}
                onUpdateAttribution={updateAttribution}
                onApprove={approveAccess}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function InquiryRow({
  inquiry: i,
  selected,
  onToggleSelect,
  onDelete,
  onUpdateOutcome,
  onUpdateAttribution,
  onApprove,
}: {
  inquiry: Inquiry;
  selected: boolean;
  onToggleSelect: () => void;
  onDelete: () => void;
  onUpdateOutcome: (leadId: string, outcome: Inquiry["outcome"]) => void;
  onUpdateAttribution: (leadId: string, patch: { outcome?: Inquiry["outcome"]; outcome_reason?: string; omar_grade_correct?: string }) => void;
  onApprove: (leadId: string) => void;
}) {
  return (
    <div className={`p-5 hover:bg-gray-50/50 transition-colors ${selected ? "bg-red-50/40" : ""}`}>
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_240px] gap-5">
        <div className="space-y-3">
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            {/* Multi-select checkbox + trash button (Notes 7). The checkbox
                feeds the bulk-delete action bar above; the trash icon is a
                single-row delete with its own confirm. */}
            <input
              type="checkbox"
              checked={selected}
              onChange={onToggleSelect}
              aria-label={`Select inquiry from ${i.name}`}
              className="h-4 w-4 rounded border-gray-300 text-gold focus:ring-gold/30 cursor-pointer self-center"
            />
            <h3 className="font-heading text-lg font-semibold text-navy">{i.name}</h3>
            <span
              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${OUTCOME_STYLES[i.outcome]}`}
            >
              {OUTCOME_LABEL[i.outcome]}
            </span>
            <span className="text-xs text-gray-400">
              {new Date(i.submitted_at).toLocaleString()}
            </span>
            <button
              type="button"
              onClick={onDelete}
              aria-label="Delete inquiry"
              title="Delete this inquiry + lead record"
              className="ml-auto p-1 text-gray-300 hover:text-red-600 transition-colors"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-700">
            <a href={`mailto:${i.email}`} className="inline-flex items-center gap-1.5 hover:text-gold">
              <Mail className="h-3.5 w-3.5" />
              {i.email}
            </a>
            {i.phone && (
              <a
                href={`https://wa.me/${i.phone.replace(/[^0-9+]/g, "")}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 hover:text-gold"
              >
                <Phone className="h-3.5 w-3.5" />
                {i.phone}
              </a>
            )}
          </div>

          {i.listing && (
            <Link
              href={`/businesses/listing/${i.listing.slug}`}
              target="_blank"
              className="inline-flex items-center gap-2 text-sm bg-gold/5 ring-1 ring-gold/20 rounded-lg px-3 py-1.5 hover:ring-gold/40 transition-all"
            >
              <Briefcase className="h-3.5 w-3.5 text-gold" />
              <span className="font-medium text-navy">{i.listing.title}</span>
              <span className="text-xs text-gray-500">
                {[i.listing.category, i.listing.city].filter(Boolean).join(" · ")}
              </span>
              <ExternalLink className="h-3 w-3 text-gray-400" />
            </Link>
          )}

          {i.message && (
            <div className="rounded-lg bg-gray-50 ring-1 ring-gray-100 p-3 text-sm text-gray-700">
              <MessageSquare className="inline h-3.5 w-3.5 text-gray-400 mr-1 -mt-0.5" />
              {i.message}
            </div>
          )}
        </div>

        <div className="space-y-2 lg:border-l lg:border-gray-100 lg:pl-5">
          {i.outcome !== "converted" && (
            <button
              type="button"
              onClick={() => onApprove(i.lead_id)}
              className="w-full inline-flex items-center justify-center gap-2 rounded-md gold-gradient text-white text-sm font-semibold py-2 shadow-sm hover:shadow-md transition-shadow"
            >
              <CheckCircle2 className="h-4 w-4" />
              Approve access
            </button>
          )}

          <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 pt-1">Move to</p>
          {(["pending", "contacted", "converted", "nurture", "rejected"] as const).map((o) => (
            <button
              key={o}
              type="button"
              onClick={() => o !== i.outcome && onUpdateOutcome(i.lead_id, o)}
              disabled={o === i.outcome}
              className={`w-full text-left rounded-md px-3 py-1.5 text-sm transition-colors ${
                o === i.outcome
                  ? "bg-navy/5 text-navy/40 font-semibold cursor-default"
                  : "text-gray-600 hover:bg-gray-100 hover:text-navy"
              }`}
            >
              {OUTCOME_LABEL[o]}
            </button>
          ))}

          {/* Attribution controls — shown once the lead is resolved. The blank
              placeholder is display-only; selecting it is a no-op (the outcome
              API does not support clearing a set value via empty string). */}
          {i.outcome !== "pending" && (
            <div className="mt-2 flex flex-wrap gap-2">
              {/* Loss/won reason */}
              <select
                value={i.outcome_reason ?? ""}
                onChange={(e) => {
                  if (e.target.value) onUpdateAttribution(i.lead_id, { outcome_reason: e.target.value });
                }}
                className="rounded-md border border-gray-200 text-xs px-2 py-1"
              >
                <option value="">Reason…</option>
                {(i.outcome === "converted"
                  ? ["won"]
                  : i.outcome === "rejected"
                    ? ["lost_not_qualified", "lost_execution", "lost_external", "lost_unresponsive"]
                    : ["nurturing"]
                ).map((r) => (
                  <option key={r} value={r}>{r.replace(/_/g, " ")}</option>
                ))}
              </select>

              {/* Was Omar's grade right? — independent of the deal result */}
              <select
                value={i.omar_grade_correct ?? ""}
                onChange={(e) => {
                  if (e.target.value) onUpdateAttribution(i.lead_id, { omar_grade_correct: e.target.value });
                }}
                className="rounded-md border border-gray-200 text-xs px-2 py-1"
                title="Was Omar's hot/warm/cold read correct?"
              >
                <option value="">Omar right?…</option>
                <option value="yes">Yes</option>
                <option value="no">No</option>
                <option value="unsure">Unsure</option>
              </select>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent: "navy" | "amber" | "blue" | "emerald";
}) {
  const ACCENT: Record<string, string> = {
    navy: "ring-navy/10 [&>p]:text-navy",
    amber: "ring-amber-200 [&>p]:text-amber-600",
    blue: "ring-blue-200 [&>p]:text-blue-600",
    emerald: "ring-emerald-200 [&>p]:text-emerald-600",
  };
  return (
    <div className={`rounded-xl bg-white ring-1 shadow-sm p-4 ${ACCENT[accent]}`}>
      <p className="text-2xl font-heading font-semibold">{value}</p>
      <p className="text-xs text-gray-500 mt-0.5 uppercase tracking-wide font-medium">{label}</p>
    </div>
  );
}

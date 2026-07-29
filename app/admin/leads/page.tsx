"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { paginate, clampPage, LEAD_PAGE_SIZES, DEFAULT_LEAD_PAGE_SIZE, type LeadPageSize } from "@/lib/admin/pagination";

interface Lead {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  country_code: string | null;
  segment: string | null;
  interests: string | null;
  qualification: string | null;
  status: string | null;
  source: string | null;
  admin_notes: string | null;
  conversation_id: string | null;
  created_at: string;
  ai_summary?: string | null;
}

function authHeaders() {
  return { "Content-Type": "application/json" };
}

async function updateLead(
  leadId: string,
  patch: Partial<Pick<Lead, "status" | "qualification" | "segment" | "admin_notes">>,
  setLeads: React.Dispatch<React.SetStateAction<Lead[]>>,
) {
  // Optimistic update
  setLeads((prev) => prev.map((l) => (l.id === leadId ? { ...l, ...patch } : l)));
  try {
    await fetch(`/api/admin/leads/${leadId}`, {
      method: "PATCH",
      headers: authHeaders(),
      credentials: "include",
      body: JSON.stringify(patch),
    });
  } catch {
    // optimistic update already applied; a reload re-syncs
  }
}

interface LeadOption {
  slug: string;
  label: string;
}

type LeadOptionsByKind = {
  status: LeadOption[];
  qualification: LeadOption[];
  segment: LeadOption[];
};

const EMPTY_LEAD_OPTIONS: LeadOptionsByKind = { status: [], qualification: [], segment: [] };

export default function LeadsPage() {
  const router = useRouter();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterSegment, setFilterSegment] = useState("");
  const [filterQualification, setFilterQualification] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterSource, setFilterSource] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  // Admin-editable lookups, loaded once, fall back to empty list if endpoint
  // is unreachable (the dropdown still shows the current value plus "-").
  const [leadOptions, setLeadOptions] = useState<LeadOptionsByKind>(EMPTY_LEAD_OPTIONS);
  // Multi-select state for the bulk-delete tool (Notes 7). A Set<string> of
  // lead IDs the visitor has ticked the checkbox on.
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);

  // Pagination is client-side: the API returns every lead matching the
  // current filters, and this page slices it. `page` is 1-indexed and
  // clamped by lib/admin/pagination so an out-of-range value (from a
  // filter shrinking the result set, or rows disappearing after a delete)
  // never renders an empty table by mistake.
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<LeadPageSize>(DEFAULT_LEAD_PAGE_SIZE);

  const pagination = useMemo(() => paginate(leads, page, pageSize), [leads, page, pageSize]);

  // Toggle one lead in/out of the selection.
  const toggleSelected = useCallback((leadId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(leadId)) next.delete(leadId);
      else next.add(leadId);
      return next;
    });
  }, []);

  // Select-all / clear-all toggle in the table header. Scoped to the rows
  // visible on the current page only. Selecting every filtered lead
  // (including ones off-screen on other pages) for bulk delete would be a
  // dangerous surprise.
  const toggleSelectAll = useCallback(() => {
    const pageIds = pagination.pageItems.map((l) => l.id);
    setSelectedIds((prev) => {
      const allPageSelected = pageIds.length > 0 && pageIds.every((id) => prev.has(id));
      const next = new Set(prev);
      for (const id of pageIds) {
        if (allPageSelected) next.delete(id);
        else next.add(id);
      }
      return next;
    });
  }, [pagination.pageItems]);

  const allSelected = useMemo(() => {
    const pageIds = pagination.pageItems.map((l) => l.id);
    return pageIds.length > 0 && pageIds.every((id) => selectedIds.has(id));
  }, [pagination.pageItems, selectedIds]);

  // Single-row delete with confirmation.
  async function handleDelete(lead: Lead) {
    if (!window.confirm(`Delete lead "${lead.name}" (${lead.email})? This also wipes their chat transcript and any inquiries. Cannot be undone.`)) {
      return;
    }
    try {
      const res = await fetch(`/api/admin/leads/${lead.id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        window.alert(`Delete failed: ${data.error ?? res.statusText}`);
        return;
      }
      setLeads((prev) => prev.filter((l) => l.id !== lead.id));
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(lead.id);
        return next;
      });
    } catch (err) {
      window.alert(`Delete failed: ${err instanceof Error ? err.message : "Connection error"}`);
    }
  }

  // Bulk delete with confirmation (N selected, confirm, then POST /bulk-delete).
  async function handleBulkDelete() {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    if (!window.confirm(`Delete ${ids.length} lead${ids.length === 1 ? "" : "s"}? This wipes their chat transcripts and inquiries. Cannot be undone.`)) {
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
      setLeads((prev) => prev.filter((l) => !selectedIds.has(l.id) || failed.some((f) => f.id === l.id)));
      setSelectedIds(new Set(failed.map((f) => f.id)));
      if (failed.length > 0) {
        window.alert(`Deleted ${deleted} of ${ids.length}. ${failed.length} failed. They remain selected so you can retry.`);
      }
    } catch (err) {
      window.alert(`Bulk delete failed: ${err instanceof Error ? err.message : "Connection error"}`);
    } finally {
      setBulkDeleting(false);
    }
  }

  useEffect(() => {
    async function loadLeadOptions() {
      try {
        const res = await fetch("/api/admin/lead-options", {
          headers: authHeaders(),
          credentials: "include",
        });
        if (!res.ok) return;
        const data = (await res.json()) as {
          options: { kind: "status" | "qualification" | "segment"; slug: string; label: string }[];
        };
        const grouped: LeadOptionsByKind = { status: [], qualification: [], segment: [] };
        for (const o of data.options) {
          if (o.kind in grouped) grouped[o.kind].push({ slug: o.slug, label: o.label });
        }
        setLeadOptions(grouped);
      } catch {
        // network error: keep EMPTY_LEAD_OPTIONS; user can still edit notes
      }
    }
    loadLeadOptions();
  }, []);

  const fetchLeads = useCallback(async () => {
    const params = new URLSearchParams();
    if (filterSegment) params.set("segment", filterSegment);
    if (filterQualification) params.set("qualification", filterQualification);
    if (filterStatus) params.set("status", filterStatus);
    if (filterSource) params.set("source", filterSource);

    const leadsRes = await fetch(`/api/leads?${params}`, {
      headers: authHeaders(),
      credentials: "include",
    });

    if (leadsRes.ok) {
      setLeads((await leadsRes.json()) as Lead[]);
    }
    setLoading(false);
  }, [filterSegment, filterQualification, filterStatus, filterSource]);

  useEffect(() => { fetchLeads(); }, [fetchLeads]);

  // Changing a filter or the page size always lands back on page 1.
  // Without this, a filter that still leaves multiple pages of results
  // (just a different set of rows) would silently keep whatever page
  // number was active before, showing the admin the wrong rows.
  useEffect(() => {
    setPage(1);
  }, [filterSegment, filterQualification, filterStatus, filterSource, pageSize]);

  // Deleting rows (single or bulk) can leave `page` pointing past the new
  // last page; clamp it back so the table and the "Showing" text agree.
  useEffect(() => {
    if (pagination.page !== page) setPage(pagination.page);
  }, [pagination.page, page]);

  function handleExportCSV() {
    // Exports every filtered lead, not just the current page.
    const header = "Name,Email,Phone,Segment,Qualification,Status,Source,Date\n";
    const rows = leads.map(l =>
      `"${l.name}","${l.email}","${l.country_code ?? ""}${l.phone ?? ""}","${l.segment ?? ""}","${l.qualification ?? ""}","${l.status ?? ""}","${l.source ?? "main"}","${l.created_at}"`
    ).join("\n");
    const blob = new Blob([header + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "leads-export.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-navy">Leads</h1>
          <p className="text-sm text-gray-500 mt-1">{pagination.total} total leads</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowUploadModal(true)}>
            Upload CSV
          </Button>
          <Button variant="outline" size="sm" onClick={() => setShowAddModal(true)}>
            Add Lead
          </Button>
          <Button variant="gold" size="sm" onClick={handleExportCSV}>
            Export CSV
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <select
          value={filterSegment}
          onChange={(e) => setFilterSegment(e.target.value)}
          className="px-3 py-2 rounded-lg border border-gray-200 text-base sm:text-sm bg-white"
        >
          <option value="">All Segments</option>
          {leadOptions.segment.map((o) => (
            <option key={o.slug} value={o.slug}>{o.label}</option>
          ))}
        </select>
        <select
          value={filterQualification}
          onChange={(e) => setFilterQualification(e.target.value)}
          className="px-3 py-2 rounded-lg border border-gray-200 text-base sm:text-sm bg-white"
        >
          <option value="">All Qualifications</option>
          {leadOptions.qualification.map((o) => (
            <option key={o.slug} value={o.slug}>{o.label}</option>
          ))}
        </select>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-3 py-2 rounded-lg border border-gray-200 text-base sm:text-sm bg-white"
        >
          <option value="">All Statuses</option>
          {leadOptions.status.map((o) => (
            <option key={o.slug} value={o.slug}>{o.label}</option>
          ))}
        </select>
        <select
          value={filterSource}
          onChange={(e) => setFilterSource(e.target.value)}
          className="px-3 py-2 rounded-lg border border-gray-200 text-base sm:text-sm bg-white"
        >
          <option value="">All Sources</option>
          <option value="main">Main site</option>
          <option value="businesses">Businesses</option>
          <option value="intake">Intake form</option>
          <option value="import">Imported (old CRM)</option>
        </select>
      </div>

      {/* Bulk-delete action bar. Surfaces when at least one row is ticked.
          Sticks above the table; one-click delete with confirm. (Notes 7) */}
      {selectedIds.size > 0 && (
        <div className="mb-3 flex items-center justify-between bg-red-50 border border-red-200 rounded-lg px-4 py-2.5">
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

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-400">Loading leads...</div>
        ) : leads.length === 0 ? (
          <div className="p-8 text-center text-gray-400">No leads found</div>
        ) : (
          <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-3 py-3 w-9">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={toggleSelectAll}
                    aria-label="Select all leads on this page"
                    className="h-4 w-4 rounded border-gray-300 text-gold focus:ring-gold/30 cursor-pointer"
                  />
                </th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Name</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Email</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Phone</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600 hidden md:table-cell">Segment</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600 hidden md:table-cell">Interest</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Qual.</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600 hidden sm:table-cell">Source</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Date</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {pagination.pageItems.map((lead) => (
                  /* Row click opens the full lead detail page. The old inline
                     transcript and AI-summary expanders were removed when that
                     page landed: same information, one place. */
                  <tr
                    key={lead.id}
                    onClick={() => router.push(`/admin/leads/${lead.id}`)}
                    className={`border-b border-gray-50 hover:bg-warm-white cursor-pointer transition-colors ${
                      selectedIds.has(lead.id) ? "bg-red-50/50" : ""
                    }`}
                  >
                    <td className="px-3 py-3" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selectedIds.has(lead.id)}
                        onChange={() => toggleSelected(lead.id)}
                        aria-label={`Select ${lead.name}`}
                        className="h-4 w-4 rounded border-gray-300 text-gold focus:ring-gold/30 cursor-pointer"
                      />
                    </td>
                    <td className="px-4 py-3 font-medium text-navy">{lead.name}</td>
                    <td className="px-4 py-3 text-gray-600">{lead.email}</td>
                    <td className="px-4 py-3 text-gray-600">
                      {lead.country_code && lead.phone ? `${lead.country_code} ${lead.phone}` : lead.phone ?? "-"}
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell" onClick={(e) => e.stopPropagation()}>
                      <select
                        value={lead.segment ?? ""}
                        onChange={(e) => {
                          const val = e.target.value as Lead["segment"];
                          if (val !== lead.segment) updateLead(lead.id, { segment: val }, setLeads);
                        }}
                        className="text-base sm:text-xs rounded border border-gray-200 bg-white px-1.5 py-1"
                      >
                        <option value="">Not set</option>
                        {leadOptions.segment.map((o) => (
                          <option key={o.slug} value={o.slug}>{o.label}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3 text-gray-600 hidden md:table-cell">{lead.interests ?? "-"}</td>
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      <select
                        value={lead.qualification ?? ""}
                        onChange={(e) => {
                          const val = e.target.value as Lead["qualification"];
                          if (val !== lead.qualification) updateLead(lead.id, { qualification: val }, setLeads);
                        }}
                        className="text-base sm:text-xs rounded border border-gray-200 bg-white px-1.5 py-1"
                      >
                        <option value="">Not set</option>
                        {leadOptions.qualification.map((o) => (
                          <option key={o.slug} value={o.slug}>{o.label}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      <select
                        value={lead.status ?? ""}
                        onChange={(e) => {
                          const val = e.target.value as Lead["status"];
                          if (val !== lead.status) updateLead(lead.id, { status: val }, setLeads);
                        }}
                        className="text-base sm:text-xs rounded border border-gray-200 bg-white px-1.5 py-1"
                      >
                        <option value="">Not set</option>
                        {leadOptions.status.map((o) => (
                          <option key={o.slug} value={o.slug}>{o.label}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3 text-gray-600 capitalize hidden sm:table-cell">
                      {lead.source ?? "main"}
                    </td>
                    <td className="px-4 py-3 text-gray-500">
                      {new Date(lead.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => handleDelete(lead)}
                        className="p-1 text-gray-300 hover:text-red-600 transition-colors"
                        aria-label="Delete lead"
                        title="Delete this lead and all related data"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
              ))}
            </tbody>
          </table>
          </div>
        )}

        {/* Pagination bar. Client-side only; `leads` already holds every
            filtered row from the API, this just slices it for display. */}
        {!loading && leads.length > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-gray-100 px-4 py-3 text-sm text-gray-600">
            <div className="flex items-center gap-2 flex-wrap justify-center sm:justify-start">
              <label htmlFor="lead-page-size" className="text-gray-500">Rows per page</label>
              <select
                id="lead-page-size"
                value={pageSize}
                onChange={(e) => setPageSize(Number(e.target.value) as LeadPageSize)}
                className="rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-base sm:text-sm"
              >
                {LEAD_PAGE_SIZES.map((size) => (
                  <option key={size} value={size}>{size}</option>
                ))}
              </select>
              <span>
                Showing {pagination.from} to {pagination.to} of {pagination.total}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-gray-500">
                Page {pagination.page} of {pagination.totalPages}
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setPage((p) => clampPage(p - 1, pagination.totalPages))}
                  disabled={pagination.page <= 1}
                  className="px-3 py-1.5 rounded-lg border border-gray-200 font-medium text-gray-700 hover:bg-warm-white disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent transition-colors"
                >
                  Previous
                </button>
                <button
                  type="button"
                  onClick={() => setPage((p) => clampPage(p + 1, pagination.totalPages))}
                  disabled={pagination.page >= pagination.totalPages}
                  className="px-3 py-1.5 rounded-lg border border-gray-200 font-medium text-gray-700 hover:bg-warm-white disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent transition-colors"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Add Lead Modal */}
      <AddLeadModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onAdded={fetchLeads}
      />

      {/* Upload CSV Modal */}
      <UploadCSVModal
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        onUploaded={fetchLeads}
      />
    </div>
  );
}

// AdminNotesField removed in Batch 7d. The LeadNotesTimeline component
// now supersedes it (richer model: multi-entry list with author + timestamp,
// admin manual + Omar AI auto-writes). The leads.admin_notes column stays in
// the schema for backward compatibility with older rows but is no longer
// edited from the admin UI.

function AddLeadModal({ isOpen, onClose, onAdded }: { isOpen: boolean; onClose: () => void; onAdded: () => void }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ name, email, phone }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? res.statusText ?? "Failed to add lead");
        return;
      }
      setName(""); setEmail(""); setPhone("");
      onClose();
      onAdded();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Connection error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add Lead Manually">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input label="Name" value={name} onChange={(e) => setName(e.target.value)} required />
        <Input label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <Input label="Phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <Button type="submit" variant="gold" size="sm" className="w-full" disabled={submitting}>
          {submitting ? "Adding..." : "Add Lead"}
        </Button>
      </form>
    </Modal>
  );
}

// Columns the endpoint actually reads (matched case-insensitively by
// header name). Kept as a single source of truth for the table below so
// the dialog can never drift from what /api/leads/upload parses.
const CSV_COLUMNS: { name: string; required: boolean; note: string }[] = [
  { name: "name", required: true, note: "The lead's full name." },
  { name: "email", required: true, note: "The lead's email address." },
  { name: "phone", required: false, note: "Left blank if not provided." },
];

// A short, realistic example. The second row's name is quoted with a
// comma inside it (a "Last, First" value copied out of a spreadsheet) to
// show that quoted commas now parse as a single field instead of being
// split into the wrong column.
const EXAMPLE_CSV = [
  "name,email,phone",
  "Fatima Al Balushi,fatima@example.com,+968 9123 4567",
  '"Al Habsi, Salim",salim@example.com,+968 9234 5678',
  "Yousef Hamdan,yousef@example.com,",
].join("\n");

function UploadCSVModal({ isOpen, onClose, onUploaded }: { isOpen: boolean; onClose: () => void; onUploaded: () => void }) {
  const [uploading, setUploading] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [result, setResult] = useState<{ imported: number; skipped: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setFileName(file.name);
    setResult(null);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/leads/upload", {
        method: "POST",
        credentials: "include",
        body: formData,
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "The upload failed. Nothing was imported.");
        return;
      }

      const imported: number = typeof data.imported === "number" ? data.imported : 0;
      const skipped: number = typeof data.skipped === "number" ? data.skipped : 0;
      setResult({ imported, skipped });
      onUploaded();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Connection error. Nothing was imported.");
    } finally {
      setUploading(false);
      // Allow re-selecting the same file (e.g. after fixing it and
      // re-uploading) by clearing the input's value.
      e.target.value = "";
    }
  }

  async function handleCopyExample() {
    try {
      await navigator.clipboard.writeText(EXAMPLE_CSV);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard API can be unavailable (older browsers, blocked
      // permission). The example text below is still selectable by hand.
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Upload CSV">
      <div className="space-y-4">
        <div>
          <p className="text-sm text-gray-600">
            The file needs a header row. These columns are read by name (not case-sensitive). Any other columns in the file are ignored.
          </p>
          <div className="mt-2 overflow-hidden rounded-lg border border-gray-200">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[380px] text-sm">
                <thead className="bg-gray-50 text-gray-600">
                  <tr>
                    <th className="px-3 py-1.5 text-left font-medium">Column</th>
                    <th className="px-3 py-1.5 text-left font-medium">Required</th>
                    <th className="px-3 py-1.5 text-left font-medium">Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {CSV_COLUMNS.map((col) => (
                    <tr key={col.name}>
                      <td className="px-3 py-1.5 font-mono text-xs text-navy">{col.name}</td>
                      <td className="px-3 py-1.5">
                        {col.required ? (
                          <span className="font-medium text-red-600">Required</span>
                        ) : (
                          <span className="text-gray-400">Optional</span>
                        )}
                      </td>
                      <td className="px-3 py-1.5 text-gray-500">{col.note}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wide text-gray-500">Example CSV</span>
            <button
              type="button"
              onClick={handleCopyExample}
              className="text-xs font-semibold text-gold hover:text-gold/80"
            >
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
          <pre className="mt-1 overflow-x-auto rounded-lg border border-gray-200 bg-warm-white px-3 py-2 text-xs text-gray-700">
            {EXAMPLE_CSV}
          </pre>
        </div>

        <p className="text-xs text-gray-500">
          Rows missing a name or email are skipped, not imported. Uploaded leads are created with the default source (main) and no qualification set, so review and tag them afterward.
        </p>

        <div>
          <input
            type="file"
            accept=".csv"
            onChange={handleUpload}
            disabled={uploading}
            className="block w-full text-base sm:text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-gold/10 file:text-gold hover:file:bg-gold/20 disabled:opacity-50"
          />
          {uploading && (
            <p className="mt-2 text-sm text-gray-500">
              Uploading{fileName ? ` ${fileName}` : ""}, please wait...
            </p>
          )}
        </div>

        {result && (
          <div
            className={`rounded-lg border px-3 py-2 text-sm ${
              result.skipped > 0
                ? "border-amber-200 bg-amber-50 text-amber-800"
                : "border-green-200 bg-green-50 text-green-700"
            }`}
          >
            <p className="font-medium">
              Imported {result.imported} lead{result.imported === 1 ? "" : "s"}
              {result.skipped > 0
                ? `, skipped ${result.skipped} row${result.skipped === 1 ? "" : "s"}.`
                : "."}
            </p>
            {result.skipped > 0 && (
              <p className="mt-1">
                Skipped rows were missing a name or an email and were not imported. Fix those rows and re-upload if needed.
              </p>
            )}
          </div>
        )}

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            <p className="font-medium">Upload failed</p>
            <p className="mt-1">{error}</p>
          </div>
        )}
      </div>
    </Modal>
  );
}

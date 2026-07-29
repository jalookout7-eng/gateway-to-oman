"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";

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
  // Admin-editable lookups — loaded once, fall back to empty list if endpoint
  // is unreachable (the dropdown still shows the current value + "—").
  const [leadOptions, setLeadOptions] = useState<LeadOptionsByKind>(EMPTY_LEAD_OPTIONS);
  // Multi-select state for the bulk-delete tool (Notes 7). A Set<string> of
  // lead IDs the visitor has ticked the checkbox on.
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);

  // Toggle one lead in/out of the selection.
  const toggleSelected = useCallback((leadId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(leadId)) next.delete(leadId);
      else next.add(leadId);
      return next;
    });
  }, []);

  // Select-all / clear-all toggle in the table header.
  const toggleSelectAll = useCallback(() => {
    setSelectedIds((prev) => {
      if (prev.size === leads.length && leads.length > 0) {
        return new Set();
      }
      return new Set(leads.map((l) => l.id));
    });
  }, [leads]);

  const allSelected = useMemo(
    () => leads.length > 0 && selectedIds.size === leads.length,
    [leads.length, selectedIds.size],
  );

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

  // Bulk delete with confirmation — N selected → confirm → POST /bulk-delete.
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
        window.alert(`Deleted ${deleted} of ${ids.length}. ${failed.length} failed — they remain selected so you can retry.`);
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
        // network error — keep EMPTY_LEAD_OPTIONS; user can still edit notes
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

  function handleExportCSV() {
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
          <p className="text-sm text-gray-500 mt-1">{leads.length} total leads</p>
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
          className="px-3 py-2 rounded-lg border border-gray-200 text-sm bg-white"
        >
          <option value="">All Segments</option>
          {leadOptions.segment.map((o) => (
            <option key={o.slug} value={o.slug}>{o.label}</option>
          ))}
        </select>
        <select
          value={filterQualification}
          onChange={(e) => setFilterQualification(e.target.value)}
          className="px-3 py-2 rounded-lg border border-gray-200 text-sm bg-white"
        >
          <option value="">All Qualifications</option>
          {leadOptions.qualification.map((o) => (
            <option key={o.slug} value={o.slug}>{o.label}</option>
          ))}
        </select>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-3 py-2 rounded-lg border border-gray-200 text-sm bg-white"
        >
          <option value="">All Statuses</option>
          {leadOptions.status.map((o) => (
            <option key={o.slug} value={o.slug}>{o.label}</option>
          ))}
        </select>
        <select
          value={filterSource}
          onChange={(e) => setFilterSource(e.target.value)}
          className="px-3 py-2 rounded-lg border border-gray-200 text-sm bg-white"
        >
          <option value="">All Sources</option>
          <option value="main">Main site</option>
          <option value="businesses">Businesses</option>
          <option value="intake">Intake form</option>
          <option value="import">Imported (old CRM)</option>
        </select>
      </div>

      {/* Bulk-delete action bar — surfaces when at least one row is ticked.
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
                    aria-label="Select all leads"
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
              {leads.map((lead) => (
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
                      {lead.country_code && lead.phone ? `${lead.country_code} ${lead.phone}` : lead.phone ?? "—"}
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell" onClick={(e) => e.stopPropagation()}>
                      <select
                        value={lead.segment ?? ""}
                        onChange={(e) => {
                          const val = e.target.value as Lead["segment"];
                          if (val !== lead.segment) updateLead(lead.id, { segment: val }, setLeads);
                        }}
                        className="text-xs rounded border border-gray-200 bg-white px-1.5 py-1"
                      >
                        <option value="">—</option>
                        {leadOptions.segment.map((o) => (
                          <option key={o.slug} value={o.slug}>{o.label}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3 text-gray-600 hidden md:table-cell">{lead.interests ?? "—"}</td>
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      <select
                        value={lead.qualification ?? ""}
                        onChange={(e) => {
                          const val = e.target.value as Lead["qualification"];
                          if (val !== lead.qualification) updateLead(lead.id, { qualification: val }, setLeads);
                        }}
                        className="text-xs rounded border border-gray-200 bg-white px-1.5 py-1"
                      >
                        <option value="">—</option>
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
                        className="text-xs rounded border border-gray-200 bg-white px-1.5 py-1"
                      >
                        <option value="">—</option>
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

// AdminNotesField removed in Batch 7d — the LeadNotesTimeline component
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

function UploadCSVModal({ isOpen, onClose, onUploaded }: { isOpen: boolean; onClose: () => void; onUploaded: () => void }) {
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setResult(null);

    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch("/api/leads/upload", {
      method: "POST",
      credentials: "include",
      body: formData,
    });

    const data = await res.json();
    setUploading(false);
    if (res.ok) {
      setResult(
        `Successfully imported ${data.imported} leads` +
          (data.skipped ? `, skipped ${data.skipped} rows missing a name or email` : ""),
      );
      onUploaded();
    } else {
      setResult(`Error: ${data.error}`);
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Upload CSV">
      <div className="space-y-4">
        <p className="text-sm text-gray-600">
          Upload a CSV file with <strong>name</strong> and <strong>email</strong> columns (phone optional).
        </p>
        <input
          type="file"
          accept=".csv"
          onChange={handleUpload}
          disabled={uploading}
          className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-gold/10 file:text-gold hover:file:bg-gold/20"
        />
        {uploading && <p className="text-sm text-gray-500">Uploading...</p>}
        {result && <p className="text-sm text-green-600">{result}</p>}
      </div>
    </Modal>
  );
}

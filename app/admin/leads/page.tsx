"use client";

import { useState, useEffect, useCallback } from "react";
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
  admin_notes: string | null;
  conversation_id: string | null;
  created_at: string;
  ai_summary?: string | null;
  pendingEmail?: { id: string; subject: string } | null;
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

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterSegment, setFilterSegment] = useState("");
  const [filterQualification, setFilterQualification] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterSource, setFilterSource] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [conversation, setConversation] = useState<{ messages: { role: string; content: string }[] } | null>(null);
  const [expandedLead, setExpandedLead] = useState<string | null>(null);
  const [regenerating, setRegenerating] = useState<string | null>(null);

  const fetchLeads = useCallback(async () => {
    const params = new URLSearchParams();
    if (filterSegment) params.set("segment", filterSegment);
    if (filterQualification) params.set("qualification", filterQualification);
    if (filterStatus) params.set("status", filterStatus);
    if (filterSource) params.set("source", filterSource);

    const [leadsRes, emailsRes] = await Promise.all([
      fetch(`/api/leads?${params}`, { headers: authHeaders(), credentials: "include" }),
      fetch(`/api/admin/emails?status=draft`, { headers: authHeaders(), credentials: "include" }),
    ]);

    if (leadsRes.ok) {
      const leadsData: Lead[] = await leadsRes.json();
      const emailsData: { id: string; lead_id: string; subject: string }[] = emailsRes.ok
        ? await emailsRes.json()
        : [];

      const emailsByLead = new Map(emailsData.map((e) => [e.lead_id, { id: e.id, subject: e.subject }]));
      setLeads(leadsData.map((l) => ({ ...l, pendingEmail: emailsByLead.get(l.id) ?? null })));
    }
    setLoading(false);
  }, [filterSegment, filterQualification, filterStatus, filterSource]);

  useEffect(() => { fetchLeads(); }, [fetchLeads]);

  async function handleExpand(lead: Lead) {
    if (expandedId === lead.id) {
      setExpandedId(null);
      setConversation(null);
      return;
    }
    setExpandedId(lead.id);
    if (lead.conversation_id) {
      const res = await fetch(`/api/conversations/${lead.conversation_id}`, { headers: authHeaders(), credentials: "include" });
      if (res.ok) setConversation(await res.json());
    } else {
      setConversation(null);
    }
  }

  async function sendDraftEmail(emailId: string, leadId: string) {
    const res = await fetch(`/api/admin/emails/${emailId}/send`, {
      method: "POST",
      headers: authHeaders(),
      credentials: "include",
    });
    if (!res.ok) {
      alert("Failed to send email. Please try again.");
      return;
    }
    setLeads((prev) =>
      prev.map((l) => (l.id === leadId ? { ...l, pendingEmail: null } : l))
    );
  }

  async function regenerateSummary(leadId: string) {
    setRegenerating(leadId);
    try {
      const res = await fetch(`/api/admin/leads/${leadId}/summarize`, {
        method: "POST",
        headers: authHeaders(),
        credentials: "include",
      });
      const data = await res.json();
      setLeads((prev) =>
        prev.map((l: Lead) => (l.id === leadId ? { ...l, ai_summary: data.summary } : l))
      );
    } finally {
      setRegenerating(null);
    }
  }

  function handleExportCSV() {
    const header = "Name,Email,Phone,Segment,Qualification,Status,Date\n";
    const rows = leads.map(l =>
      `"${l.name}","${l.email}","${l.country_code ?? ""}${l.phone ?? ""}","${l.segment ?? ""}","${l.qualification ?? ""}","${l.status ?? ""}","${l.created_at}"`
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
          <option value="entrepreneur">Entrepreneur</option>
          <option value="investor">Investor</option>
          <option value="professional">Professional</option>
          <option value="retiree">Retiree</option>
        </select>
        <select
          value={filterQualification}
          onChange={(e) => setFilterQualification(e.target.value)}
          className="px-3 py-2 rounded-lg border border-gray-200 text-sm bg-white"
        >
          <option value="">All Qualifications</option>
          <option value="hot">Hot</option>
          <option value="warm">Warm</option>
          <option value="cold">Cold</option>
        </select>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-3 py-2 rounded-lg border border-gray-200 text-sm bg-white"
        >
          <option value="">All Statuses</option>
          <option value="new">New</option>
          <option value="contacted">Contacted</option>
          <option value="in_progress">In Progress</option>
          <option value="converted">Converted</option>
          <option value="closed">Closed</option>
        </select>
        <select
          value={filterSource}
          onChange={(e) => setFilterSource(e.target.value)}
          className="px-3 py-2 rounded-lg border border-gray-200 text-sm bg-white"
        >
          <option value="">All Sources</option>
          <option value="main">Main site</option>
          <option value="businesses">Businesses</option>
        </select>
      </div>

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
                <th className="text-left px-4 py-3 font-medium text-gray-600">Name</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Email</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Phone</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600 hidden md:table-cell">Segment</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600 hidden md:table-cell">Interest</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Qual.</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Date</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {leads.map((lead) => (
                <>
                  <tr
                    key={lead.id}
                    onClick={() => handleExpand(lead)}
                    className="border-b border-gray-50 hover:bg-warm-white cursor-pointer transition-colors"
                  >
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
                        <option value="entrepreneur">entrepreneur</option>
                        <option value="investor">investor</option>
                        <option value="professional">professional</option>
                        <option value="retiree">retiree</option>
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
                        <option value="hot">hot</option>
                        <option value="warm">warm</option>
                        <option value="cold">cold</option>
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
                        <option value="new">new</option>
                        <option value="contacted">contacted</option>
                        <option value="in_progress">in_progress</option>
                        <option value="converted">converted</option>
                        <option value="closed">closed</option>
                      </select>
                    </td>
                    <td className="px-4 py-3 text-gray-500">
                      {new Date(lead.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => setExpandedLead(expandedLead === lead.id ? null : lead.id)}
                        className="p-1 text-gray-400 hover:text-navy transition-colors"
                        aria-label="Toggle AI summary"
                      >
                        <svg className={`w-4 h-4 transition-transform ${expandedLead === lead.id ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                    </td>
                  </tr>
                  {expandedLead === lead.id && (
                    <tr key={`${lead.id}-summary`}>
                      <td colSpan={9} className="px-4 pb-4 bg-gray-50/50">
                        <div className="bg-white rounded-xl p-4 border-l-4 border-gold mt-1">
                          <div className="flex items-center justify-between mb-2">
                            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">AI Summary</p>
                            <button
                              onClick={() => regenerateSummary(lead.id)}
                              disabled={regenerating === lead.id}
                              className="text-xs text-gray-400 hover:text-gold flex items-center gap-1 disabled:opacity-50"
                            >
                              <svg className={`w-3 h-3 ${regenerating === lead.id ? "animate-spin" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h5M20 20v-5h-5M4 9a9 9 0 0115 0M20 15a9 9 0 01-15 0" />
                              </svg>
                              Regenerate
                            </button>
                          </div>
                          {lead.ai_summary ? (
                            <p className="text-sm text-gray-700 whitespace-pre-line leading-relaxed">{lead.ai_summary}</p>
                          ) : (
                            <p className="text-sm text-gray-400 italic">No summary yet.</p>
                          )}
                          <AdminNotesField
                            leadId={lead.id}
                            initialValue={lead.admin_notes ?? ""}
                            setLeads={setLeads}
                          />
                          {lead.pendingEmail && (
                            <div className="mt-4 border-t border-gray-100 pt-4">
                              <p className="text-xs font-semibold text-amber-600 uppercase tracking-wide mb-1">Email Pending Approval</p>
                              <p className="text-sm text-gray-700 mb-3">{lead.pendingEmail.subject}</p>
                              <div className="flex gap-2">
                                <button
                                  onClick={(e) => { e.stopPropagation(); sendDraftEmail(lead.pendingEmail!.id, lead.id); }}
                                  className="px-4 py-2 gold-gradient text-white text-xs rounded-lg font-semibold hover:shadow-md transition-shadow"
                                >
                                  Send to {lead.email}
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                  {expandedId === lead.id && (
                    <tr key={`${lead.id}-expand`}>
                      <td colSpan={9} className="px-4 py-4 bg-gray-50">
                        {conversation?.messages ? (
                          <div className="space-y-2 max-h-60 overflow-y-auto">
                            <p className="text-xs font-semibold text-gray-500 mb-2">Conversation Transcript</p>
                            {conversation.messages.map((msg, i) => (
                              <div key={i} className={`text-xs p-2 rounded-lg max-w-[80%] ${msg.role === "user" ? "bg-gold/10 ml-auto" : "bg-white"}`}>
                                <span className="font-semibold text-gray-500">{msg.role === "user" ? "Visitor" : "AI"}:</span>{" "}
                                {msg.content}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-gray-400">No conversation recorded</p>
                        )}
                      </td>
                    </tr>
                  )}
                </>
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

function AdminNotesField({
  leadId,
  initialValue,
  setLeads,
}: {
  leadId: string;
  initialValue: string;
  setLeads: React.Dispatch<React.SetStateAction<Lead[]>>;
}) {
  const [value, setValue] = useState(initialValue);

  function handleBlur() {
    if (value !== initialValue) {
      updateLead(leadId, { admin_notes: value }, setLeads);
    }
  }

  return (
    <div className="mt-4 border-t border-gray-100 pt-4">
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Admin Notes</p>
      <textarea
        rows={2}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={handleBlur}
        placeholder="Add private notes…"
        className="w-full text-xs rounded border border-gray-200 bg-white px-2 py-1.5 resize-none focus:outline-none focus:border-gold"
      />
    </div>
  );
}

function AddLeadModal({ isOpen, onClose, onAdded }: { isOpen: boolean; onClose: () => void; onAdded: () => void }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    await fetch("/api/leads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ name, email, phone }),
    });
    setSubmitting(false);
    setName(""); setEmail(""); setPhone("");
    onClose();
    onAdded();
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add Lead Manually">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input label="Name" value={name} onChange={(e) => setName(e.target.value)} required />
        <Input label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <Input label="Phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
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
      setResult(`Successfully imported ${data.imported} leads`);
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

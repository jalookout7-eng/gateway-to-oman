"use client";

import { useState, useEffect, useCallback } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";

interface Lead {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  country_code: string | null;
  segment: string | null;
  interests: string | null;
  qualification: string | null;
  status: string | null;
  conversation_id: string | null;
  created_at: string;
}

function authHeaders() {
  return { Authorization: `Bearer ${localStorage.getItem("admin_token")}` };
}

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterSegment, setFilterSegment] = useState("");
  const [filterQualification, setFilterQualification] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [conversation, setConversation] = useState<{ messages: { role: string; content: string }[] } | null>(null);

  const fetchLeads = useCallback(async () => {
    const params = new URLSearchParams();
    if (filterSegment) params.set("segment", filterSegment);
    if (filterQualification) params.set("qualification", filterQualification);
    if (filterStatus) params.set("status", filterStatus);

    const res = await fetch(`/api/leads?${params}`, { headers: authHeaders() });
    if (res.ok) setLeads(await res.json());
    setLoading(false);
  }, [filterSegment, filterQualification, filterStatus]);

  useEffect(() => { fetchLeads(); }, [fetchLeads]);

  async function handleExpand(lead: Lead) {
    if (expandedId === lead.id) {
      setExpandedId(null);
      setConversation(null);
      return;
    }
    setExpandedId(lead.id);
    if (lead.conversation_id) {
      const res = await fetch(`/api/conversations/${lead.conversation_id}`, { headers: authHeaders() });
      if (res.ok) setConversation(await res.json());
    } else {
      setConversation(null);
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
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-400">Loading leads...</div>
        ) : leads.length === 0 ? (
          <div className="p-8 text-center text-gray-400">No leads found</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Name</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Email</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Phone</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Segment</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Interest</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Qual.</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Date</th>
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
                    <td className="px-4 py-3">
                      {lead.segment ? (
                        <Badge variant={lead.segment as "entrepreneur" | "investor" | "professional" | "retiree"}>
                          {lead.segment}
                        </Badge>
                      ) : "—"}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{lead.interests ?? "—"}</td>
                    <td className="px-4 py-3">
                      {lead.qualification ? (
                        <Badge variant={lead.qualification as "hot" | "warm" | "cold"}>
                          {lead.qualification}
                        </Badge>
                      ) : "—"}
                    </td>
                    <td className="px-4 py-3">
                      {lead.status ? (
                        <Badge variant={lead.status as "new" | "contacted" | "converted" | "closed" | "in_progress"}>
                          {lead.status}
                        </Badge>
                      ) : "—"}
                    </td>
                    <td className="px-4 py-3 text-gray-500">
                      {new Date(lead.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                  {expandedId === lead.id && (
                    <tr key={`${lead.id}-expand`}>
                      <td colSpan={8} className="px-4 py-4 bg-gray-50">
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
      headers: authHeaders(),
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

"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, Mail, Phone, Globe, Calendar, MapPin, TrendingUp, Users, Trash2,
} from "lucide-react";
import { LeadNotesTimeline } from "@/components/admin/LeadNotesTimeline";

interface LeadDetail {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  country_code: string | null;
  country_of_residence: string | null;
  segment: string | null;
  interests: string | null;
  qualification: string | null;
  status: string | null;
  source: string | null;
  lead_score: number | null;
  ai_summary: string | null;
  conversation_id: string | null;
  created_at: string;
  updated_at: string | null;
  investment_timeline: string | null;
  investment_purpose: string | null;
  preferred_location: string | null;
  residency_interest: string | null;
  services_needed: string | null;
  additional_comments: string | null;
}

interface LeadOption { slug: string; label: string }
type LeadOptionsByKind = { status: LeadOption[]; qualification: LeadOption[]; segment: LeadOption[] };
const EMPTY_OPTIONS: LeadOptionsByKind = { status: [], qualification: [], segment: [] };

/** services_needed is stored as a JSON array string; never trust it to parse. */
function parseServices(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((s) => typeof s === "string") : [];
  } catch {
    return [];
  }
}

function InfoRow({
  icon: Icon, label, value,
}: {
  icon: typeof Mail; label: string; value?: string | null;
}) {
  return (
    <div className="flex items-start gap-2.5">
      <Icon className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
      <div className="min-w-0">
        <p className="text-xs text-gray-500">{label}</p>
        <p className="text-sm text-navy font-medium break-words">{value || "Not provided"}</p>
      </div>
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl shadow-sm p-5">
      <h2 className="text-base font-semibold text-navy mb-4">{title}</h2>
      {children}
    </div>
  );
}

export default function LeadDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const leadId = params.id;

  const [lead, setLead] = useState<LeadDetail | null>(null);
  const [messages, setMessages] = useState<{ role: string; content: string }[]>([]);
  const [options, setOptions] = useState<LeadOptionsByKind>(EMPTY_OPTIONS);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  // Draft follow-up email awaiting Ahmed's approval. This used to live in an
  // expander on the leads list; that expander was removed when this page
  // landed, so the Send button has to exist here or the capability is lost.
  const [pendingEmail, setPendingEmail] = useState<{ id: string; subject: string } | null>(null);
  const [sendingEmail, setSendingEmail] = useState(false);

  useEffect(() => {
    async function load() {
      const [detailRes, optionsRes] = await Promise.all([
        fetch(`/api/admin/leads/${leadId}`, { credentials: "include" }),
        fetch("/api/admin/lead-options", { credentials: "include" }),
      ]);
      if (detailRes.status === 404) { setNotFound(true); setLoading(false); return; }
      if (detailRes.ok) {
        const data = await detailRes.json();
        setLead(data.lead);
        setMessages(data.messages ?? []);
        setPendingEmail(data.pendingEmail ?? null);
      }
      if (optionsRes.ok) {
        const data = (await optionsRes.json()) as {
          options: { kind: "status" | "qualification" | "segment"; slug: string; label: string }[];
        };
        const grouped: LeadOptionsByKind = { status: [], qualification: [], segment: [] };
        for (const o of data.options) {
          if (o.kind in grouped) grouped[o.kind].push({ slug: o.slug, label: o.label });
        }
        setOptions(grouped);
      }
      setLoading(false);
    }
    load();
  }, [leadId]);

  const patch = useCallback(
    async (field: "status" | "qualification" | "segment", value: string) => {
      setLead((prev) => (prev ? { ...prev, [field]: value } : prev));
      await fetch(`/api/admin/leads/${leadId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ [field]: value }),
      });
    },
    [leadId],
  );

  async function handleSendDraft() {
    if (!pendingEmail || sendingEmail) return;
    setSendingEmail(true);
    try {
      const res = await fetch(`/api/admin/emails/${pendingEmail.id}/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });
      if (!res.ok) {
        window.alert("Failed to send email. Please try again.");
        return;
      }
      setPendingEmail(null);
    } finally {
      setSendingEmail(false);
    }
  }

  async function handleDelete() {
    if (!lead) return;
    if (!window.confirm(`Delete lead "${lead.name}" (${lead.email})? This also wipes their chat transcript and any inquiries. Cannot be undone.`)) return;
    const res = await fetch(`/api/admin/leads/${leadId}`, { method: "DELETE", credentials: "include" });
    if (!res.ok) { window.alert("Delete failed."); return; }
    router.push("/admin/leads");
  }

  if (loading) return <div className="p-8 text-center text-gray-400">Loading lead...</div>;
  if (notFound || !lead) {
    return (
      <div className="p-8 text-center space-y-3">
        <p className="text-gray-500">Lead not found.</p>
        <Link href="/admin/leads" className="text-gold text-sm hover:underline">Back to leads</Link>
      </div>
    );
  }

  const services = parseServices(lead.services_needed);
  const hasIntakeAnswers =
    Boolean(lead.investment_timeline || lead.investment_purpose || lead.preferred_location ||
      lead.residency_interest || lead.additional_comments) || services.length > 0;

  const selectClass =
    "w-full rounded-lg border border-gray-200 bg-white px-2 py-2 text-base sm:text-sm text-navy";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <Link href="/admin/leads" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-navy">
          <ArrowLeft className="w-4 h-4" /> Back to leads
        </Link>
        <div className="text-right">
          <h1 className="text-2xl font-bold text-navy">{lead.name}</h1>
          <p className="text-sm text-gray-500">{lead.country_of_residence ?? lead.email}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-5">
          <Card title="Contact Information">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <InfoRow icon={Mail} label="Email" value={lead.email} />
              <InfoRow icon={Phone} label="Phone"
                value={lead.country_code && lead.phone ? `${lead.country_code} ${lead.phone}` : lead.phone} />
              <InfoRow icon={Globe} label="Country of Residence" value={lead.country_of_residence} />
              <InfoRow icon={Calendar} label="Submitted"
                value={new Date(lead.created_at).toLocaleString()} />
            </div>
          </Card>

          {hasIntakeAnswers && (
            <Card title="Investment Profile">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <InfoRow icon={Calendar} label="Timeline" value={lead.investment_timeline} />
                <InfoRow icon={TrendingUp} label="Purpose" value={lead.investment_purpose} />
                <InfoRow icon={MapPin} label="Preferred Location" value={lead.preferred_location} />
                <InfoRow icon={Users} label="Residency Interest" value={lead.residency_interest} />
              </div>
              {services.length > 0 && (
                <div className="mt-4">
                  <p className="text-xs text-gray-500 mb-1.5">Services Needed</p>
                  <div className="flex flex-wrap gap-1.5">
                    {services.map((s) => (
                      <span key={s} className="text-xs bg-gold/10 text-gold rounded-full px-2.5 py-1">{s}</span>
                    ))}
                  </div>
                </div>
              )}
              {lead.additional_comments && (
                <div className="mt-4">
                  <p className="text-xs text-gray-500 mb-1">Additional Comments</p>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">{lead.additional_comments}</p>
                </div>
              )}
            </Card>
          )}

          {pendingEmail && (
            <div className="bg-white rounded-xl shadow-sm p-5 border-l-4 border-amber-400">
              <h2 className="text-xs font-semibold text-amber-600 uppercase tracking-wide mb-1">
                Email Pending Approval
              </h2>
              <p className="text-sm text-gray-700 mb-3">{pendingEmail.subject}</p>
              <button
                type="button"
                onClick={handleSendDraft}
                disabled={sendingEmail}
                className="gold-gradient text-white text-xs font-semibold rounded-lg px-4 py-2 hover:shadow-md transition-shadow disabled:opacity-60"
              >
                {sendingEmail ? "Sending" : `Send to ${lead.email}`}
              </button>
            </div>
          )}

          <Card title="AI Summary">
            {lead.ai_summary
              ? <p className="text-sm text-gray-700 whitespace-pre-line leading-relaxed">{lead.ai_summary}</p>
              : <p className="text-sm text-gray-400 italic">No summary yet.</p>}
          </Card>

          <Card title="Conversation Transcript">
            {messages.length === 0 ? (
              <p className="text-sm text-gray-400 italic">No conversation recorded.</p>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {messages.map((m, i) => (
                  <div key={i}
                    className={`text-xs p-2.5 rounded-lg max-w-[85%] ${m.role === "user" ? "bg-gold/10 ml-auto" : "bg-gray-50"}`}>
                    <span className="font-semibold text-gray-500">
                      {m.role === "user" ? "Visitor" : "Omar"}:
                    </span>{" "}
                    {m.content}
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        <div className="space-y-5">
          <Card title="CRM Details">
            <div className="space-y-3">
              <div>
                <label htmlFor="detail-status" className="text-xs text-gray-500">Status</label>
                <select id="detail-status" value={lead.status ?? ""} className={selectClass}
                  onChange={(e) => patch("status", e.target.value)}>
                  <option value="">Not set</option>
                  {options.status.map((o) => <option key={o.slug} value={o.slug}>{o.label}</option>)}
                </select>
              </div>
              <div>
                <label htmlFor="detail-qual" className="text-xs text-gray-500">Qualification</label>
                <select id="detail-qual" value={lead.qualification ?? ""} className={selectClass}
                  onChange={(e) => patch("qualification", e.target.value)}>
                  <option value="">Not set</option>
                  {options.qualification.map((o) => <option key={o.slug} value={o.slug}>{o.label}</option>)}
                </select>
              </div>
              <div>
                <label htmlFor="detail-segment" className="text-xs text-gray-500">Segment</label>
                <select id="detail-segment" value={lead.segment ?? ""} className={selectClass}
                  onChange={(e) => patch("segment", e.target.value)}>
                  <option value="">Not set</option>
                  {options.segment.map((o) => <option key={o.slug} value={o.slug}>{o.label}</option>)}
                </select>
              </div>
              <div>
                <p className="text-xs text-gray-500">Source</p>
                <p className="text-sm text-navy font-medium capitalize">{lead.source ?? "main"}</p>
              </div>
              {lead.lead_score !== null && (
                <div>
                  <p className="text-xs text-gray-500">Lead Score</p>
                  <p className="text-sm text-navy font-medium">{lead.lead_score}</p>
                </div>
              )}
              <div>
                <p className="text-xs text-gray-500">Last Updated</p>
                <p className="text-sm text-gray-700">
                  {lead.updated_at ? new Date(lead.updated_at).toLocaleString() : "Never"}
                </p>
              </div>
            </div>
          </Card>

          <Card title="Notes">
            <LeadNotesTimeline leadId={lead.id} />
          </Card>

          <div className="bg-white rounded-xl shadow-sm p-5">
            <h2 className="text-sm font-semibold text-red-600 mb-3">Danger Zone</h2>
            <button type="button" onClick={handleDelete}
              className="w-full inline-flex items-center justify-center gap-1.5 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded-lg px-3 py-2 transition-colors">
              <Trash2 className="w-4 h-4" /> Delete Lead
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

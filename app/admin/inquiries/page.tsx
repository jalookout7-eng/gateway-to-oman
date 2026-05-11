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
  return {
    Authorization: `Bearer ${localStorage.getItem("admin_token") ?? ""}`,
    "Content-Type": "application/json",
  };
}

export default function AdminInquiriesPage() {
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [outcomeFilter, setOutcomeFilter] = useState<"all" | Inquiry["outcome"]>("all");

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

  async function updateOutcome(leadId: string, outcome: Inquiry["outcome"]) {
    setInquiries((prev) =>
      prev.map((i) => (i.lead_id === leadId ? { ...i, outcome, outcome_updated_at: new Date().toISOString() } : i)),
    );
    try {
      await fetch(`/api/admin/inquiries/${leadId}/outcome`, {
        method: "PATCH",
        headers: authHeaders(),
        credentials: "include",
        body: JSON.stringify({ outcome }),
      });
    } catch {
      fetchInquiries();
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
              <InquiryRow key={i.lead_id} inquiry={i} onUpdateOutcome={updateOutcome} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function InquiryRow({
  inquiry: i,
  onUpdateOutcome,
}: {
  inquiry: Inquiry;
  onUpdateOutcome: (leadId: string, outcome: Inquiry["outcome"]) => void;
}) {
  return (
    <div className="p-5 hover:bg-gray-50/50 transition-colors">
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_240px] gap-5">
        <div className="space-y-3">
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <h3 className="font-heading text-lg font-semibold text-navy">{i.name}</h3>
            <span
              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${OUTCOME_STYLES[i.outcome]}`}
            >
              {OUTCOME_LABEL[i.outcome]}
            </span>
            <span className="text-xs text-gray-400">
              {new Date(i.submitted_at).toLocaleString()}
            </span>
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
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Move to</p>
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

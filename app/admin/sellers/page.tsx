"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Users,
  UserPlus,
  Mail,
  Phone,
  Briefcase,
  Search,
  Loader2,
  Power,
  PowerOff,
} from "lucide-react";

type Seller = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  country_code: string | null;
  notes: string | null;
  active: boolean;
  lead_id: string | null;
  lead_email: string | null;
  lead_source: string | null;
  listing_count: number;
  created_at: string;
  updated_at: string;
};

function authHeaders() {
  return { "Content-Type": "application/json" };
}

export default function AdminSellersPage() {
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState<"all" | "active" | "inactive">("all");
  const [showAddForm, setShowAddForm] = useState(false);

  const fetchSellers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/sellers", {
        headers: authHeaders(),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setSellers(data.sellers);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSellers();
  }, [fetchSellers]);

  async function toggleActive(seller: Seller) {
    setSellers((prev) =>
      prev.map((s) => (s.id === seller.id ? { ...s, active: !s.active } : s)),
    );
    try {
      await fetch(`/api/admin/sellers/${seller.id}`, {
        method: "PATCH",
        headers: authHeaders(),
        credentials: "include",
        body: JSON.stringify({ active: !seller.active }),
      });
    } catch {
      fetchSellers();
    }
  }

  const filtered = sellers.filter((s) => {
    if (activeFilter === "active" && !s.active) return false;
    if (activeFilter === "inactive" && s.active) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      s.name.toLowerCase().includes(q) ||
      s.email?.toLowerCase().includes(q) ||
      s.phone?.includes(q) ||
      s.notes?.toLowerCase().includes(q)
    );
  });

  const stats = {
    total: sellers.length,
    active: sellers.filter((s) => s.active).length,
    fromLeads: sellers.filter((s) => s.lead_id).length,
    listings: sellers.reduce((sum, s) => sum + s.listing_count, 0),
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-semibold text-navy">Sellers</h1>
          <p className="text-sm text-gray-500 mt-1">
            People offering listings on the marketplace. Some are also leads from
            the businesses subdomain; others are added manually here.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowAddForm((v) => !v)}
          className="inline-flex items-center gap-2 rounded-lg gold-gradient text-white px-4 py-2 text-sm font-semibold hover:shadow-lg transition-shadow"
        >
          <UserPlus className="h-4 w-4" />
          {showAddForm ? "Close" : "Add seller"}
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="Total" value={stats.total} accent="navy" />
        <StatCard label="Active" value={stats.active} accent="emerald" />
        <StatCard label="From leads" value={stats.fromLeads} accent="blue" />
        <StatCard label="Listings" value={stats.listings} accent="amber" />
      </div>

      {showAddForm && (
        <AddSellerForm
          onCreated={() => {
            setShowAddForm(false);
            fetchSellers();
          }}
        />
      )}

      <div className="rounded-xl bg-white ring-1 ring-gray-200 shadow-sm overflow-hidden">
        <div className="border-b border-gray-100 p-4 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, email, phone, notes…"
              className="w-full rounded-md border border-gray-200 bg-gray-50 pl-9 pr-3 py-2 text-sm focus:bg-white focus:border-gold focus:ring-2 focus:ring-gold/20 outline-none"
            />
          </div>
          <div className="flex items-center gap-1 flex-wrap">
            {(["all", "active", "inactive"] as const).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setActiveFilter(f)}
                className={`rounded-md px-2.5 py-1.5 text-xs font-semibold transition-colors ${
                  activeFilter === f
                    ? "bg-navy text-white"
                    : "bg-gray-50 text-gray-600 hover:bg-gray-100"
                }`}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="p-12 text-center text-gray-400 inline-flex items-center justify-center gap-2 w-full">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading sellers…
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center">
            <Users className="mx-auto h-10 w-10 text-gray-300" strokeWidth={1.5} />
            <p className="mt-3 font-heading text-lg font-semibold text-navy">
              {sellers.length === 0 ? "No sellers yet." : "No matches."}
            </p>
            <p className="mt-1 text-sm text-gray-500">
              {sellers.length === 0
                ? "Add the first seller using the button above."
                : "Try clearing filters or broadening your search."}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {filtered.map((s) => (
              <SellerRow key={s.id} seller={s} onToggleActive={toggleActive} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function AddSellerForm({ onCreated }: { onCreated: () => void }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/sellers", {
        method: "POST",
        headers: authHeaders(),
        credentials: "include",
        body: JSON.stringify({ name, email, phone, notes }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Failed to create seller");
        return;
      }
      onCreated();
    } catch {
      setError("Connection error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-xl bg-white ring-1 ring-gray-200 shadow-sm p-5 space-y-4"
    >
      <h2 className="font-heading text-lg font-semibold text-navy">New seller</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">Name *</label>
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm outline-none focus:border-gold focus:ring-2 focus:ring-gold/20"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm outline-none focus:border-gold focus:ring-2 focus:ring-gold/20"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">Phone</label>
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+968 …"
            className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm outline-none focus:border-gold focus:ring-2 focus:ring-gold/20"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">Notes</label>
          <input
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Internal note…"
            className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm outline-none focus:border-gold focus:ring-2 focus:ring-gold/20"
          />
        </div>
      </div>
      {error && <p className="text-sm text-red-500">{error}</p>}
      <button
        type="submit"
        disabled={submitting}
        className="inline-flex items-center gap-2 rounded-lg bg-navy text-white px-4 py-2 text-sm font-semibold disabled:opacity-60"
      >
        {submitting ? "Saving…" : "Create seller"}
      </button>
    </form>
  );
}

function SellerRow({
  seller: s,
  onToggleActive,
}: {
  seller: Seller;
  onToggleActive: (seller: Seller) => void;
}) {
  return (
    <div className="p-5 hover:bg-gray-50/50 transition-colors">
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_180px] gap-4">
        <div className="space-y-2">
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <h3 className="font-heading text-lg font-semibold text-navy">{s.name}</h3>
            <span
              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${
                s.active
                  ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
                  : "bg-gray-100 text-gray-600 ring-gray-200"
              }`}
            >
              {s.active ? "Active" : "Inactive"}
            </span>
            {s.lead_id && (
              <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-200">
                From lead
              </span>
            )}
            <span className="text-xs text-gray-400">
              {new Date(s.created_at).toLocaleDateString()}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-700">
            {s.email && (
              <a href={`mailto:${s.email}`} className="inline-flex items-center gap-1.5 hover:text-gold">
                <Mail className="h-3.5 w-3.5" />
                {s.email}
              </a>
            )}
            {s.phone && (
              <a
                href={`https://wa.me/${s.phone.replace(/[^0-9+]/g, "")}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 hover:text-gold"
              >
                <Phone className="h-3.5 w-3.5" />
                {s.phone}
              </a>
            )}
            <span className="inline-flex items-center gap-1.5 text-gray-600">
              <Briefcase className="h-3.5 w-3.5" />
              {s.listing_count} listing{s.listing_count === 1 ? "" : "s"}
            </span>
          </div>

          {s.notes && (
            <p className="text-sm text-gray-600 bg-gray-50 ring-1 ring-gray-100 rounded-lg p-2.5">
              {s.notes}
            </p>
          )}
        </div>

        <div className="lg:border-l lg:border-gray-100 lg:pl-5 flex lg:flex-col gap-2">
          <button
            type="button"
            onClick={() => onToggleActive(s)}
            className={`inline-flex items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-semibold transition-colors ${
              s.active
                ? "bg-gray-50 text-gray-700 hover:bg-gray-100"
                : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
            }`}
          >
            {s.active ? <PowerOff className="h-4 w-4" /> : <Power className="h-4 w-4" />}
            {s.active ? "Deactivate" : "Activate"}
          </button>
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

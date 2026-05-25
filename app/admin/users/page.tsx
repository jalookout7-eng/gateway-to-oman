"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Users,
  Mail,
  Phone,
  Search,
  Loader2,
  CheckCircle2,
  ShieldCheck,
  Ban,
  Globe,
} from "lucide-react";
import { ReviewerLinkCard } from "@/components/admin/ReviewerLinkCard";

type MarketplaceUser = {
  id: string;
  email: string;
  full_name: string;
  phone: string | null;
  country_code: string | null;
  email_verified: boolean;
  access_activated: boolean;
  google_signin: boolean;
  lead_id: string | null;
  last_login_at: string | null;
  created_at: string;
};

function authHeaders() {
  return { "Content-Type": "application/json" };
}

export default function AdminMarketplaceUsersPage() {
  const [users, setUsers] = useState<MarketplaceUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "pending" | "active">("all");

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/marketplace-users", {
        headers: authHeaders(),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setUsers(data.users);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  async function setActivation(user: MarketplaceUser, activated: boolean) {
    setUsers((prev) =>
      prev.map((u) => (u.id === user.id ? { ...u, access_activated: activated } : u)),
    );
    try {
      await fetch(`/api/admin/marketplace-users/${user.id}`, {
        method: "PATCH",
        headers: authHeaders(),
        credentials: "include",
        body: JSON.stringify({ access_activated: activated }),
      });
    } catch {
      fetchUsers();
    }
  }

  const filtered = users.filter((u) => {
    if (filter === "pending" && u.access_activated) return false;
    if (filter === "active" && !u.access_activated) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      u.email.toLowerCase().includes(q) ||
      u.full_name.toLowerCase().includes(q) ||
      u.phone?.includes(q)
    );
  });

  const stats = {
    total: users.length,
    activated: users.filter((u) => u.access_activated).length,
    pending: users.filter((u) => !u.access_activated).length,
    verified: users.filter((u) => u.email_verified).length,
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold text-navy">Marketplace users</h1>
        <p className="text-sm text-gray-500 mt-1">
          Visitors who signed up via <span className="font-medium">/businesses/sign-in</span>.
          Approve them to unlock the full marketplace.
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="Total signups" value={stats.total} accent="navy" />
        <StatCard label="Pending approval" value={stats.pending} accent="amber" />
        <StatCard label="Email verified" value={stats.verified} accent="blue" />
        <StatCard label="Activated" value={stats.activated} accent="emerald" />
      </div>

      <ReviewerLinkCard />

      <div className="rounded-xl bg-white ring-1 ring-gray-200 shadow-sm overflow-hidden">
        <div className="border-b border-gray-100 p-4 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, email, phone…"
              className="w-full rounded-md border border-gray-200 bg-gray-50 pl-9 pr-3 py-2 text-sm focus:bg-white focus:border-gold focus:ring-2 focus:ring-gold/20 outline-none"
            />
          </div>
          <div className="flex items-center gap-1 flex-wrap">
            {(["all", "pending", "active"] as const).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFilter(f)}
                className={`rounded-md px-2.5 py-1.5 text-xs font-semibold transition-colors ${
                  filter === f
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
            Loading users…
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center">
            <Users className="mx-auto h-10 w-10 text-gray-300" strokeWidth={1.5} />
            <p className="mt-3 font-heading text-lg font-semibold text-navy">
              {users.length === 0 ? "No marketplace users yet." : "No matches."}
            </p>
            <p className="mt-1 text-sm text-gray-500">
              {users.length === 0
                ? "When visitors sign up on /businesses/sign-in, they&apos;ll appear here."
                : "Try clearing filters."}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {filtered.map((u) => (
              <UserRow key={u.id} user={u} onSetActivation={setActivation} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function UserRow({
  user: u,
  onSetActivation,
}: {
  user: MarketplaceUser;
  onSetActivation: (user: MarketplaceUser, activated: boolean) => void;
}) {
  return (
    <div className="p-5 hover:bg-gray-50/50 transition-colors">
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_220px] gap-5">
        <div className="space-y-2">
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <h3 className="font-heading text-lg font-semibold text-navy">{u.full_name}</h3>
            {u.access_activated ? (
              <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200">
                <CheckCircle2 className="h-3 w-3" />
                Activated
              </span>
            ) : (
              <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold bg-amber-50 text-amber-700 ring-1 ring-amber-200">
                Pending approval
              </span>
            )}
            {u.email_verified ? (
              <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium bg-blue-50 text-blue-700 ring-1 ring-blue-200">
                <ShieldCheck className="h-3 w-3" />
                Email verified
              </span>
            ) : (
              <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-gray-100 text-gray-500 ring-1 ring-gray-200">
                Email unverified
              </span>
            )}
            {u.google_signin && (
              <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium bg-gray-100 text-gray-600 ring-1 ring-gray-200">
                <Globe className="h-3 w-3" />
                Google
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-700">
            <a href={`mailto:${u.email}`} className="inline-flex items-center gap-1.5 hover:text-gold">
              <Mail className="h-3.5 w-3.5" />
              {u.email}
            </a>
            {u.phone && (
              <a
                href={`https://wa.me/${u.phone.replace(/[^0-9+]/g, "")}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 hover:text-gold"
              >
                <Phone className="h-3.5 w-3.5" />
                {u.phone}
              </a>
            )}
          </div>

          <p className="text-xs text-gray-400">
            Signed up {new Date(u.created_at).toLocaleDateString()}
            {u.last_login_at && ` · Last sign-in ${new Date(u.last_login_at).toLocaleDateString()}`}
          </p>
        </div>

        <div className="lg:border-l lg:border-gray-100 lg:pl-5 flex lg:flex-col gap-2">
          {u.access_activated ? (
            <button
              type="button"
              onClick={() => onSetActivation(u, false)}
              className="inline-flex items-center justify-center gap-2 rounded-md bg-gray-50 px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-100 transition-colors"
            >
              <Ban className="h-4 w-4" />
              Revoke access
            </button>
          ) : (
            <button
              type="button"
              onClick={() => onSetActivation(u, true)}
              className="inline-flex items-center justify-center gap-2 rounded-md gold-gradient px-3 py-2 text-sm font-semibold text-white shadow-sm hover:shadow-md transition-shadow"
            >
              <CheckCircle2 className="h-4 w-4" />
              Approve access
            </button>
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

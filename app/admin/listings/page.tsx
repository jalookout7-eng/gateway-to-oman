"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Search,
  Plus,
  Briefcase,
  ArrowUpRight,
  Filter,
  MoreHorizontal,
  ExternalLink,
  Star,
} from "lucide-react";
import { formatOMR, formatPriceRange } from "@/lib/businesses/format";
import { AccessFeeCard } from "@/components/admin/AccessFeeCard";

type AdminListing = {
  id: string;
  title: string;
  slug: string;
  location_city: string | null;
  area: string | null;
  for_sale: boolean;
  for_rent: boolean;
  selling_price_omr: number | null;
  rental_price_omr: number | null;
  status: "available" | "reserved" | "sold";
  published: boolean;
  featured: boolean;
  featured_rank: number | null;
  age_years: number | null;
  employee_count: number | null;
  created_at: string;
  category_slug: string;
  category_name: string;
  inquiry_count: number;
};

const STATUS_PILL: Record<AdminListing["status"], string> = {
  available: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  reserved: "bg-amber-50 text-amber-700 ring-amber-200",
  sold: "bg-gray-100 text-gray-600 ring-gray-200",
};

function authHeaders() {
  return { Authorization: `Bearer ${localStorage.getItem("admin_token")}` };
}

export default function AdminListingsPage() {
  const [listings, setListings] = useState<AdminListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "available" | "reserved" | "sold">("all");

  const fetchListings = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/listings", { headers: authHeaders() });
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setListings(data.listings);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchListings();
  }, [fetchListings]);

  const filtered = listings.filter((l) => {
    if (statusFilter !== "all" && l.status !== statusFilter) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      l.title.toLowerCase().includes(q) ||
      l.location_city?.toLowerCase().includes(q) ||
      l.category_name.toLowerCase().includes(q)
    );
  });

  const stats = {
    total: listings.length,
    available: listings.filter((l) => l.status === "available").length,
    reserved: listings.filter((l) => l.status === "reserved").length,
    sold: listings.filter((l) => l.status === "sold").length,
    inquiries: listings.reduce((sum, l) => sum + l.inquiry_count, 0),
  };

  async function toggleFeatured(id: string, nextFeatured: boolean) {
    setListings((prev) =>
      prev.map((l) => (l.id === id ? { ...l, featured: nextFeatured } : l)),
    );
    try {
      const res = await fetch(`/api/admin/listings/${id}/featured`, {
        method: "PATCH",
        headers: authHeaders(),
        body: JSON.stringify({ featured: nextFeatured }),
      });
      if (!res.ok) throw new Error("Failed to update featured state");
      const data = await res.json();
      setListings((prev) =>
        prev.map((l) =>
          l.id === id
            ? { ...l, featured: data.featured, featured_rank: data.featured_rank }
            : l,
        ),
      );
    } catch {
      setListings((prev) =>
        prev.map((l) => (l.id === id ? { ...l, featured: !nextFeatured } : l)),
      );
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-semibold text-navy">Listings</h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage businesses for sale on{" "}
            <span className="font-medium">businesses.gatewaytooman.com</span>
          </p>
        </div>
        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-lg bg-navy px-4 py-2.5 text-sm font-semibold text-white hover:bg-navy-light transition-colors shadow-sm"
        >
          <Plus className="h-4 w-4" />
          New listing
        </button>
      </div>

      <AccessFeeCard />

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <StatCard label="Total listings" value={stats.total} accent="navy" />
        <StatCard label="Available" value={stats.available} accent="emerald" />
        <StatCard label="Reserved" value={stats.reserved} accent="amber" />
        <StatCard label="Sold" value={stats.sold} accent="gray" />
        <StatCard label="Inquiries" value={stats.inquiries} accent="gold" />
      </div>

      <div className="rounded-xl bg-white ring-1 ring-gray-200 shadow-sm overflow-hidden">
        <div className="border-b border-gray-100 p-4 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by title, city, category…"
              className="w-full rounded-md border border-gray-200 bg-gray-50 pl-9 pr-3 py-2 text-sm focus:bg-white focus:border-gold focus:ring-2 focus:ring-gold/20 outline-none"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-gray-400" />
            {(["all", "available", "reserved", "sold"] as const).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setStatusFilter(s)}
                className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
                  statusFilter === s
                    ? "bg-navy text-white"
                    : "bg-gray-50 text-gray-600 hover:bg-gray-100"
                }`}
              >
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="p-12 text-center text-gray-400 animate-pulse">Loading listings…</div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center">
            <Briefcase className="mx-auto h-10 w-10 text-gray-300" strokeWidth={1.5} />
            <p className="mt-3 font-heading text-lg font-semibold text-navy">No listings found.</p>
            <p className="mt-1 text-sm text-gray-500">Try clearing filters or seed listings via the script.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-100 text-sm">
              <thead className="bg-gray-50/50">
                <tr>
                  <Th className="w-12 text-center">
                    <span className="inline-flex items-center gap-1 justify-center" title="Featured on /businesses">
                      <Star className="h-3.5 w-3.5" />
                    </span>
                  </Th>
                  <Th>Listing</Th>
                  <Th>Category</Th>
                  <Th>Location</Th>
                  <Th>Price</Th>
                  <Th>Status</Th>
                  <Th className="text-right">Inquiries</Th>
                  <Th className="w-12" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((listing) => (
                  <tr key={listing.id} className="hover:bg-gray-50/60 transition-colors">
                    <td className="px-4 py-3 text-center">
                      <button
                        type="button"
                        onClick={() => toggleFeatured(listing.id, !listing.featured)}
                        title={listing.featured ? "Unfeature" : "Feature on /businesses"}
                        className="rounded-md p-1.5 transition-colors hover:bg-gray-100"
                      >
                        <Star
                          className={`h-4 w-4 transition-all ${
                            listing.featured
                              ? "fill-gold text-gold"
                              : "text-gray-300 hover:text-gold"
                          }`}
                        />
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-navy flex items-center gap-2">
                        {listing.title}
                        {listing.featured && listing.featured_rank !== null && (
                          <span className="inline-flex items-center text-[10px] font-semibold uppercase tracking-wider text-gold bg-gold/10 px-1.5 py-0.5 rounded">
                            #{listing.featured_rank}
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-gray-500 mt-0.5">
                        {listing.age_years !== null ? `${listing.age_years} yrs` : "—"}
                        {" · "}
                        {listing.employee_count !== null ? `${listing.employee_count} staff` : "—"}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-700">{listing.category_name}</td>
                    <td className="px-4 py-3 text-gray-700">
                      {[listing.area, listing.location_city].filter(Boolean).join(", ") || "—"}
                    </td>
                    <td className="px-4 py-3 font-medium text-navy">
                      {formatPriceRange(
                        listing.for_sale,
                        listing.for_rent,
                        listing.selling_price_omr,
                        listing.rental_price_omr,
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${STATUS_PILL[listing.status]}`}
                      >
                        {listing.status.charAt(0).toUpperCase() + listing.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="inline-flex items-center gap-1 font-medium text-navy">
                        {listing.inquiry_count}
                        {listing.inquiry_count > 0 && <ArrowUpRight className="h-3.5 w-3.5 text-gold" />}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <Link
                          href={`/businesses/listing/${listing.slug}`}
                          target="_blank"
                          className="rounded-md p-1.5 text-gray-500 hover:bg-gray-100 hover:text-navy transition-colors"
                          title="View on marketplace"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Link>
                        <button
                          type="button"
                          className="rounded-md p-1.5 text-gray-500 hover:bg-gray-100 hover:text-navy transition-colors"
                          title="More actions"
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <p className="text-xs text-gray-400 text-center">
        {filtered.length} of {listings.length} listings shown · Total{" "}
        {formatOMR(
          listings.reduce(
            (sum, l) => sum + (l.selling_price_omr ?? 0),
            0,
          ),
        )}{" "}
        listed value
      </p>
    </div>
  );
}

function Th({ children, className = "" }: { children?: React.ReactNode; className?: string }) {
  return (
    <th className={`px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 ${className}`}>
      {children}
    </th>
  );
}

function StatCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent: "navy" | "emerald" | "amber" | "gray" | "gold";
}) {
  const ACCENT: Record<string, string> = {
    navy: "ring-navy/10 [&>p]:text-navy",
    emerald: "ring-emerald-200 [&>p]:text-emerald-600",
    amber: "ring-amber-200 [&>p]:text-amber-600",
    gray: "ring-gray-200 [&>p]:text-gray-600",
    gold: "ring-gold/30 [&>p]:text-gold-dark",
  };
  return (
    <div className={`rounded-xl bg-white ring-1 shadow-sm p-4 ${ACCENT[accent]}`}>
      <p className="text-2xl font-heading font-semibold">{value}</p>
      <p className="text-xs text-gray-500 mt-0.5 uppercase tracking-wide font-medium">{label}</p>
    </div>
  );
}

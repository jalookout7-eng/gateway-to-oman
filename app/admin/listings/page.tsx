"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Search,
  Plus,
  Briefcase,
  ArrowUpRight,
  Filter,
  MoreHorizontal,
  ExternalLink,
  Star,
  X,
  Trash2,
  Eye,
  EyeOff,
  CheckCircle2,
  Pause,
  Pencil,
  Upload,
  Video,
  Images,
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
  full_detail_text: string | null;
  created_at: string;
  category_slug: string;
  category_name: string;
  inquiry_count: number;
  cover_image_url?: string | null;
  gallery_urls?: string[] | null;
  video_url?: string | null;
};

const STATUS_PILL: Record<AdminListing["status"], string> = {
  available: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  reserved: "bg-amber-50 text-amber-700 ring-amber-200",
  sold: "bg-gray-100 text-gray-600 ring-gray-200",
};

function authHeaders() {
  return { "Content-Type": "application/json" };
}

type CategoryOption = { slug: string; name: string };

export default function AdminListingsPage() {
  const [listings, setListings] = useState<AdminListing[]>([]);
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "available" | "reserved" | "sold">("all");
  const [showNewForm, setShowNewForm] = useState(false);
  const [editingListing, setEditingListing] = useState<AdminListing | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  const fetchListings = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/listings", { headers: authHeaders(), credentials: "include" });
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

  // Categories — fetched once for the "+ New listing" form.
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/businesses/categories");
        if (!res.ok) return;
        const data = await res.json();
        setCategories(data.categories ?? []);
      } catch (err) {
        console.error(err);
      }
    })();
  }, []);

  // Close any open row-action menu on outside click.
  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (!(e.target instanceof Element)) return;
      if (!e.target.closest("[data-listing-menu]")) setOpenMenuId(null);
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  async function updateListing(id: string, body: Record<string, unknown>) {
    const res = await fetch(`/api/admin/listings/${id}`, {
      method: "PATCH",
      headers: authHeaders(),
      credentials: "include",
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      alert(data.error ?? "Update failed");
      return;
    }
    fetchListings();
  }

  async function deleteListing(id: string, title: string) {
    if (!confirm(`Delete "${title}"? This cannot be undone.`)) return;
    const res = await fetch(`/api/admin/listings/${id}`, {
      method: "DELETE",
      headers: authHeaders(),
      credentials: "include",
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      alert(data.error ?? "Delete failed");
      return;
    }
    fetchListings();
  }

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
        credentials: "include",
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
            <span className="font-medium">gatewaytooman.com/businesses</span>
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowNewForm(true)}
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
                      <div className="flex items-center justify-end gap-1 relative" data-listing-menu>
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
                          onClick={() => setOpenMenuId(openMenuId === listing.id ? null : listing.id)}
                          className="rounded-md p-1.5 text-gray-500 hover:bg-gray-100 hover:text-navy transition-colors"
                          title="More actions"
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </button>
                        {openMenuId === listing.id && (
                          <RowMenu
                            listing={listing}
                            onEdit={() => {
                              setOpenMenuId(null);
                              setEditingListing(listing);
                            }}
                            onChangeStatus={(status) => {
                              setOpenMenuId(null);
                              updateListing(listing.id, { status });
                            }}
                            onTogglePublish={() => {
                              setOpenMenuId(null);
                              updateListing(listing.id, { published: !listing.published });
                            }}
                            onDelete={() => {
                              setOpenMenuId(null);
                              deleteListing(listing.id, listing.title);
                            }}
                          />
                        )}
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

      {showNewForm && (
        <ListingFormModal
          categories={categories}
          mode="create"
          onClose={() => setShowNewForm(false)}
          onSaved={() => {
            setShowNewForm(false);
            fetchListings();
          }}
        />
      )}

      {editingListing && (
        <ListingFormModal
          categories={categories}
          mode="edit"
          initial={editingListing}
          onClose={() => setEditingListing(null)}
          onSaved={() => {
            setEditingListing(null);
            fetchListings();
          }}
        />
      )}
    </div>
  );
}

function ListingFormModal({
  categories,
  mode,
  initial,
  onClose,
  onSaved,
}: {
  categories: CategoryOption[];
  mode: "create" | "edit";
  initial?: AdminListing;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [categorySlug, setCategorySlug] = useState(initial?.category_slug ?? categories[0]?.slug ?? "");
  const [city, setCity] = useState(initial?.location_city ?? "");
  const [area, setArea] = useState(initial?.area ?? "");
  const [forSale, setForSale] = useState(initial?.for_sale ?? true);
  const [forRent, setForRent] = useState(initial?.for_rent ?? false);
  const [sellingPrice, setSellingPrice] = useState(initial?.selling_price_omr?.toString() ?? "");
  const [rentalPrice, setRentalPrice] = useState(initial?.rental_price_omr?.toString() ?? "");
  const [ageYears, setAgeYears] = useState(initial?.age_years?.toString() ?? "");
  const [employeeCount, setEmployeeCount] = useState(initial?.employee_count?.toString() ?? "");
  const [description, setDescription] = useState(initial?.full_detail_text ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const firstFieldRef = useRef<HTMLInputElement>(null);

  // Media state (edit mode only)
  const [coverUrl, setCoverUrl] = useState<string | null>(initial?.cover_image_url ?? null);
  const [galleryUrls, setGalleryUrls] = useState<string[]>(initial?.gallery_urls ?? []);
  const [videoUrl, setVideoUrl] = useState<string | null>(initial?.video_url ?? null);
  // Progress: -1 = idle, 0-100 = uploading percentage
  const [coverProgress, setCoverProgress] = useState(-1);
  const [videoProgress, setVideoProgress] = useState(-1);
  const [galleryProgress, setGalleryProgress] = useState<Record<number, number>>({});
  const [coverError, setCoverError] = useState("");
  const [galleryError, setGalleryError] = useState("");
  const [videoError, setVideoError] = useState("");

  function putToR2(
    file: File,
    uploadUrl: string,
    contentType: string,
    onProgress: (pct: number) => void,
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open("PUT", uploadUrl);
      xhr.setRequestHeader("Content-Type", contentType);
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
      };
      xhr.onload = () => {
        if (xhr.status === 200 || xhr.status === 204) resolve();
        else reject(new Error(`R2 upload failed (${xhr.status})`));
      };
      xhr.onerror = () => reject(new Error("Network error during upload"));
      xhr.send(file);
    });
  }

  async function uploadMedia(files: FileList | null, kind: "cover" | "gallery" | "video") {
    if (!files || files.length === 0 || !initial?.id) return;
    const setErr = kind === "cover" ? setCoverError : kind === "gallery" ? setGalleryError : setVideoError;
    setErr("");
    const fileArray = Array.from(files);

    if (kind === "cover" || kind === "video") {
      const file = fileArray[0];
      const setProgress = kind === "cover" ? setCoverProgress : setVideoProgress;
      setProgress(0);
      try {
        const presignRes = await fetch(`/api/admin/listings/${initial.id}/media/presign`, {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ slot: kind, contentType: file.type, size: file.size }),
        });
        if (!presignRes.ok) {
          const d = await presignRes.json().catch(() => ({}));
          setErr(d.error ?? `Upload failed (${presignRes.status})`);
          return;
        }
        const { uploadUrl, key } = await presignRes.json();
        await putToR2(file, uploadUrl, file.type, setProgress);
        const confirmRes = await fetch(`/api/admin/listings/${initial.id}/media/confirm`, {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ slot: kind, key }),
        });
        if (!confirmRes.ok) {
          const d = await confirmRes.json().catch(() => ({}));
          setErr(d.error ?? `Confirm failed (${confirmRes.status})`);
          return;
        }
        const data = await confirmRes.json();
        setCoverUrl(data.cover_image_url ?? null);
        setGalleryUrls(data.gallery_urls ?? []);
        setVideoUrl(data.video_url ?? null);
      } catch (err) {
        setErr(err instanceof Error ? err.message : "Upload failed");
      } finally {
        setProgress(-1);
      }
    } else {
      // gallery — upload each file independently, append-as-you-go
      const initialProgress: Record<number, number> = {};
      fileArray.forEach((_, i) => { initialProgress[i] = 0; });
      setGalleryProgress(initialProgress);

      await Promise.allSettled(
        fileArray.map(async (file, i) => {
          try {
            const presignRes = await fetch(`/api/admin/listings/${initial.id}/media/presign`, {
              method: "POST",
              credentials: "include",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ slot: "gallery", contentType: file.type, size: file.size }),
            });
            if (!presignRes.ok) {
              const d = await presignRes.json().catch(() => ({}));
              setGalleryError(d.error ?? `Upload failed for ${file.name}`);
              return;
            }
            const { uploadUrl, key } = await presignRes.json();
            await putToR2(file, uploadUrl, file.type, (pct) =>
              setGalleryProgress((prev) => ({ ...prev, [i]: pct })),
            );
            const confirmRes = await fetch(`/api/admin/listings/${initial.id}/media/confirm`, {
              method: "POST",
              credentials: "include",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ slot: "gallery", publicUrl, key }),
            });
            if (!confirmRes.ok) {
              const d = await confirmRes.json().catch(() => ({}));
              setGalleryError(d.error ?? `Confirm failed for ${file.name}`);
              return;
            }
            const data = await confirmRes.json();
            setGalleryUrls(data.gallery_urls ?? []);
          } catch (err) {
            setGalleryError(err instanceof Error ? err.message : `Upload failed for ${file.name}`);
          } finally {
            setGalleryProgress((prev) => {
              const next = { ...prev };
              delete next[i];
              return next;
            });
          }
        }),
      );
      setGalleryProgress({});
    }
  }

  async function removeMedia(urlOrKey: string, kind: "cover" | "gallery" | "video") {
    if (!initial?.id) return;
    const setErr = kind === "cover" ? setCoverError : kind === "gallery" ? setGalleryError : setVideoError;
    setErr("");
    try {
      const res = await fetch(
        `/api/admin/listings/${initial.id}/media?key=${encodeURIComponent(urlOrKey)}&kind=${kind}`,
        { method: "DELETE", credentials: "include" },
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setErr(data.error ?? "Remove failed"); return; }
      setCoverUrl(data.cover_image_url ?? null);
      setGalleryUrls(data.gallery_urls ?? []);
      setVideoUrl(data.video_url ?? null);
    } catch {
      setErr("Connection error");
    }
  }

  useEffect(() => {
    firstFieldRef.current?.focus();
    if (!categorySlug && categories.length > 0) setCategorySlug(categories[0].slug);
  }, [categories, categorySlug]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!title.trim()) {
      setError("Title is required");
      return;
    }
    if (!categorySlug) {
      setError("Pick a category");
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        title: title.trim(),
        category_slug: categorySlug,
        location_city: city.trim() || null,
        area: area.trim() || null,
        for_sale: forSale,
        for_rent: forRent,
        selling_price_omr: sellingPrice ? Number(sellingPrice) : null,
        rental_price_omr: rentalPrice ? Number(rentalPrice) : null,
        age_years: ageYears ? Number(ageYears) : null,
        employee_count: employeeCount ? Number(employeeCount) : null,
        full_detail_text: description.trim() || null,
      };
      const url = mode === "create" ? "/api/admin/listings" : `/api/admin/listings/${initial?.id}`;
      const method = mode === "create" ? "POST" : "PATCH";
      const res = await fetch(url, {
        method,
        headers: authHeaders(),
        credentials: "include",
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? `${mode === "create" ? "Create" : "Update"} failed`);
        return;
      }
      onSaved();
    } catch {
      setError("Connection error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4 overflow-y-auto">
      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <h2 className="font-heading text-lg font-semibold text-navy">
            {mode === "create" ? "New listing" : "Edit listing"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1.5 text-gray-400 hover:text-navy hover:bg-gray-100 transition-colors"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          <Field label="Title *">
            <input
              ref={firstFieldRef}
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Established Café in Al Khuwair"
              className="input"
            />
          </Field>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Category *">
              <select
                value={categorySlug}
                onChange={(e) => setCategorySlug(e.target.value)}
                className="input"
                required
              >
                <option value="">Select category…</option>
                {categories.map((c) => (
                  <option key={c.slug} value={c.slug}>
                    {c.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="City">
              <input
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="Muscat"
                className="input"
              />
            </Field>
            <Field label="Area / district">
              <input
                value={area}
                onChange={(e) => setArea(e.target.value)}
                placeholder="Al Khuwair"
                className="input"
              />
            </Field>
            <Field label="Age (years)">
              <input
                type="number"
                step="0.5"
                value={ageYears}
                onChange={(e) => setAgeYears(e.target.value)}
                placeholder="3"
                className="input"
              />
            </Field>
            <Field label="Employees">
              <input
                type="number"
                value={employeeCount}
                onChange={(e) => setEmployeeCount(e.target.value)}
                placeholder="5"
                className="input"
              />
            </Field>
            <Field label="Selling price (OMR)">
              <input
                type="number"
                value={sellingPrice}
                onChange={(e) => setSellingPrice(e.target.value)}
                placeholder="35000"
                disabled={!forSale}
                className="input disabled:bg-gray-50 disabled:text-gray-400"
              />
            </Field>
            <Field label="Rental price (OMR / month)">
              <input
                type="number"
                value={rentalPrice}
                onChange={(e) => setRentalPrice(e.target.value)}
                placeholder="800"
                disabled={!forRent}
                className="input disabled:bg-gray-50 disabled:text-gray-400"
              />
            </Field>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <label className="inline-flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={forSale}
                onChange={(e) => setForSale(e.target.checked)}
                className="rounded border-gray-300 text-gold focus:ring-gold"
              />
              For sale
            </label>
            <label className="inline-flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={forRent}
                onChange={(e) => setForRent(e.target.checked)}
                className="rounded border-gray-300 text-gold focus:ring-gold"
              />
              For rent
            </label>
          </div>

          <Field label="Description">
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              placeholder="Headline pitch — what makes this business worth buying?"
              className="input resize-none"
            />
          </Field>

          {/* ----------------------------------------------------------------
              Media upload — edit mode only (listing must exist to have an id)
          ---------------------------------------------------------------- */}
          {mode === "edit" ? (
            <div className="space-y-4 border-t border-gray-100 pt-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 flex items-center gap-1.5">
                <Upload className="h-3.5 w-3.5" />
                Media
              </p>

              {/* Cover image */}
              <div className="space-y-2">
                <span className="text-xs font-semibold text-gray-600 block">Cover image</span>
                {coverUrl && (
                  <div className="flex items-start gap-3">
                    <div className="relative h-20 w-32 rounded-lg overflow-hidden ring-1 ring-gray-200 bg-gray-50 flex-shrink-0">
                      <Image src={coverUrl} alt="Cover" fill className="object-cover" sizes="128px" />
                    </div>
                    <button
                      type="button"
                      onClick={() => removeMedia(coverUrl, "cover")}
                      className="rounded-md px-2.5 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 border border-red-200 transition-colors"
                    >
                      Remove
                    </button>
                  </div>
                )}
                <label className="inline-flex items-center gap-2 cursor-pointer rounded-md border border-dashed border-gray-300 px-3 py-2 text-xs text-gray-600 hover:border-gold hover:text-gold transition-colors">
                  <Upload className="h-3.5 w-3.5" />
                  {coverUrl ? "Replace cover" : "Upload cover"}
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="sr-only"
                    disabled={coverProgress >= 0}
                    onChange={(e) => uploadMedia(e.target.files, "cover")}
                  />
                </label>
                {coverProgress >= 0 && (
                  <div className="w-full bg-gray-200 rounded h-1">
                    <div className="bg-gold h-1 rounded transition-all" style={{ width: `${coverProgress}%` }} />
                  </div>
                )}
                {coverError && <p className="text-xs text-red-500">{coverError}</p>}
              </div>

              {/* Gallery */}
              <div className="space-y-2">
                <span className="text-xs font-semibold text-gray-600 flex items-center gap-1.5">
                  <Images className="h-3.5 w-3.5" />
                  Gallery ({galleryUrls.length}/10)
                </span>
                {galleryUrls.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {galleryUrls.map((url) => (
                      <div key={url} className="relative group">
                        <div className="relative h-16 w-16 rounded-lg overflow-hidden ring-1 ring-gray-200 bg-gray-50">
                          <Image src={url} alt="" fill className="object-cover" sizes="64px" />
                        </div>
                        <button
                          type="button"
                          onClick={() => removeMedia(url, "gallery")}
                          className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
                          title="Remove"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                {galleryUrls.length < 10 && (
                  <label className="inline-flex items-center gap-2 cursor-pointer rounded-md border border-dashed border-gray-300 px-3 py-2 text-xs text-gray-600 hover:border-gold hover:text-gold transition-colors">
                    <Upload className="h-3.5 w-3.5" />
                    Add images
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      multiple
                      className="sr-only"
                      disabled={Object.keys(galleryProgress).length > 0}
                      onChange={(e) => uploadMedia(e.target.files, "gallery")}
                    />
                  </label>
                )}
                {Object.keys(galleryProgress).length > 0 && (
                  <div className="w-full bg-gray-200 rounded h-1">
                    <div
                      className="bg-gold h-1 rounded transition-all"
                      style={{
                        width: `${Math.round(
                          Object.values(galleryProgress).reduce((a, b) => a + b, 0) /
                            Object.keys(galleryProgress).length,
                        )}%`,
                      }}
                    />
                  </div>
                )}
                {galleryError && <p className="text-xs text-red-500">{galleryError}</p>}
              </div>

              {/* Video */}
              <div className="space-y-2">
                <span className="text-xs font-semibold text-gray-600 flex items-center gap-1.5">
                  <Video className="h-3.5 w-3.5" />
                  Video
                </span>
                {videoUrl && (
                  <div className="space-y-2">
                    <video src={videoUrl} controls preload="metadata" className="w-full max-h-40 rounded-lg bg-black" />
                    <button
                      type="button"
                      onClick={() => removeMedia(videoUrl, "video")}
                      className="rounded-md px-2.5 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 border border-red-200 transition-colors"
                    >
                      Remove video
                    </button>
                  </div>
                )}
                <label className="inline-flex items-center gap-2 cursor-pointer rounded-md border border-dashed border-gray-300 px-3 py-2 text-xs text-gray-600 hover:border-gold hover:text-gold transition-colors">
                  <Upload className="h-3.5 w-3.5" />
                  {videoUrl ? "Replace video" : "Upload video (MP4/WebM, up to 50 MB)"}
                  <input
                    type="file"
                    accept="video/mp4,video/webm"
                    className="sr-only"
                    disabled={videoProgress >= 0}
                    onChange={(e) => uploadMedia(e.target.files, "video")}
                  />
                </label>
                {videoProgress >= 0 && (
                  <div className="w-full bg-gray-200 rounded h-1">
                    <div className="bg-gold h-1 rounded transition-all" style={{ width: `${videoProgress}%` }} />
                  </div>
                )}
                {videoError && <p className="text-xs text-red-500">{videoError}</p>}
              </div>
            </div>
          ) : (
            <p className="text-xs text-gray-400 border-t border-gray-100 pt-4">
              Save the listing first, then add media from Edit.
            </p>
          )}

          {error && <p className="text-sm text-red-500">{error}</p>}
        </div>

        <div className="flex items-center justify-end gap-3 px-6 py-4 bg-gray-50/50 border-t border-gray-100 rounded-b-2xl">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-100 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="rounded-lg bg-navy text-white px-4 py-2 text-sm font-semibold hover:bg-navy-light transition-colors disabled:opacity-60"
          >
            {submitting
              ? mode === "create"
                ? "Creating…"
                : "Saving…"
              : mode === "create"
                ? "Create listing"
                : "Save changes"}
          </button>
        </div>

        <style jsx>{`
          .input {
            width: 100%;
            border-radius: 0.375rem;
            border: 1px solid #e5e7eb;
            padding: 0.5rem 0.75rem;
            font-size: 0.875rem;
            outline: none;
            transition: border-color 0.15s, box-shadow 0.15s;
          }
          .input:focus {
            border-color: rgb(201 155 60);
            box-shadow: 0 0 0 2px rgba(201, 155, 60, 0.2);
          }
        `}</style>
      </form>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs font-semibold text-gray-600 mb-1.5 block">{label}</span>
      {children}
    </label>
  );
}

function RowMenu({
  listing,
  onEdit,
  onChangeStatus,
  onTogglePublish,
  onDelete,
}: {
  listing: AdminListing;
  onEdit: () => void;
  onChangeStatus: (status: "available" | "reserved" | "sold") => void;
  onTogglePublish: () => void;
  onDelete: () => void;
}) {
  return (
    <div
      className="absolute right-0 top-full mt-1 z-20 w-52 rounded-lg bg-white shadow-lg ring-1 ring-gray-200 py-1.5"
      role="menu"
    >
      <button
        type="button"
        onClick={onEdit}
        className="w-full inline-flex items-center gap-2 px-3 py-1.5 text-sm text-left text-gray-700 hover:bg-gray-50"
      >
        <Pencil className="h-3.5 w-3.5" />
        Edit listing
      </button>

      <div className="border-t border-gray-100 my-1" />

      <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-gray-400">
        Change status
      </div>
      {(
        [
          { key: "available", label: "Available", icon: CheckCircle2 },
          { key: "reserved", label: "Reserved", icon: Pause },
          { key: "sold", label: "Sold", icon: CheckCircle2 },
        ] as const
      ).map(({ key, label, icon: Icon }) => (
        <button
          key={key}
          type="button"
          onClick={() => onChangeStatus(key)}
          disabled={listing.status === key}
          className="w-full inline-flex items-center gap-2 px-3 py-1.5 text-sm text-left text-gray-700 hover:bg-gray-50 disabled:text-gray-300 disabled:bg-transparent"
        >
          <Icon className="h-3.5 w-3.5" />
          {label}
          {listing.status === key && <span className="ml-auto text-xs text-gray-400">·current</span>}
        </button>
      ))}

      <div className="border-t border-gray-100 my-1" />

      <button
        type="button"
        onClick={onTogglePublish}
        className="w-full inline-flex items-center gap-2 px-3 py-1.5 text-sm text-left text-gray-700 hover:bg-gray-50"
      >
        {listing.published ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
        {listing.published ? "Hide from marketplace" : "Publish to marketplace"}
      </button>

      <div className="border-t border-gray-100 my-1" />

      <button
        type="button"
        onClick={onDelete}
        className="w-full inline-flex items-center gap-2 px-3 py-1.5 text-sm text-left text-red-600 hover:bg-red-50"
      >
        <Trash2 className="h-3.5 w-3.5" />
        Delete listing
      </button>
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

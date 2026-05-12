"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { ChevronDown, ChevronRight, SlidersHorizontal } from "lucide-react";
import type { Category } from "@/lib/businesses/types";

interface FilterSidebarProps {
  categories: Category[];
  cities: string[];
  selectedCategory?: string;
  selectedCity?: string;
  selectedStatus?: string;
  forRent?: boolean;
  minPrice?: number;
  maxPrice?: number;
}

export function FilterSidebar({
  categories,
  cities,
  selectedCategory,
  selectedCity,
  selectedStatus,
  forRent,
  minPrice,
  maxPrice,
}: FilterSidebarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [panelOpen, setPanelOpen] = useState(true);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
    category: true,
    city: true,
    type: false,
    status: false,
    price: false,
  });

  // Collapse the whole panel by default on small screens; expand on desktop.
  useEffect(() => {
    if (typeof window === "undefined") return;
    setPanelOpen(window.matchMedia("(min-width: 1024px)").matches);
  }, []);

  function setParam(key: string, value: string | undefined) {
    const next = new URLSearchParams(params.toString());
    if (value === undefined || value === "") next.delete(key);
    else next.set(key, value);
    startTransition(() => router.push(`${pathname}?${next.toString()}`));
  }

  function reset() {
    startTransition(() => router.push(pathname));
  }

  function toggleGroup(key: string) {
    setOpenGroups((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  const activeCount =
    (selectedCategory ? 1 : 0) +
    (selectedCity ? 1 : 0) +
    (selectedStatus ? 1 : 0) +
    (forRent !== undefined ? 1 : 0) +
    (minPrice ? 1 : 0) +
    (maxPrice ? 1 : 0);

  return (
    <aside className="space-y-4">
      <button
        type="button"
        onClick={() => setPanelOpen((v) => !v)}
        className="w-full flex items-center justify-between rounded-lg bg-white ring-1 ring-gray-200 px-4 py-2.5 hover:ring-gold/40 transition-colors"
        aria-expanded={panelOpen}
      >
        <span className="flex items-center gap-2 text-sm font-semibold text-navy">
          <SlidersHorizontal className="h-4 w-4 text-gold" />
          Filters
          {activeCount > 0 && (
            <span className="inline-flex items-center justify-center rounded-full bg-gold/15 px-2 py-0.5 text-xs font-semibold text-gold-dark">
              {activeCount}
            </span>
          )}
        </span>
        <ChevronDown
          className={`h-4 w-4 text-gray-400 transition-transform ${panelOpen ? "rotate-180" : ""}`}
        />
      </button>

      {panelOpen && (
        <div className="space-y-4 rounded-xl bg-white ring-1 ring-gray-200 shadow-sm p-4">
          {activeCount > 0 && (
            <button
              type="button"
              onClick={reset}
              className="text-xs font-semibold text-gold hover:text-gold-dark"
            >
              Clear all ({activeCount})
            </button>
          )}

          <FilterGroup
            label="Category"
            open={openGroups.category}
            onToggle={() => toggleGroup("category")}
          >
            <CategoryRow
              label="All categories"
              checked={!selectedCategory}
              onClick={() => setParam("category", undefined)}
            />
            {categories.map((cat) => (
              <CategoryRow
                key={cat.slug}
                label={cat.name}
                checked={selectedCategory === cat.slug}
                onClick={() => setParam("category", cat.slug)}
              />
            ))}
          </FilterGroup>

          <FilterGroup
            label="City"
            open={openGroups.city}
            onToggle={() => toggleGroup("city")}
          >
            <CategoryRow
              label="All cities"
              checked={!selectedCity}
              onClick={() => setParam("city", undefined)}
            />
            {cities.map((city) => (
              <CategoryRow
                key={city}
                label={city}
                checked={selectedCity === city}
                onClick={() => setParam("city", city)}
              />
            ))}
          </FilterGroup>

          <FilterGroup
            label="Listing type"
            open={openGroups.type}
            onToggle={() => toggleGroup("type")}
          >
            <CategoryRow
              label="All types"
              checked={forRent === undefined}
              onClick={() => setParam("rent", undefined)}
            />
            <CategoryRow
              label="For sale"
              checked={forRent === false}
              onClick={() => setParam("rent", "0")}
            />
            <CategoryRow
              label="For rent"
              checked={forRent === true}
              onClick={() => setParam("rent", "1")}
            />
          </FilterGroup>

          <FilterGroup
            label="Status"
            open={openGroups.status}
            onToggle={() => toggleGroup("status")}
          >
            <CategoryRow
              label="All statuses"
              checked={!selectedStatus}
              onClick={() => setParam("status", undefined)}
            />
            {(["available", "reserved", "sold"] as const).map((s) => (
              <CategoryRow
                key={s}
                label={s.charAt(0).toUpperCase() + s.slice(1)}
                checked={selectedStatus === s}
                onClick={() => setParam("status", s)}
              />
            ))}
          </FilterGroup>

          <FilterGroup
            label="Price (OMR)"
            open={openGroups.price}
            onToggle={() => toggleGroup("price")}
          >
            <div className="grid grid-cols-2 gap-2">
              <input
                type="number"
                placeholder="Min"
                defaultValue={minPrice}
                onBlur={(e) => setParam("minPrice", e.target.value || undefined)}
                className="rounded-md border border-gray-200 px-2 py-1.5 text-sm focus:border-gold focus:ring-2 focus:ring-gold/20 outline-none"
              />
              <input
                type="number"
                placeholder="Max"
                defaultValue={maxPrice}
                onBlur={(e) => setParam("maxPrice", e.target.value || undefined)}
                className="rounded-md border border-gray-200 px-2 py-1.5 text-sm focus:border-gold focus:ring-2 focus:ring-gold/20 outline-none"
              />
            </div>
          </FilterGroup>

          {isPending && <p className="text-xs text-gray-500">Updating…</p>}
        </div>
      )}
    </aside>
  );
}

function FilterGroup({
  label,
  open,
  onToggle,
  children,
}: {
  label: string;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div>
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between text-xs font-semibold uppercase tracking-wide text-gray-500 hover:text-navy mb-2 transition-colors"
        aria-expanded={open}
      >
        <span>{label}</span>
        {open ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
      </button>
      {open && <div className="space-y-1">{children}</div>}
    </div>
  );
}

function CategoryRow({ label, checked, onClick }: { label: string; checked: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-sm transition-colors ${
        checked ? "bg-gold/10 text-navy font-semibold" : "text-gray-700 hover:bg-gray-50"
      }`}
    >
      <span>{label}</span>
      {checked && <span className="h-1.5 w-1.5 rounded-full bg-gold" />}
    </button>
  );
}

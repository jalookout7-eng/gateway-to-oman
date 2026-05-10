"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useTransition } from "react";
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

  function setParam(key: string, value: string | undefined) {
    const next = new URLSearchParams(params.toString());
    if (value === undefined || value === "") next.delete(key);
    else next.set(key, value);
    startTransition(() => router.push(`${pathname}?${next.toString()}`));
  }

  function reset() {
    startTransition(() => router.push(pathname));
  }

  return (
    <aside className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="font-heading text-lg font-semibold text-navy">Filters</h2>
        <button
          type="button"
          onClick={reset}
          className="text-xs font-medium text-gold hover:text-gold-dark"
        >
          Clear all
        </button>
      </div>

      <FilterGroup label="Category">
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

      <FilterGroup label="City">
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

      <FilterGroup label="Listing type">
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

      <FilterGroup label="Status">
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

      <FilterGroup label="Price (OMR)">
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
    </aside>
  );
}

function FilterGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-gray-500">{label}</h3>
      <div className="space-y-1">{children}</div>
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

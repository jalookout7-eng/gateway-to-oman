"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useTransition } from "react";

interface SortControlProps {
  current?: "newest" | "price-asc" | "price-desc";
  resultCount: number;
}

const OPTIONS: Array<{ value: SortControlProps["current"]; label: string }> = [
  { value: "newest", label: "Newest first" },
  { value: "price-asc", label: "Price: low to high" },
  { value: "price-desc", label: "Price: high to low" },
];

export function SortControl({ current = "newest", resultCount }: SortControlProps) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [, startTransition] = useTransition();

  function setSort(value: string) {
    const next = new URLSearchParams(params.toString());
    if (value === "newest") next.delete("sort");
    else next.set("sort", value);
    startTransition(() => router.push(`${pathname}?${next.toString()}`));
  }

  return (
    <div className="flex items-center justify-between gap-4">
      <p className="text-sm text-gray-600">
        <span className="font-semibold text-navy">{resultCount}</span>{" "}
        {resultCount === 1 ? "listing" : "listings"}
      </p>
      <label className="flex items-center gap-2 text-sm text-gray-600">
        Sort by
        <select
          value={current}
          onChange={(e) => setSort(e.target.value)}
          className="rounded-md border border-gray-200 bg-white py-1.5 pl-3 pr-8 text-sm font-medium focus:border-gold focus:ring-2 focus:ring-gold/20 outline-none"
        >
          {OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}

import type { ListingStatus } from "@/lib/businesses/types";

const STATUS_STYLES: Record<ListingStatus, string> = {
  available: "bg-emerald-100 text-emerald-800 ring-emerald-200",
  reserved: "bg-amber-100 text-amber-800 ring-amber-200",
  sold: "bg-gray-200 text-gray-700 ring-gray-300",
};

const STATUS_LABEL: Record<ListingStatus, string> = {
  available: "Available",
  reserved: "Reserved",
  sold: "Sold",
};

export function StatusBadge({ status, className = "" }: { status: ListingStatus; className?: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${STATUS_STYLES[status]} ${className}`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${
          status === "available" ? "bg-emerald-500" : status === "reserved" ? "bg-amber-500" : "bg-gray-500"
        }`}
      />
      {STATUS_LABEL[status]}
    </span>
  );
}

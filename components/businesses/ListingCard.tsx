import Link from "next/link";
import type { Listing } from "@/lib/businesses/types";
import { formatPriceRange, ageLabel } from "@/lib/businesses/format";
import { StatusBadge } from "./StatusBadge";
import { Briefcase, MapPin, Users, Calendar, ArrowRight } from "lucide-react";

const CATEGORY_GRADIENTS: Record<string, string> = {
  "cafe-restaurant": "from-orange-100 to-amber-50",
  gym: "from-rose-100 to-pink-50",
  "car-service": "from-slate-200 to-slate-50",
  "grocery-store": "from-lime-100 to-emerald-50",
  "car-accessories": "from-blue-100 to-sky-50",
  laundry: "from-cyan-100 to-blue-50",
  "travel-agency": "from-violet-100 to-indigo-50",
  "industrial-commercial": "from-zinc-200 to-gray-100",
};

export function ListingCard({ listing }: { listing: Listing }) {
  const gradient = CATEGORY_GRADIENTS[listing.category_slug] ?? "from-gray-100 to-gray-50";
  const priceLine = formatPriceRange(
    listing.for_sale,
    listing.for_rent,
    listing.selling_price_omr,
    listing.rental_price_omr,
  );

  return (
    <Link
      href={`/businesses/listing/${listing.slug}`}
      className="group block overflow-hidden rounded-xl bg-white ring-1 ring-gray-200 transition-all hover:ring-gold hover:shadow-lg"
    >
      <div className={`relative aspect-[16/10] bg-gradient-to-br ${gradient} flex items-center justify-center`}>
        {listing.cover_image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={listing.cover_image_url}
            alt={listing.title}
            className="h-full w-full object-cover"
          />
        ) : (
          <Briefcase className="h-16 w-16 text-gray-400/40" strokeWidth={1.5} />
        )}
        <div className="absolute right-3 top-3">
          <StatusBadge status={listing.status} />
        </div>
        <div className="absolute left-3 top-3">
          <span className="inline-flex items-center rounded-md bg-white/90 px-2 py-0.5 text-xs font-medium text-navy backdrop-blur">
            {listing.category_name}
          </span>
        </div>
      </div>

      <div className="p-5">
        <h3 className="font-heading text-lg font-semibold text-navy line-clamp-2 group-hover:text-gold transition-colors">
          {listing.title}
        </h3>

        {(listing.location_city || listing.area) && (
          <p className="mt-1 flex items-center gap-1 text-sm text-gray-600">
            <MapPin className="h-3.5 w-3.5" />
            <span className="line-clamp-1">
              {[listing.area, listing.location_city].filter(Boolean).join(", ")}
            </span>
          </p>
        )}

        <p className="mt-3 text-base font-semibold text-gold">{priceLine}</p>

        <div className="mt-4 flex items-center gap-4 text-xs text-gray-600">
          <span className="inline-flex items-center gap-1">
            <Calendar className="h-3.5 w-3.5" />
            {ageLabel(listing.age_years)}
          </span>
          <span className="inline-flex items-center gap-1">
            <Users className="h-3.5 w-3.5" />
            {listing.employee_count !== null ? `${listing.employee_count} staff` : "—"}
          </span>
          <span className="ml-auto inline-flex items-center gap-1 text-gold opacity-0 transition-opacity group-hover:opacity-100">
            View <ArrowRight className="h-3.5 w-3.5" />
          </span>
        </div>
      </div>
    </Link>
  );
}

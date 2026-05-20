import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getListingBySlug } from "@/lib/businesses/queries";
import { getCurrentMarketplaceUser } from "@/lib/auth/marketplace-server";
import { formatOMR, formatPriceRange, ageLabel } from "@/lib/businesses/format";
import { StatusBadge } from "@/components/businesses/StatusBadge";
import { InquireBlock } from "@/components/businesses/InquireBlock";
import {
  ChevronLeft,
  MapPin,
  Calendar,
  Users,
  Tag,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Briefcase,
  Banknote,
} from "lucide-react";

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

export const dynamic = "force-dynamic";

export default async function ListingDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  // Detail pages are subscriber-only. Non-activated visitors land back on the
  // gated listings page (which shows the paywall).
  const user = await getCurrentMarketplaceUser();
  if (!user?.access_activated) redirect("/businesses/listings");

  const listing = await getListingBySlug(slug);
  if (!listing) notFound();

  const gradient = CATEGORY_GRADIENTS[listing.category_slug] ?? "from-gray-100 to-gray-50";
  const priceLine = formatPriceRange(
    listing.for_sale,
    listing.for_rent,
    listing.selling_price_omr,
    listing.rental_price_omr,
  );

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
      <Link
        href="/businesses"
        className="inline-flex items-center gap-1 text-sm font-medium text-gray-500 hover:text-gold transition-colors"
      >
        <ChevronLeft className="h-4 w-4" />
        Back to listings
      </Link>

      <div className="mt-6 grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-8">
        <div className="space-y-6">
          <div className={`relative aspect-[16/9] overflow-hidden rounded-xl bg-gradient-to-br ${gradient}`}>
            {listing.cover_image_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={listing.cover_image_url}
                alt={listing.title}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full items-center justify-center">
                <Briefcase className="h-24 w-24 text-gray-400/40" strokeWidth={1.25} />
              </div>
            )}
            <div className="absolute right-4 top-4">
              <StatusBadge status={listing.status} />
            </div>
          </div>

          <div>
            <span className="inline-flex items-center gap-1.5 rounded-md bg-gold/10 px-2.5 py-1 text-xs font-semibold text-gold-dark">
              <Tag className="h-3.5 w-3.5" />
              {listing.category_name}
            </span>
            <h1 className="mt-3 font-heading text-3xl sm:text-4xl font-semibold text-navy leading-tight">
              {listing.title}
            </h1>
            {(listing.location_city || listing.area) && (
              <p className="mt-3 flex items-center gap-2 text-base text-gray-600">
                <MapPin className="h-4 w-4 text-gold" />
                {[listing.area, listing.location_city].filter(Boolean).join(", ")}
              </p>
            )}
          </div>

          <div className="rounded-xl bg-white ring-1 ring-gray-200 p-6">
            <p className="text-sm font-medium uppercase tracking-wide text-gray-500">Asking price</p>
            <p className="mt-1 font-heading text-3xl font-semibold text-gold">{priceLine}</p>

            <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-4 border-t border-gray-100 pt-5">
              <Stat icon={<Calendar className="h-4 w-4" />} label="Age" value={ageLabel(listing.age_years)} />
              <Stat
                icon={<Users className="h-4 w-4" />}
                label="Employees"
                value={listing.employee_count !== null ? String(listing.employee_count) : "—"}
              />
              <Stat
                icon={<Banknote className="h-4 w-4" />}
                label="Processing fee"
                value={formatOMR(listing.processing_fee_omr)}
              />
              <Stat
                icon={<FileText className="h-4 w-4" />}
                label="Reg. included"
                value={listing.commercial_registration_included ? "Yes" : "No"}
              />
            </div>

            {listing.stock_value_omr !== null && (
              <p className="mt-4 text-sm text-gray-600">
                <strong className="font-semibold text-navy">Stock value:</strong>{" "}
                {formatOMR(listing.stock_value_omr)} (included in sale)
              </p>
            )}
          </div>

          {listing.full_detail_text && (
            <Section title="Overview">
              <p className="text-base text-gray-700 leading-relaxed whitespace-pre-line">
                {listing.full_detail_text}
              </p>
            </Section>
          )}

          {listing.financials_text && (
            <Section title="Financials">
              <p className="text-base text-gray-700 leading-relaxed whitespace-pre-line">
                {listing.financials_text}
              </p>
            </Section>
          )}

          {(listing.pros_text || listing.cons_text) && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {listing.pros_text && (
                <Section
                  title="What makes it attractive"
                  icon={<CheckCircle2 className="h-5 w-5 text-emerald-500" />}
                >
                  <p className="text-base text-gray-700 leading-relaxed whitespace-pre-line">
                    {listing.pros_text}
                  </p>
                </Section>
              )}
              {listing.cons_text && (
                <Section
                  title="What to know going in"
                  icon={<AlertTriangle className="h-5 w-5 text-amber-500" />}
                >
                  <p className="text-base text-gray-700 leading-relaxed whitespace-pre-line">
                    {listing.cons_text}
                  </p>
                </Section>
              )}
            </div>
          )}
        </div>

        <div className="lg:sticky lg:top-24 lg:self-start">
          <InquireBlock listing={listing} />
        </div>
      </div>
    </div>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div>
      <p className="flex items-center gap-1.5 text-xs font-medium text-gray-500">
        {icon}
        {label}
      </p>
      <p className="mt-1 font-heading text-base font-semibold text-navy">{value}</p>
    </div>
  );
}

function Section({
  title,
  icon,
  children,
}: {
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl bg-white ring-1 ring-gray-200 p-6">
      <h2 className="flex items-center gap-2 font-heading text-xl font-semibold text-navy">
        {icon}
        {title}
      </h2>
      <div className="mt-3">{children}</div>
    </div>
  );
}

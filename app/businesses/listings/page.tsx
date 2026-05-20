import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { listListings, listCategories, listCities } from "@/lib/businesses/queries";
import { ListingCard } from "@/components/businesses/ListingCard";
import { FilterSidebar } from "@/components/businesses/FilterSidebar";
import { SearchBar } from "@/components/businesses/SearchBar";
import { SortControl } from "@/components/businesses/SortControl";
import { PaywallOverlay } from "@/components/businesses/PaywallOverlay";
import { getCurrentMarketplaceUser } from "@/lib/auth/marketplace-server";
import { getMarketplaceAccessFee } from "@/lib/businesses/settings";
import { Briefcase } from "lucide-react";

type SearchParams = Promise<{
  category?: string;
  city?: string;
  status?: "available" | "reserved" | "sold";
  rent?: string;
  minPrice?: string;
  maxPrice?: string;
  q?: string;
  sort?: "newest" | "price-asc" | "price-desc";
}>;

export const dynamic = "force-dynamic";

export const metadata = {
  title: "All Listings — Businesses for Sale in Oman",
};

export default async function BusinessesListingsPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;

  const filters = {
    categorySlug: params.category,
    city: params.city,
    status: params.status,
    forRent: params.rent === "1" ? true : params.rent === "0" ? false : undefined,
    minPrice: params.minPrice ? Number(params.minPrice) : undefined,
    maxPrice: params.maxPrice ? Number(params.maxPrice) : undefined,
    search: params.q,
    sort: params.sort,
  };

  const [user, listings, categories, cities, accessFee] = await Promise.all([
    getCurrentMarketplaceUser(),
    listListings(filters),
    listCategories(),
    listCities(),
    getMarketplaceAccessFee(),
  ]);

  const activated = !!user?.access_activated;

  // Non-subscribers see a blurred teaser of the grid behind a paywall overlay,
  // with filters/search disabled. Activated subscribers get the full experience.
  if (!activated) {
    return <LockedListings listings={listings} fee={accessFee} />;
  }

  return (
    <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">
      <Link
        href="/businesses"
        className="inline-flex items-center gap-1 text-sm font-medium text-gray-500 hover:text-gold transition-colors"
      >
        <ChevronLeft className="h-4 w-4" />
        Back to overview
      </Link>

      <div className="mt-4 mb-8 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="font-heading text-3xl sm:text-4xl font-semibold text-navy">
            All listings
          </h1>
          <p className="mt-2 text-sm text-gray-600">
            Vetted businesses across Oman. Click a card for full details.
          </p>
        </div>
      </div>

      <div className="mb-6">
        <SearchBar initialQuery={params.q ?? ""} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-8">
        <FilterSidebar
          categories={categories}
          cities={cities}
          selectedCategory={params.category}
          selectedCity={params.city}
          selectedStatus={params.status}
          forRent={filters.forRent}
          minPrice={filters.minPrice}
          maxPrice={filters.maxPrice}
        />

        <div className="space-y-6">
          <SortControl current={params.sort} resultCount={listings.length} />

          {listings.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
              {listings.map((listing) => (
                <ListingCard key={listing.id} listing={listing} unlocked />
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function LockedListings({
  listings,
  fee,
}: {
  listings: Awaited<ReturnType<typeof listListings>>;
  fee: number;
}) {
  // Teaser: up to 9 cards, blurred and non-interactive, under the paywall.
  const teaser = listings.slice(0, 9);

  return (
    <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">
      <Link
        href="/businesses"
        className="inline-flex items-center gap-1 text-sm font-medium text-gray-500 hover:text-gold transition-colors"
      >
        <ChevronLeft className="h-4 w-4" />
        Back to overview
      </Link>

      <div className="mt-4 mb-8">
        <h1 className="font-heading text-3xl sm:text-4xl font-semibold text-navy">
          All listings
        </h1>
        <p className="mt-2 text-sm text-gray-600">
          Vetted businesses for sale across Oman.
        </p>
      </div>

      <div className="relative">
        <div
          aria-hidden="true"
          className="pointer-events-none select-none blur-sm grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6"
        >
          {teaser.map((listing) => (
            <ListingCard key={listing.id} listing={listing} />
          ))}
        </div>
        <div className="absolute inset-0 bg-gradient-to-b from-warm-white/30 to-warm-white/80" aria-hidden="true" />
        <PaywallOverlay fee={fee} />
      </div>
    </section>
  );
}

function EmptyState() {
  return (
    <div className="rounded-xl border-2 border-dashed border-gray-200 bg-white p-12 text-center">
      <Briefcase className="mx-auto h-10 w-10 text-gray-300" strokeWidth={1.5} />
      <p className="mt-3 font-heading text-lg font-semibold text-navy">No listings match those filters.</p>
      <p className="mt-1 text-sm text-gray-500">Try clearing a filter or broadening your search.</p>
    </div>
  );
}

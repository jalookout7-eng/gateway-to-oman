import { listListings, listCategories, listCities } from "@/lib/businesses/queries";
import { ListingCard } from "@/components/businesses/ListingCard";
import { FilterSidebar } from "@/components/businesses/FilterSidebar";
import { SearchBar } from "@/components/businesses/SearchBar";
import { SortControl } from "@/components/businesses/SortControl";
import { MarketplaceHero } from "@/components/businesses/MarketplaceHero";
import { Briefcase, Sparkles } from "lucide-react";

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

export default async function BusinessesPage({ searchParams }: { searchParams: SearchParams }) {
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

  const filtersActive = Boolean(
    params.category ||
      params.city ||
      params.status ||
      params.rent !== undefined ||
      params.minPrice ||
      params.maxPrice ||
      params.q ||
      (params.sort && params.sort !== "newest"),
  );

  const [featured, listings, categories, cities] = await Promise.all([
    filtersActive ? Promise.resolve([]) : listListings({ featuredOnly: true, limit: 5 }),
    listListings(filters),
    listCategories(),
    listCities(),
  ]);

  return (
    <>
      <MarketplaceHero listingCount={listings.length} />

      {featured.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-12">
          <div className="flex items-end justify-between mb-6">
            <div>
              <p className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-gold">
                <Sparkles className="h-3.5 w-3.5" />
                Editor&apos;s picks
              </p>
              <h2 className="mt-1 font-heading text-2xl sm:text-3xl font-semibold text-navy">
                Highly rated businesses
              </h2>
            </div>
            <p className="text-sm text-gray-500 hidden sm:block">
              Curated by Gateway to Oman from the live marketplace.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
            {featured.map((listing) => (
              <ListingCard key={listing.id} listing={listing} />
            ))}
          </div>
        </section>
      )}

      <section id="listings" className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12 scroll-mt-20">
        <div className="mb-6 rounded-xl bg-gold/5 ring-1 ring-gold/20 px-5 py-4 text-sm text-navy">
          <strong className="font-semibold text-gold-dark">Preview marketplace.</strong>{" "}
          The listings below are a snapshot of currently available businesses. Click any
          card to request subscriber access — Ahmed will reach out personally with the invoice
          and full listing details.
        </div>

        <div className="mb-8">
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
                  <ListingCard key={listing.id} listing={listing} />
                ))}
              </div>
            )}
          </div>
        </div>
      </section>
    </>
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

import Link from "next/link";
import { ChevronLeft, ShieldCheck, Mail, Phone, MessageSquare } from "lucide-react";
import { getMarketplaceAccessFee } from "@/lib/businesses/settings";
import { getListingBySlug } from "@/lib/businesses/queries";
import { formatOMR } from "@/lib/businesses/format";
import { AccessRequestForm } from "@/components/businesses/AccessRequestForm";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{ listing?: string }>;

export default async function AccessPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const [fee, referredListing] = await Promise.all([
    getMarketplaceAccessFee(),
    params.listing ? getListingBySlug(params.listing) : Promise.resolve(null),
  ]);

  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-10">
      <Link
        href="/businesses"
        className="inline-flex items-center gap-1 text-sm font-medium text-gray-500 hover:text-gold transition-colors"
      >
        <ChevronLeft className="h-4 w-4" />
        Back to marketplace
      </Link>

      <div className="mt-6 rounded-2xl bg-white ring-1 ring-gray-200 shadow-sm overflow-hidden">
        <div className="bg-gradient-to-br from-navy to-navy-light px-8 py-10 text-white">
          <span className="inline-flex items-center gap-2 rounded-full bg-gold/20 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-gold-light ring-1 ring-gold/30">
            <ShieldCheck className="h-3.5 w-3.5" />
            Subscriber access
          </span>
          <h1 className="mt-4 font-heading text-3xl sm:text-4xl font-semibold leading-tight">
            Welcome to Gateway to Oman&apos;s Businesses-for-Sale marketplace.
          </h1>
          <p className="mt-3 text-base text-gray-200 leading-relaxed">
            Full listing details — financials, ownership, contact paths, due-diligence
            notes — are available to vetted subscribers only. Submit your details below
            and our team will be in touch to set up your access.
          </p>
        </div>

        <div className="px-8 py-6 border-b border-gray-100 bg-warm-cream/40">
          <div className="flex items-baseline justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                Subscriber access fee
              </p>
              <p className="mt-1 font-heading text-3xl font-semibold text-gold">
                {formatOMR(fee)}
              </p>
            </div>
            <p className="text-sm text-gray-600 max-w-xs text-right">
              One-time fee for marketplace access. Our team handles invoicing
              after reviewing your request.
            </p>
          </div>
        </div>

        {referredListing && (
          <div className="px-8 py-4 border-b border-gray-100 bg-amber-50/50">
            <p className="text-sm text-amber-900">
              <span className="font-semibold">You expressed interest in:</span>{" "}
              {referredListing.title}
              {referredListing.location_city && ` — ${referredListing.location_city}`}
            </p>
          </div>
        )}

        <div className="px-8 py-8">
          <h2 className="font-heading text-xl font-semibold text-navy mb-4">
            Tell us about you
          </h2>
          <AccessRequestForm referredListingSlug={params.listing} />
        </div>

        <div className="px-8 py-6 border-t border-gray-100 bg-gray-50/50 grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm text-gray-600">
          <NextStep
            icon={<Mail className="h-4 w-4 text-gold" />}
            title="1. We review"
            body="Our team reviews each request to make sure the marketplace is the right fit."
          />
          <NextStep
            icon={<Phone className="h-4 w-4 text-gold" />}
            title="2. We contact you"
            body="You&apos;ll hear from us by email or WhatsApp within 24 hours with the invoice and next steps."
          />
          <NextStep
            icon={<MessageSquare className="h-4 w-4 text-gold" />}
            title="3. Full access"
            body="Once payment clears, you get full marketplace access plus direct contact with sellers."
          />
        </div>
      </div>
    </div>
  );
}

function NextStep({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <div>
      <p className="flex items-center gap-2 font-semibold text-navy">
        {icon}
        {title}
      </p>
      <p className="mt-1.5 text-xs text-gray-600 leading-relaxed">{body}</p>
    </div>
  );
}

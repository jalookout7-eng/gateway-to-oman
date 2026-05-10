import Link from "next/link";
import { ShieldCheck, TrendingUp, Briefcase } from "lucide-react";

export function MarketplaceHero({ listingCount }: { listingCount: number }) {
  return (
    <section className="relative isolate overflow-hidden bg-gradient-to-br from-warm-cream via-warm-white to-white">
      <div className="absolute inset-0 -z-10 opacity-30" aria-hidden="true">
        <div className="absolute -top-40 right-0 h-96 w-96 rounded-full bg-gold/20 blur-3xl" />
        <div className="absolute -bottom-40 left-0 h-96 w-96 rounded-full bg-teal/20 blur-3xl" />
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
        <div className="mx-auto max-w-3xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full bg-gold/10 px-4 py-1.5 text-sm font-medium text-gold-dark ring-1 ring-gold/20">
            <Briefcase className="h-4 w-4" />
            Vetted businesses for sale in Oman
          </span>
          <h1 className="mt-6 font-heading text-4xl sm:text-5xl lg:text-6xl font-semibold tracking-tight text-navy">
            Buy a business that&apos;s already running.
          </h1>
          <p className="mt-6 text-lg text-gray-600 leading-relaxed">
            {listingCount} businesses currently listed across Oman — from cafés and laundries
            to industrial properties. Each one is vetted by Gateway to Oman before listing.
          </p>

          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="#listings"
              className="inline-flex items-center justify-center rounded-lg gold-gradient px-8 py-3.5 text-base font-semibold text-white shadow-md shadow-gold/20 hover:shadow-lg hover:shadow-gold/30 transition-all"
            >
              Browse listings
            </Link>
            <Link
              href="/businesses/list-your-business"
              className="inline-flex items-center justify-center rounded-lg border-2 border-navy px-8 py-3.5 text-base font-semibold text-navy hover:bg-navy hover:text-white transition-all"
            >
              List your business
            </Link>
          </div>
        </div>

        <div className="mt-16 grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-5xl mx-auto">
          <Feature
            icon={<ShieldCheck className="h-6 w-6 text-gold" />}
            title="Vetted listings"
            body="Every business is reviewed by Gateway to Oman before going live. No shell listings, no time-wasters."
          />
          <Feature
            icon={<Briefcase className="h-6 w-6 text-gold" />}
            title="Direct to seller"
            body="Inquire by WhatsApp, get connected to the seller directly. No third-party brokerage layer."
          />
          <Feature
            icon={<TrendingUp className="h-6 w-6 text-gold" />}
            title="Structure on day one"
            body="GTO can advise on entity structure, ownership, and compliance once you're in serious negotiation."
          />
        </div>
      </div>
    </section>
  );
}

function Feature({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <div className="rounded-xl bg-white/60 backdrop-blur-sm ring-1 ring-gray-200 p-5">
      <div className="inline-flex items-center justify-center rounded-lg bg-gold/10 p-2.5">{icon}</div>
      <h3 className="mt-3 font-heading text-lg font-semibold text-navy">{title}</h3>
      <p className="mt-1.5 text-sm text-gray-600 leading-relaxed">{body}</p>
    </div>
  );
}

import Link from "next/link";
import Image from "next/image";
import { ShieldCheck, TrendingUp, Briefcase } from "lucide-react";

export function MarketplaceHero({ listingCount }: { listingCount: number }) {
  return (
    <section className="relative isolate overflow-hidden">
      <Image
        src="/businesses/hero.jpg"
        alt="Muscat skyline at dusk"
        fill
        priority
        sizes="100vw"
        className="object-cover -z-20"
      />
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-navy/85 via-navy/70 to-navy/90" aria-hidden="true" />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-20 sm:py-28">
        <div className="mx-auto max-w-3xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full bg-gold/15 px-4 py-1.5 text-sm font-medium text-gold-light ring-1 ring-gold/30 backdrop-blur-sm">
            <Briefcase className="h-4 w-4" />
            Vetted businesses for sale in Oman
          </span>
          <h1 className="mt-6 font-heading text-4xl sm:text-5xl lg:text-6xl font-semibold tracking-tight text-white drop-shadow-sm">
            Buy a business that&apos;s already running.
          </h1>
          <p className="mt-6 text-lg text-gray-200 leading-relaxed">
            {listingCount} businesses currently listed across Oman — from cafés and laundries
            to industrial properties. Each one is vetted by Gateway to Oman before listing.
          </p>

          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="#listings"
              className="inline-flex items-center justify-center rounded-lg gold-gradient px-8 py-3.5 text-base font-semibold text-white shadow-lg shadow-gold/40 hover:shadow-xl hover:shadow-gold/50 transition-all"
            >
              Browse listings
            </Link>
            <Link
              href="/businesses/list-your-business"
              className="inline-flex items-center justify-center rounded-lg border-2 border-white/70 bg-white/10 backdrop-blur-sm px-8 py-3.5 text-base font-semibold text-white hover:bg-white hover:text-navy transition-all"
            >
              List your business
            </Link>
          </div>
        </div>

        <div className="mt-16 grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-5xl mx-auto">
          <Feature
            icon={<ShieldCheck className="h-6 w-6 text-gold-light" />}
            title="Vetted listings"
            body="Every business is reviewed by Gateway to Oman before going live. No shell listings, no time-wasters."
          />
          <Feature
            icon={<Briefcase className="h-6 w-6 text-gold-light" />}
            title="Direct to seller"
            body="Inquire by WhatsApp, get connected to the seller directly. No third-party brokerage layer."
          />
          <Feature
            icon={<TrendingUp className="h-6 w-6 text-gold-light" />}
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
    <div className="rounded-xl bg-white/10 backdrop-blur-md ring-1 ring-white/20 p-5">
      <div className="inline-flex items-center justify-center rounded-lg bg-gold/20 p-2.5">{icon}</div>
      <h3 className="mt-3 font-heading text-lg font-semibold text-white">{title}</h3>
      <p className="mt-1.5 text-sm text-gray-200 leading-relaxed">{body}</p>
    </div>
  );
}

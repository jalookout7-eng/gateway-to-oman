import Link from "next/link";
import Image from "next/image";
import {
  Sparkles,
  ShieldCheck,
  Briefcase,
  TrendingUp,
  Compass,
  HandCoins,
  FileSearch,
  Handshake,
  Star,
  ArrowRight,
  CheckCircle2,
} from "lucide-react";
import { listListings } from "@/lib/businesses/queries";
import { ListingCard } from "@/components/businesses/ListingCard";
import { getMarketplaceAccessFee } from "@/lib/businesses/settings";
import { formatOMR } from "@/lib/businesses/format";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Businesses for Sale in Oman — Gateway to Oman",
  description:
    "A vetted marketplace of businesses for sale in Oman. Every listing reviewed by the Gateway to Oman team before going live. Direct introductions, structure support, and local expertise.",
};

export default async function BusinessesLandingPage() {
  const [featured, fee, allListings] = await Promise.all([
    listListings({ featuredOnly: true, limit: 5 }),
    getMarketplaceAccessFee(),
    listListings({}),
  ]);
  const totalListings = allListings.length;

  return (
    <>
      {/* Hero */}
      <section className="relative isolate overflow-hidden">
        <Image
          src="/businesses/hero.jpg"
          alt="Muscat skyline at dusk"
          fill
          priority
          sizes="100vw"
          className="object-cover -z-20"
        />
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-navy/85 via-navy/72 to-navy/92" aria-hidden="true" />

        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-20 sm:py-28">
          <div className="mx-auto max-w-3xl text-center">
            <span className="inline-flex items-center gap-2 rounded-full bg-gold/15 px-4 py-1.5 text-sm font-medium text-gold-light ring-1 ring-gold/30 backdrop-blur-sm">
              <Briefcase className="h-4 w-4" />
              Vetted businesses for sale in Oman
            </span>
            <h1 className="mt-6 font-heading text-4xl sm:text-5xl lg:text-6xl font-semibold tracking-tight text-white drop-shadow-sm">
              Buy a business that&apos;s already running.
            </h1>
            <p className="mt-6 text-lg text-gray-200 leading-relaxed">
              {totalListings} live listings across cafés, gyms, laundries, travel agencies,
              and industrial properties. Each one reviewed by the Gateway to Oman team
              before going live — no shell listings, no time-wasters.
            </p>

            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/businesses/listings"
                className="inline-flex items-center justify-center rounded-lg gold-gradient px-8 py-3.5 text-base font-semibold text-white shadow-lg shadow-gold/40 hover:shadow-xl hover:shadow-gold/50 transition-all"
              >
                Browse all listings
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
              {/* Hero secondary CTA — Calendly direct (Notes 3 item 1).
                  Previously linked to /businesses/list-your-business which
                  was a Coming Soon stub; visitors who want to talk to the
                  team are better served by jumping straight to Ahmed's
                  calendar. The seller-side flow still exists at that path
                  for anyone who navigates there directly, but it's no
                  longer promoted on the marketplace hero. */}
              <a
                href="https://calendly.com/alazizi/30min"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center rounded-lg border-2 border-white/70 bg-white/10 backdrop-blur-sm px-8 py-3.5 text-base font-semibold text-white hover:bg-white hover:text-navy transition-all"
              >
                Book a consultation
              </a>
            </div>
          </div>

          <div className="mt-16 grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-5xl mx-auto">
            <HeroFeature
              icon={<ShieldCheck className="h-6 w-6 text-gold-light" />}
              title="Vetted listings"
              body="Every business is reviewed before going live. No shell listings, no fake numbers."
            />
            <HeroFeature
              icon={<Handshake className="h-6 w-6 text-gold-light" />}
              title="Direct to seller"
              body="Inquire by WhatsApp and get connected to the seller directly. No third-party brokerage layer."
            />
            <HeroFeature
              icon={<TrendingUp className="h-6 w-6 text-gold-light" />}
              title="Structure on day one"
              body="Once you&apos;re in serious negotiation, our team can advise on entity setup, ownership, and compliance."
            />
          </div>
        </div>
      </section>

      {/* Editor's picks — only if there are featured listings */}
      {featured.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-16">
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
            <Link
              href="/businesses/listings"
              className="hidden sm:inline-flex items-center gap-1 text-sm font-semibold text-gold hover:text-gold-dark transition-colors"
            >
              See all listings
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
            {featured.map((listing) => (
              <ListingCard key={listing.id} listing={listing} />
            ))}
          </div>
        </section>
      )}

      {/* Why GTO — anchored as #why-us for the nav "Why us" link (Notes 3 item 1). */}
      <section id="why-us" className="bg-warm-white mt-20 scroll-mt-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-20">
          <div className="text-center max-w-3xl mx-auto">
            <p className="text-xs font-semibold uppercase tracking-wider text-gold">
              What makes us different
            </p>
            <h2 className="mt-2 font-heading text-3xl sm:text-4xl font-semibold text-navy">
              Buying a business in Oman isn&apos;t like buying one anywhere else.
            </h2>
            <p className="mt-4 text-base text-gray-600 leading-relaxed">
              Local ownership rules. CR registration. Sector licensing.
              Currency and banking quirks. Most listings sites give you a phone
              number and wish you luck. We don&apos;t. Here&apos;s what changes when
              you go through the Gateway to Oman marketplace.
            </p>
          </div>

          <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-6">
            <DiffCard
              icon={<ShieldCheck className="h-5 w-5" />}
              title="Sellers screened, not just listed"
              body="We meet each seller, review their CR and operating history, and verify the numbers before the listing goes live. If we can&apos;t verify it, it doesn&apos;t list."
            />
            <DiffCard
              icon={<HandCoins className="h-5 w-5" />}
              title="Real prices, in OMR"
              body="No bait-and-switch ranges. The price you see is the price the seller will entertain — backed by the financials behind the listing."
            />
            <DiffCard
              icon={<FileSearch className="h-5 w-5" />}
              title="Pre-purchase diligence support"
              body="Once you&apos;re seriously interested, our team can guide you through the documents you need to request, the questions to ask, and the red flags to watch for."
            />
            <DiffCard
              icon={<Compass className="h-5 w-5" />}
              title="Local hand-holding when it counts"
              body="CR transfer, sector licensing, residency adjustments — the friction that breaks most cross-border deals. Our team has done this 100+ times in Oman."
            />
          </div>
        </div>
      </section>

      {/* What you get with access */}
      <section className="bg-navy text-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-20">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-12 items-center">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-gold">
                Subscriber access
              </p>
              <h2 className="mt-2 font-heading text-3xl sm:text-4xl font-semibold leading-tight">
                What you get for {formatOMR(fee)}
              </h2>
              <p className="mt-4 text-base text-gray-300 leading-relaxed">
                One-time fee unlocks the full marketplace plus your initial
                advisory session. No subscription, no surprise charges.
              </p>

              <ul className="mt-8 space-y-3">
                {[
                  "Full financials, ownership, and contact paths for every listing",
                  "Direct introductions to vetted sellers (no broker chain)",
                  "One advisory call with our team to scope your search",
                  "Pre-purchase document checklist tailored to your sector",
                  "Buyer-side guidance on CR transfer and licensing",
                  "Email updates as new listings match your criteria",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-3">
                    <CheckCircle2 className="h-5 w-5 text-gold flex-shrink-0 mt-0.5" />
                    <span className="text-gray-200">{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="bg-white/5 backdrop-blur-sm rounded-2xl ring-1 ring-white/15 p-8 lg:w-[340px]">
              <p className="text-xs font-semibold uppercase tracking-wider text-gold-light">
                One-time access
              </p>
              <p className="mt-2 font-heading text-5xl font-semibold text-white">
                {formatOMR(fee)}
              </p>
              <p className="mt-2 text-sm text-gray-300">
                Pay once. Browse the full marketplace until you find your fit.
              </p>
              <Link
                href="/businesses/access"
                className="mt-6 inline-flex w-full items-center justify-center rounded-lg gold-gradient px-5 py-3 text-base font-semibold text-white shadow-lg shadow-gold/40 hover:shadow-xl hover:shadow-gold/50 transition-all"
              >
                Request access
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
              <p className="mt-3 text-center text-xs text-gray-400">
                Already a subscriber?{" "}
                <Link href="/businesses/sign-in" className="text-gold-light hover:underline">
                  Sign in
                </Link>
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="bg-warm-cream/40">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-20">
          <div className="text-center max-w-2xl mx-auto">
            <p className="text-xs font-semibold uppercase tracking-wider text-gold">
              How it works
            </p>
            <h2 className="mt-2 font-heading text-3xl sm:text-4xl font-semibold text-navy">
              From browsing to ownership in four steps.
            </h2>
          </div>

          <ol className="mt-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Step
              n={1}
              title="Browse the preview"
              body="See category, location, age, and headline price for every live listing. No payment required to look."
            />
            <Step
              n={2}
              title="Request access"
              body="Once a listing catches your eye, request subscriber access. Pay the one-time fee and our team reaches out within 24 hours."
            />
            <Step
              n={3}
              title="Direct intro to the seller"
              body="We connect you with the seller directly — by email, WhatsApp, or in-person if you&apos;re in Muscat."
            />
            <Step
              n={4}
              title="Close with structure support"
              body="When you&apos;re in serious negotiation, our team guides the CR transfer, licensing, and any ownership structuring you need."
            />
          </ol>
        </div>
      </section>

      {/* Authority / testimonial slot */}
      <section className="bg-white">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-20 text-center">
          <Star className="mx-auto h-8 w-8 text-gold" strokeWidth={1.5} />
          <p className="mt-4 font-heading text-2xl sm:text-3xl text-navy leading-relaxed max-w-3xl mx-auto">
            &ldquo;Honesty over hype. The Gateway to Oman team will tell you
            when a deal isn&apos;t right for you — that&apos;s the part most
            marketplaces leave out.&rdquo;
          </p>
          <p className="mt-6 text-sm text-gray-500">
            — Subscriber testimonials coming soon
          </p>
        </div>
      </section>

      {/* Final CTA */}
      <section className="bg-navy text-white">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-20 text-center">
          <h2 className="font-heading text-3xl sm:text-4xl font-semibold">
            Ready to see what&apos;s available?
          </h2>
          <p className="mt-4 text-base text-gray-300 max-w-xl mx-auto">
            {totalListings} businesses are listed right now. Browse the preview
            free, or unlock the full marketplace and our advisory support for{" "}
            {formatOMR(fee)} one-time.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/businesses/listings"
              className="inline-flex items-center justify-center rounded-lg gold-gradient px-8 py-3.5 text-base font-semibold text-white shadow-lg shadow-gold/40 hover:shadow-xl transition-all"
            >
              Browse all listings
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
            <Link
              href="/businesses/access"
              className="inline-flex items-center justify-center rounded-lg border-2 border-white/70 bg-white/10 backdrop-blur-sm px-8 py-3.5 text-base font-semibold text-white hover:bg-white hover:text-navy transition-all"
            >
              Request subscriber access
            </Link>
          </div>

          {/* Calendly direct — for visitors who want a real conversation
              with the team rather than browsing on their own. */}
          <div className="mt-6 text-sm text-gray-300">
            Want to talk it through first?{" "}
            <a
              href="https://calendly.com/alazizi/30min"
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-gold-light underline-offset-4 hover:underline"
            >
              Book a free consultation
            </a>
          </div>
        </div>
      </section>
    </>
  );
}

function HeroFeature({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <div className="rounded-xl bg-white/10 backdrop-blur-md ring-1 ring-white/20 p-5">
      <div className="inline-flex items-center justify-center rounded-lg bg-gold/20 p-2.5">{icon}</div>
      <h3 className="mt-3 font-heading text-lg font-semibold text-white">{title}</h3>
      <p className="mt-1.5 text-sm text-gray-200 leading-relaxed">{body}</p>
    </div>
  );
}

function DiffCard({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <div className="rounded-xl bg-white ring-1 ring-gray-200 p-6 shadow-sm">
      <div className="inline-flex items-center justify-center rounded-lg bg-gold/10 p-2.5 text-gold">
        {icon}
      </div>
      <h3 className="mt-4 font-heading text-lg font-semibold text-navy">{title}</h3>
      <p className="mt-2 text-sm text-gray-600 leading-relaxed">{body}</p>
    </div>
  );
}

function Step({ n, title, body }: { n: number; title: string; body: string }) {
  return (
    <li className="rounded-xl bg-white ring-1 ring-gray-200 p-6 shadow-sm">
      <div className="inline-flex h-9 w-9 items-center justify-center rounded-full gold-gradient text-white font-heading font-semibold text-base shadow-md shadow-gold/20">
        {n}
      </div>
      <h3 className="mt-4 font-heading text-lg font-semibold text-navy">{title}</h3>
      <p className="mt-2 text-sm text-gray-600 leading-relaxed">{body}</p>
    </li>
  );
}

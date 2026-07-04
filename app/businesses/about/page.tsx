import Link from "next/link";
import { ChevronLeft, HelpCircle, ArrowRight } from "lucide-react";

export const metadata = {
  title: "How it works — Gateway to Oman Marketplace",
};

export default function BusinessesAboutPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-10">
      <Link
        href="/businesses"
        className="inline-flex items-center gap-1 text-sm font-medium text-gray-500 hover:text-gold transition-colors"
      >
        <ChevronLeft className="h-4 w-4" />
        Back to overview
      </Link>

      <div className="mt-6">
        <p className="text-xs font-semibold uppercase tracking-wider text-gold">
          About the marketplace
        </p>
        <h1 className="mt-2 font-heading text-3xl sm:text-4xl font-semibold text-navy">
          How buying a business through Gateway to Oman actually works.
        </h1>
        <p className="mt-4 text-base text-gray-600 leading-relaxed">
          Short version: we screen the sellers, you pay a one-time fee to see
          the real numbers, we hand you off directly to the seller, and we stay
          available for the structuring questions that come up later. No retainer,
          no commission, no broker chain.
        </p>
      </div>

      <section className="mt-12 space-y-8">
        <Step
          n={1}
          title="Request access"
          body="Submit your details on the access form. Pay the one-time fee and our team activates your subscriber account within 24 hours."
        />
        <Step
          n={2}
          title="Browse all available listings"
          body="Full financials, ownership history, and contact paths unlocked. See the complete picture for every business in the marketplace."
        />
        <Step
          n={3}
          title="Consultation for acquiring"
          body="Found a business you want? Book a consultation with our team. We'll walk you through fit, due-diligence questions, and the negotiation approach."
        />
        <Step
          n={4}
          title="Close with structure support"
          body="When you&apos;re in serious negotiation, our team guides the CR transfer, licensing, and any ownership structuring you need."
        />
      </section>

      <section className="mt-16">
        <h2 className="font-heading text-2xl sm:text-3xl font-semibold text-navy">
          Common questions
        </h2>
        <div className="mt-6 space-y-3">
          <Faq
            q="What does the subscriber fee actually pay for?"
            a="Full marketplace access, one advisory call with our team to scope your search, the pre-purchase document checklist tailored to your target sector, and email updates as new listings match your criteria. It's a one-time fee — no subscription, no recurring charge."
          />
          <Faq
            q="Can a foreigner own a business in Oman?"
            a="In most sectors, yes — 100% foreign ownership has been allowed since 2019. Some sectors (defence, certain media, a few licensed activities) still require a local partner. We'll flag which category any listing you're interested in falls into before you go too far."
          />
          <Faq
            q="What about residency / investor visa?"
            a="Buying a business above certain thresholds qualifies you for an investor visa. Real estate ITCs (investment property) also carry a residency pathway. We can walk you through which path fits your situation during the advisory call."
          />
          <Faq
            q="What if I want to list my business?"
            a={
              <>
                The self-service seller portal is being built (target Phase 2).
                For now, if you&apos;d like to list a business directly, our team
                will handle it — see the{" "}
                <Link
                  href="/businesses/list-your-business"
                  className="text-gold hover:text-gold-dark font-semibold"
                >
                  List your business
                </Link>{" "}
                page or message us on WhatsApp.
              </>
            }
          />
        </div>
      </section>

      <section className="mt-16 rounded-2xl bg-navy text-white p-10 text-center">
        <HelpCircle className="mx-auto h-8 w-8 text-gold" />
        <h2 className="mt-4 font-heading text-2xl sm:text-3xl font-semibold">
          Still have a question?
        </h2>
        <p className="mt-3 text-base text-gray-300 max-w-xl mx-auto">
          Open the chat at the bottom of the page and Omar, our virtual marketplace
          guide, can usually help you find the answers you&apos;re looking for. If not, our team
          will follow up directly.
        </p>
        <Link
          href="/businesses/listings"
          className="mt-6 inline-flex items-center justify-center rounded-lg gold-gradient px-8 py-3.5 text-base font-semibold text-white shadow-lg shadow-gold/40 hover:shadow-xl transition-all"
        >
          Browse all listings
          <ArrowRight className="ml-2 h-4 w-4" />
        </Link>
      </section>
    </div>
  );
}

function Step({ n, title, body }: { n: number; title: string; body: string }) {
  return (
    <div className="flex items-start gap-5">
      <div className="inline-flex items-center justify-center rounded-full bg-gold/10 text-gold font-bold text-lg w-10 h-10 flex-shrink-0">
        {n}
      </div>
      <div>
        <h3 className="font-heading text-xl font-semibold text-navy">{title}</h3>
        <p className="mt-2 text-base text-gray-600 leading-relaxed">{body}</p>
      </div>
    </div>
  );
}

function Faq({ q, a }: { q: string; a: React.ReactNode }) {
  return (
    <details className="group rounded-xl bg-white ring-1 ring-gray-200 p-5 hover:ring-gold/40 transition-colors">
      <summary className="cursor-pointer flex items-center justify-between gap-4 font-semibold text-navy">
        <span>{q}</span>
        <span className="text-xl text-gray-400 group-open:rotate-45 transition-transform">+</span>
      </summary>
      <div className="mt-3 text-sm text-gray-600 leading-relaxed">{a}</div>
    </details>
  );
}

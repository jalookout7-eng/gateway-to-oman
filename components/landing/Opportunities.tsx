"use client";

import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { ScrollAnimationWrapper } from "./ScrollAnimationWrapper";
import { useChatModal } from "@/lib/context/ChatModalContext";

type OpportunityRouting =
  | { kind: "subdomain"; url: string }
  | { kind: "modal" }
  | { kind: "comingSoon" };

type Opportunity = {
  title: string;
  location: string;
  price: string;
  tag: string;
  photo: string;
  photoAlt: string;
  routing: OpportunityRouting;
};

const opportunities: Opportunity[] = [
  {
    title: "Businesses for Sale",
    location: "F&B, Services, Retail, Healthcare",
    price: "OMR 2.5K–200K",
    tag: "Acquisitions",
    photo:
      "https://images.pexels.com/photos/18331886/pexels-photo-18331886.jpeg?auto=compress&cs=tinysrgb&w=800&q=80",
    photoAlt: "Birds-eye aerial view of Muscat city, Oman",
    routing: { kind: "subdomain", url: "/businesses" },
  },
  {
    title: "Rehabilitation Center",
    location: "Al Khoudh, Muscat",
    price: "OMR 250,000",
    tag: "Healthcare",
    photo:
      "https://images.pexels.com/photos/30854646/pexels-photo-30854646.jpeg?auto=compress&cs=tinysrgb&w=800&q=80",
    photoAlt: "Elegant minaret architecture in Muscat, Oman",
    routing: { kind: "modal" },
  },
  {
    title: "Franchise Partnerships",
    location: "Oman & Saudi Arabia",
    price: "OMR 10K–500K",
    tag: "F&B / Retail",
    photo:
      "https://images.pexels.com/photos/30798982/pexels-photo-30798982.jpeg?auto=compress&cs=tinysrgb&w=800&q=80",
    photoAlt: "Scenic coastal road in Muscat, Oman",
    routing: { kind: "comingSoon" },
  },
  {
    title: "Real Estate ITCs",
    location: "Freehold + Residency",
    price: "From OMR 50K",
    tag: "Property",
    photo:
      "https://images.pexels.com/photos/31016040/pexels-photo-31016040.jpeg?auto=compress&cs=tinysrgb&w=800&q=80",
    photoAlt: "Lighthouse and coastal view in Muscat, Oman",
    routing: { kind: "comingSoon" },
  },
  {
    title: "Digital Banking",
    location: "CBO Licensed",
    price: "OMR 10M–30M",
    tag: "Fintech",
    photo:
      "https://images.pexels.com/photos/6801648/pexels-photo-6801648.jpeg?auto=compress&cs=tinysrgb&w=800&q=80",
    photoAlt: "Digital banking and fintech technology",
    routing: { kind: "comingSoon" },
  },
  {
    title: "Career Platform",
    location: "Register & Upload CV",
    price: "Free",
    tag: "Careers",
    photo:
      "https://images.pexels.com/photos/3184465/pexels-photo-3184465.jpeg?auto=compress&cs=tinysrgb&w=800&q=80",
    photoAlt: "Professional office environment",
    routing: { kind: "comingSoon" },
  },
];

export function Opportunities() {
  return (
    <section id="opportunities" className="py-24 px-6 bg-white scroll-mt-20">
      <div className="max-w-6xl mx-auto">
        <ScrollAnimationWrapper animation="fadeUp">
          <h2 className="text-4xl md:text-5xl font-bold text-navy text-center mb-4">
            Current <span className="text-gold">Opportunities</span>
          </h2>
          <p className="text-center text-gray-500 mb-16 max-w-2xl mx-auto">
            Verified investment and career opportunities available now.
          </p>
        </ScrollAnimationWrapper>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {opportunities.map((o, i) => (
            <ScrollAnimationWrapper key={o.title} animation="fadeUp" delay={i * 0.08}>
              <OpportunityCard opportunity={o} />
            </ScrollAnimationWrapper>
          ))}
        </div>
      </div>
    </section>
  );
}

function OpportunityCard({ opportunity }: { opportunity: Opportunity }) {
  const inner = <OpportunityCardInner opportunity={opportunity} />;
  const wrapperProps = {
    className:
      "block w-full text-left cursor-pointer bg-warm-white rounded-xl overflow-hidden border border-gold/10 hover:border-gold/30 transition-all flex flex-col",
    whileHover: { y: -8, boxShadow: "0 20px 40px rgba(201,155,60,0.12)" },
    transition: { type: "spring" as const, stiffness: 300, damping: 20 },
  };

  if (opportunity.routing.kind === "subdomain") {
    return (
      <motion.div {...wrapperProps}>
        <Link href={opportunity.routing.url} className="block">
          {inner}
        </Link>
      </motion.div>
    );
  }

  return <OpportunityCardButton opportunity={opportunity} wrapperProps={wrapperProps} inner={inner} />;
}

function OpportunityCardButton({
  opportunity,
  wrapperProps,
  inner,
}: {
  opportunity: Opportunity;
  wrapperProps: React.ComponentProps<typeof motion.button>;
  inner: React.ReactNode;
}) {
  const { openModal } = useChatModal();
  return (
    <motion.button
      {...wrapperProps}
      onClick={() => openModal({ intent: "opportunity", topic: opportunity.title })}
    >
      {inner}
    </motion.button>
  );
}

function OpportunityCardInner({ opportunity: o }: { opportunity: Opportunity }) {
  const isLive = o.routing.kind === "subdomain";
  // Notes 3 item 5: "Coming Soon" is gone — every non-marketplace card now
  // invites the visitor to start a conversation with Omar, which is the
  // intended first sign of intent. The card click still passes the title
  // to Omar as topic context (see OpportunityCardButton above), so Omar
  // opens with the right qualifying question for that vertical.
  const showChatPill = o.routing.kind === "modal" || o.routing.kind === "comingSoon";
  return (
    <>
      <div className="relative h-44 w-full flex-shrink-0">
        <Image
          src={o.photo}
          alt={o.photoAlt}
          fill
          className="object-cover"
          sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
        />
        <div className="absolute inset-0 bg-navy/20" />
        <span className="absolute top-3 left-3 inline-block px-3 py-1 bg-gold text-white text-xs font-semibold rounded-full shadow">
          {o.tag}
        </span>
        {isLive && (
          <span className="absolute top-3 right-3 inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-500 text-white text-xs font-semibold rounded-full shadow">
            <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
            Live
          </span>
        )}
      </div>

      <div className="p-6 flex-1">
        <h3 className="text-lg font-bold text-navy mb-1">{o.title}</h3>
        <p className="text-sm text-gray-500 mb-4">{o.location}</p>
        <p className="text-2xl font-bold text-gold">{o.price}</p>
        {showChatPill && (
          <p className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-gold">
            Click for more details
            <ArrowRight className="h-3 w-3" />
          </p>
        )}
      </div>
    </>
  );
}

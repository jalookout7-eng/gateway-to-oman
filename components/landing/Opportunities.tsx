"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { ScrollAnimationWrapper } from "./ScrollAnimationWrapper";

const opportunities = [
  {
    title: "Rehabilitation Center",
    location: "Al Khoudh, Muscat",
    price: "OMR 250,000",
    tag: "Healthcare",
    photo: "https://images.pexels.com/photos/30854646/pexels-photo-30854646.jpeg?auto=compress&cs=tinysrgb&w=800&q=80",
    photoAlt: "Elegant minaret architecture in Muscat, Oman",
  },
  {
    title: "Franchise Partnerships",
    location: "Oman & Saudi Arabia",
    price: "OMR 10K–500K",
    tag: "F&B / Retail",
    photo: "https://images.pexels.com/photos/30798982/pexels-photo-30798982.jpeg?auto=compress&cs=tinysrgb&w=800&q=80",
    photoAlt: "Scenic coastal road in Muscat, Oman",
  },
  {
    title: "Real Estate ITCs",
    location: "Freehold + Residency",
    price: "From OMR 50K",
    tag: "Property",
    photo: "https://images.pexels.com/photos/31016040/pexels-photo-31016040.jpeg?auto=compress&cs=tinysrgb&w=800&q=80",
    photoAlt: "Lighthouse and coastal view in Muscat, Oman",
  },
  {
    title: "Businesses for Sale",
    location: "F&B, Services, Retail, Healthcare",
    price: "OMR 2.5K–200K",
    tag: "Acquisitions",
    photo: "https://images.pexels.com/photos/18331886/pexels-photo-18331886.jpeg?auto=compress&cs=tinysrgb&w=800&q=80",
    photoAlt: "Birds-eye aerial view of Muscat city, Oman",
  },
  {
    title: "Digital Banking",
    location: "CBO Licensed",
    price: "OMR 10M–30M",
    tag: "Fintech",
    photo: "https://images.pexels.com/photos/18331886/pexels-photo-18331886.jpeg?auto=compress&cs=tinysrgb&w=800&q=80",
    photoAlt: "Muscat city skyline, Oman",
  },
  {
    title: "Career Platform",
    location: "Register & Upload CV",
    price: "Free",
    tag: "Careers",
    photo: "https://images.pexels.com/photos/19786029/pexels-photo-19786029.jpeg?auto=compress&cs=tinysrgb&w=800&q=80",
    photoAlt: "Fort Bahla historic landmark in Oman",
  },
];

export function Opportunities() {
  return (
    <section id="opportunities" className="py-24 px-6 bg-white">
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
            <ScrollAnimationWrapper
              key={o.title}
              animation="fadeUp"
              delay={i * 0.08}
            >
              <motion.div
                className="bg-warm-white rounded-xl overflow-hidden border border-gold/10 hover:border-gold/30 transition-all flex flex-col"
                whileHover={{ y: -8, boxShadow: "0 20px 40px rgba(201,155,60,0.12)" }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
              >
                {/* Photo header with tag overlay */}
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
                </div>

                {/* Card body */}
                <div className="p-6 flex-1">
                  <h3 className="text-lg font-bold text-navy mb-1">{o.title}</h3>
                  <p className="text-sm text-gray-500 mb-4">{o.location}</p>
                  <p className="text-2xl font-bold text-gold">{o.price}</p>
                </div>
              </motion.div>
            </ScrollAnimationWrapper>
          ))}
        </div>
      </div>
    </section>
  );
}

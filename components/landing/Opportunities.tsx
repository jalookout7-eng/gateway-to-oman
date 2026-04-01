"use client";

import { motion } from "framer-motion";
import { ScrollAnimationWrapper } from "./ScrollAnimationWrapper";

const opportunities = [
  {
    title: "Rehabilitation Center",
    location: "Al Khoudh, Muscat",
    price: "OMR 250,000",
    tag: "Healthcare",
  },
  {
    title: "Franchise Partnerships",
    location: "Oman & Saudi Arabia",
    price: "OMR 10K–500K",
    tag: "F&B / Retail",
  },
  {
    title: "Real Estate ITCs",
    location: "Freehold + Residency",
    price: "From OMR 50K",
    tag: "Property",
  },
  {
    title: "Businesses for Sale",
    location: "F&B, Services, Retail, Healthcare",
    price: "OMR 2.5K–200K",
    tag: "Acquisitions",
  },
  {
    title: "Digital Banking",
    location: "CBO Licensed",
    price: "OMR 10M–30M",
    tag: "Fintech",
  },
  {
    title: "Career Platform",
    location: "Register & Upload CV",
    price: "Free",
    tag: "Careers",
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
                className="bg-warm-white rounded-xl p-6 border border-gold/10 hover:border-gold/30 transition-all"
                whileHover={{ y: -8, boxShadow: "0 20px 40px rgba(201,155,60,0.12)" }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
              >
                <span className="inline-block px-3 py-1 bg-gold/10 text-gold text-xs font-medium rounded-full mb-4">
                  {o.tag}
                </span>
                <h3 className="text-lg font-bold text-navy mb-1">{o.title}</h3>
                <p className="text-sm text-gray-500 mb-4">{o.location}</p>
                <p className="text-2xl font-bold text-gold">{o.price}</p>
              </motion.div>
            </ScrollAnimationWrapper>
          ))}
        </div>
      </div>
    </section>
  );
}

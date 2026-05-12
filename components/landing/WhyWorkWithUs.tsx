"use client";

import { motion } from "framer-motion";
import { Target, Handshake, BadgeCheck, Star } from "lucide-react";
import { ScrollAnimationWrapper } from "./ScrollAnimationWrapper";
import type { LucideIcon } from "lucide-react";

const reasons: { title: string; desc: string; Icon: LucideIcon }[] = [
  {
    title: "Local Expertise, Global Mindset",
    desc: "Backed by 26 years of experience in Oman's telecom and legal sectors — long-standing local relationships, not parachute consultants.",
    Icon: Target,
  },
  {
    title: "End-to-End Support",
    desc: "From your first exploratory visit to full business setup and beyond. We're with you at every step.",
    Icon: Handshake,
  },
  {
    title: "Verified Network",
    desc: "Pre-vetted partners, angel investors, and family offices. No gatekeepers — direct introductions.",
    Icon: BadgeCheck,
  },
  {
    title: "Values-Aligned",
    desc: "We operate at the intersection of Islamic values and international business standards.",
    Icon: Star,
  },
];

export function WhyWorkWithUs() {
  return (
    <section id="why-us" className="py-24 px-6 bg-warm-white">
      <div className="max-w-6xl mx-auto">
        <ScrollAnimationWrapper animation="fadeUp">
          <h2 className="text-4xl md:text-5xl font-bold text-navy text-center mb-16">
            Why <span className="text-gold">Work With Us</span>
          </h2>
        </ScrollAnimationWrapper>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {reasons.map((r, i) => (
            <ScrollAnimationWrapper
              key={r.title}
              animation="fadeUp"
              delay={i * 0.1}
            >
              <motion.div
                className="h-full bg-white rounded-xl border-t-4 border-gold shadow-md p-6 text-center flex flex-col items-center"
                whileHover={{
                  y: -6,
                  boxShadow: "0 20px 40px rgba(201, 155, 60, 0.15)",
                }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
              >
                <div className="w-14 h-14 rounded-full gold-gradient flex items-center justify-center mb-4 shadow-md shadow-gold/20">
                  <r.Icon className="w-6 h-6 text-white" strokeWidth={1.5} />
                </div>
                <h3 className="text-lg font-bold text-navy mb-2 font-heading">
                  {r.title}
                </h3>
                <p className="text-sm text-gray-600 leading-relaxed font-body">
                  {r.desc}
                </p>
              </motion.div>
            </ScrollAnimationWrapper>
          ))}
        </div>
      </div>
    </section>
  );
}

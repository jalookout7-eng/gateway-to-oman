"use client";

import { Map, Package, LineChart, Home } from "lucide-react";
import { ScrollAnimationWrapper } from "./ScrollAnimationWrapper";
import type { LucideIcon } from "lucide-react";

const services: { num: string; title: string; desc: string; Icon: LucideIcon }[] = [
  {
    num: "01",
    title: "Market Exploration Trips",
    desc: "2–5 day scouting visits to experience Oman firsthand. Meet potential partners, tour facilities, and understand the market before committing.",
    Icon: Map,
  },
  {
    num: "02",
    title: "Soft Landing Package",
    desc: "Turn-key business setup — company registration, licensing, office space, banking, and visa processing. We handle the bureaucracy.",
    Icon: Package,
  },
  {
    num: "03",
    title: "Expansion Advisory",
    desc: "Strategic growth guidance for established businesses. Market analysis, partnership facilitation, and scaling support.",
    Icon: LineChart,
  },
  {
    num: "04",
    title: "Investor Residency",
    desc: "Multiple residency pathways through investment — real estate, business ownership, or retirement visa programs.",
    Icon: Home,
  },
];

export function CoreServices() {
  return (
    <section id="services" className="py-24 px-6 bg-warm-white">
      <div className="max-w-6xl mx-auto">
        <ScrollAnimationWrapper animation="fadeUp">
          <h2 className="text-4xl md:text-5xl font-bold text-navy text-center mb-16 font-heading">
            How We <span className="text-gold">Work</span>
          </h2>
        </ScrollAnimationWrapper>

        <div className="space-y-6">
          {services.map((s, i) => (
            <ScrollAnimationWrapper
              key={s.num}
              animation={i % 2 === 0 ? "slideLeft" : "slideRight"}
              delay={0.1}
            >
              <div className="flex items-start gap-6 bg-white rounded-xl p-8 shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 group">
                {/* Step number */}
                <div className="flex-shrink-0 w-16 h-16 rounded-full gold-gradient flex items-center justify-center text-white font-bold text-xl font-heading shadow-md shadow-gold/25">
                  {s.num}
                </div>
                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    <s.Icon className="w-5 h-5 text-gold flex-shrink-0" strokeWidth={1.5} />
                    <h3 className="text-xl font-bold text-navy font-heading">
                      {s.title}
                    </h3>
                  </div>
                  <p className="text-gray-600 leading-relaxed font-body">{s.desc}</p>
                </div>
              </div>
            </ScrollAnimationWrapper>
          ))}
        </div>
      </div>
    </section>
  );
}

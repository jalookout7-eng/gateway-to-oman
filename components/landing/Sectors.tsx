"use client";

import { ScrollAnimationWrapper } from "./ScrollAnimationWrapper";

const sectors = [
  "Fintech & Digital Banking",
  "Healthcare & Medical Tourism",
  "Logistics & Supply Chain",
  "Green Energy & Sustainability",
  "AI & PropTech",
  "Tourism & Hospitality",
];

export function Sectors() {
  return (
    <section id="sectors" className="py-24 px-6 bg-warm-white">
      <div className="max-w-6xl mx-auto">
        <ScrollAnimationWrapper animation="fadeUp">
          <h2 className="text-4xl md:text-5xl font-bold text-navy text-center mb-4">
            Emerging High-Growth Sectors
          </h2>
          <p className="text-center text-gray-500 mb-12 max-w-2xl mx-auto">
            Oman&apos;s diversification strategy is creating opportunities
            across these key industries.
          </p>
        </ScrollAnimationWrapper>

        <div className="flex flex-wrap justify-center gap-4">
          {sectors.map((sector, i) => (
            <ScrollAnimationWrapper
              key={sector}
              animation="scaleIn"
              delay={i * 0.08}
            >
              <span className="inline-block px-6 py-3 bg-warm-cream text-navy font-medium rounded-full border border-gold/20 hover:border-gold hover:shadow-md hover:shadow-gold/10 transition-all cursor-default text-sm md:text-base">
                {sector}
              </span>
            </ScrollAnimationWrapper>
          ))}
        </div>
      </div>
    </section>
  );
}

"use client";

import { ScrollAnimationWrapper } from "./ScrollAnimationWrapper";
import {
  Landmark,
  HeartPulse,
  Truck,
  Leaf,
  BrainCircuit,
  Hotel,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

const sectors: { name: string; Icon: LucideIcon }[] = [
  { name: "Fintech & Digital Banking", Icon: Landmark },
  { name: "Healthcare & Medical Tourism", Icon: HeartPulse },
  { name: "Logistics & Supply Chain", Icon: Truck },
  { name: "Green Energy & Sustainability", Icon: Leaf },
  { name: "AI & PropTech", Icon: BrainCircuit },
  { name: "Tourism & Hospitality", Icon: Hotel },
];

export function Sectors() {
  return (
    <section id="sectors" className="py-24 px-6 bg-warm-white">
      <div className="max-w-6xl mx-auto">
        <ScrollAnimationWrapper animation="fadeUp">
          <h2 className="text-4xl md:text-5xl font-bold text-navy text-center mb-4 font-heading">
            Emerging High-Growth Sectors
          </h2>
          <p className="text-center text-gray-500 mb-12 max-w-2xl mx-auto font-body leading-relaxed">
            Oman&apos;s diversification strategy is creating opportunities
            across these key industries.
          </p>
        </ScrollAnimationWrapper>

        <div className="flex flex-wrap justify-center gap-4">
          {sectors.map((sector, i) => (
            <ScrollAnimationWrapper
              key={sector.name}
              animation="scaleIn"
              delay={i * 0.08}
            >
              <span className="inline-flex items-center gap-2.5 px-6 py-3 bg-white text-navy font-medium rounded-full border border-gold/20 hover:border-gold hover:shadow-md hover:shadow-gold/10 hover:-translate-y-0.5 transition-all duration-200 cursor-default text-sm md:text-base font-body">
                <sector.Icon className="w-4 h-4 text-gold flex-shrink-0" strokeWidth={1.5} />
                {sector.name}
              </span>
            </ScrollAnimationWrapper>
          ))}
        </div>
      </div>
    </section>
  );
}

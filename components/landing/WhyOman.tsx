"use client";

import { Card } from "@/components/ui/Card";
import { ScrollAnimationWrapper } from "./ScrollAnimationWrapper";

const reasons = [
  {
    title: "Strategic Position",
    desc: "Gateway to the GCC, East Africa & South Asia. A 2-hour flight connects you to 2 billion consumers.",
    icon: "🌍",
  },
  {
    title: "Pro-Business Environment",
    desc: "0% corporate tax for 5 years, 100% foreign ownership, and digital banking licenses available.",
    icon: "📈",
  },
  {
    title: "Values & Stability",
    desc: "Halal-first economy, political neutrality, and a robust Islamic finance ecosystem.",
    icon: "🕌",
  },
  {
    title: "Quality of Life",
    desc: "Affordable, safe, and family-friendly. One of the most welcoming nations in the Gulf.",
    icon: "🏡",
  },
];

export function WhyOman() {
  return (
    <section id="why-oman" className="py-24 px-6 bg-white">
      <div className="max-w-6xl mx-auto">
        <ScrollAnimationWrapper animation="fadeUp">
          <h2 className="text-4xl md:text-5xl font-bold text-navy text-center mb-4">
            Why Oman?
          </h2>
          <p className="text-center text-gray-500 mb-16 max-w-2xl mx-auto">
            While the world focuses on saturated markets, Oman offers something
            rare — a strategic, values-aligned gateway with room to grow.
          </p>
        </ScrollAnimationWrapper>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {reasons.map((r, i) => (
            <ScrollAnimationWrapper
              key={r.title}
              animation="flipIn"
              delay={i * 0.1}
            >
              <Card hover3d className="h-full text-center">
                <div className="text-4xl mb-4">{r.icon}</div>
                <h3 className="text-lg font-bold text-navy mb-2">{r.title}</h3>
                <p className="text-sm text-gray-600 leading-relaxed">
                  {r.desc}
                </p>
              </Card>
            </ScrollAnimationWrapper>
          ))}
        </div>
      </div>
    </section>
  );
}

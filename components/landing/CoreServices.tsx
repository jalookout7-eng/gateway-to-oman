"use client";

import { ScrollAnimationWrapper } from "./ScrollAnimationWrapper";

const services = [
  {
    num: "01",
    title: "Market Exploration Trips",
    desc: "2–5 day scouting visits to experience Oman firsthand. Meet potential partners, tour facilities, and understand the market before committing.",
  },
  {
    num: "02",
    title: "Soft Landing Package",
    desc: "Turn-key business setup — company registration, licensing, office space, banking, and visa processing. We handle the bureaucracy.",
  },
  {
    num: "03",
    title: "Expansion Advisory",
    desc: "Strategic growth guidance for established businesses. Market analysis, partnership facilitation, and scaling support.",
  },
  {
    num: "04",
    title: "Investor Residency",
    desc: "Multiple residency pathways through investment — real estate, business ownership, or retirement visa programs.",
  },
];

export function CoreServices() {
  return (
    <section id="services" className="py-24 px-6 bg-warm-white">
      <div className="max-w-6xl mx-auto">
        <ScrollAnimationWrapper animation="fadeUp">
          <h2 className="text-4xl md:text-5xl font-bold text-navy text-center mb-16">
            How We <span className="text-gold">Work</span>
          </h2>
        </ScrollAnimationWrapper>

        <div className="space-y-8">
          {services.map((s, i) => (
            <ScrollAnimationWrapper
              key={s.num}
              animation={i % 2 === 0 ? "slideLeft" : "slideRight"}
              delay={0.1}
            >
              <div className="flex items-start gap-6 bg-white rounded-xl p-8 shadow-md hover:shadow-lg transition-shadow">
                <div className="flex-shrink-0 w-16 h-16 rounded-full gold-gradient flex items-center justify-center text-white font-bold text-xl">
                  {s.num}
                </div>
                <div>
                  <h3 className="text-xl font-bold text-navy mb-2">
                    {s.title}
                  </h3>
                  <p className="text-gray-600 leading-relaxed">{s.desc}</p>
                </div>
              </div>
            </ScrollAnimationWrapper>
          ))}
        </div>
      </div>
    </section>
  );
}

"use client";

import { Card } from "@/components/ui/Card";
import { ScrollAnimationWrapper } from "./ScrollAnimationWrapper";

const reasons = [
  {
    title: "Local Expertise, Global Mindset",
    desc: "Founded by Ahmed Al-Azizi with 26 years of experience in Oman's telecom and legal sectors.",
    icon: "🎯",
  },
  {
    title: "End-to-End Support",
    desc: "From your first exploratory visit to full business setup and beyond. We're with you at every step.",
    icon: "🤝",
  },
  {
    title: "Verified Network",
    desc: "Pre-vetted partners, angel investors, and family offices. No gatekeepers — direct introductions.",
    icon: "✅",
  },
  {
    title: "Values-Aligned",
    desc: "We operate at the intersection of Islamic values and international business standards.",
    icon: "⭐",
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
              <Card className="h-full text-center">
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

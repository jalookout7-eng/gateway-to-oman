"use client";

import { Card } from "@/components/ui/Card";
import { ScrollAnimationWrapper } from "./ScrollAnimationWrapper";

const segments = [
  {
    title: "Entrepreneurs & Startups",
    desc: "Business setup, licensing, market entry strategy, and partner matching. From idea to incorporation.",
    icon: "🚀",
  },
  {
    title: "Investors",
    desc: "Acquisitions from OMR 10K–500K, real estate with residency pathways, and franchise partnerships.",
    icon: "💰",
  },
  {
    title: "Professionals",
    desc: "Job matching, CV optimization, work visa guidance, and career development in Oman's growing economy.",
    icon: "💼",
  },
  {
    title: "Retirees & Families",
    desc: "Retirement visa guidance, property search, healthcare access, and community integration.",
    icon: "👨‍👩‍👧‍👦",
  },
];

export function WhoWeHelp() {
  return (
    <section id="who-we-help" className="py-24 px-6 bg-white">
      <div className="max-w-6xl mx-auto">
        <ScrollAnimationWrapper animation="fadeUp">
          <h2 className="text-4xl md:text-5xl font-bold text-navy text-center mb-4">
            Who We Help
          </h2>
          <p className="text-center text-gray-500 mb-16 max-w-2xl mx-auto">
            Whether you&apos;re building, investing, working, or settling — we
            have a pathway for you.
          </p>
        </ScrollAnimationWrapper>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {segments.map((s, i) => (
            <ScrollAnimationWrapper
              key={s.title}
              animation="fadeUp"
              delay={i * 0.1}
            >
              <Card hover3d className="h-full text-center">
                <div className="text-4xl mb-4">{s.icon}</div>
                <h3 className="text-lg font-bold text-navy mb-2">{s.title}</h3>
                <p className="text-sm text-gray-600 leading-relaxed">
                  {s.desc}
                </p>
              </Card>
            </ScrollAnimationWrapper>
          ))}
        </div>
      </div>
    </section>
  );
}

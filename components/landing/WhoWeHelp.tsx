"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { ScrollAnimationWrapper } from "./ScrollAnimationWrapper";

const segments = [
  {
    title: "Entrepreneurs & Startups",
    desc: "Business setup, licensing, market entry strategy, and partner matching. From idea to incorporation.",
    icon: "🚀",
    photo: "https://images.pexels.com/photos/30798982/pexels-photo-30798982.jpeg?auto=compress&cs=tinysrgb&w=800&q=80",
    photoAlt: "Modern coastal road in Muscat, Oman",
  },
  {
    title: "Investors",
    desc: "Acquisitions from OMR 10K–500K, real estate with residency pathways, and franchise partnerships.",
    icon: "💰",
    photo: "https://images.pexels.com/photos/18331886/pexels-photo-18331886.jpeg?auto=compress&cs=tinysrgb&w=800&q=80",
    photoAlt: "Aerial birds-eye view of Muscat, Oman",
  },
  {
    title: "Professionals",
    desc: "Job matching, CV optimization, work visa guidance, and career development in Oman's growing economy.",
    icon: "💼",
    photo: "https://images.pexels.com/photos/30854646/pexels-photo-30854646.jpeg?auto=compress&cs=tinysrgb&w=800&q=80",
    photoAlt: "Beautiful minaret architecture in Muscat, Oman",
  },
  {
    title: "Retirees & Families",
    desc: "Retirement visa guidance, property search, healthcare access, and community integration.",
    icon: "👨‍👩‍👧‍👦",
    photo: "https://images.pexels.com/photos/31159571/pexels-photo-31159571.jpeg?auto=compress&cs=tinysrgb&w=800&q=80",
    photoAlt: "Stunning Snake Canyon natural beauty in Oman",
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
              <motion.div
                className="h-full rounded-xl border-t-4 border-gold shadow-md overflow-hidden bg-white flex flex-col"
                whileHover={{
                  rotateY: 5,
                  rotateX: -5,
                  scale: 1.02,
                  boxShadow: "0 20px 40px rgba(201, 155, 60, 0.15)",
                }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
                style={{ transformPerspective: 1000 }}
              >
                {/* Photo header */}
                <div className="relative h-44 w-full flex-shrink-0">
                  <Image
                    src={s.photo}
                    alt={s.photoAlt}
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 100vw, 25vw"
                  />
                  <div className="absolute inset-0 bg-navy/35" />
                  <div className="absolute inset-0 flex items-center justify-center text-5xl drop-shadow-lg">
                    {s.icon}
                  </div>
                </div>

                {/* Text content */}
                <div className="p-5 text-center flex-1">
                  <h3 className="text-lg font-bold text-navy mb-2">
                    {s.title}
                  </h3>
                  <p className="text-sm text-gray-600 leading-relaxed">
                    {s.desc}
                  </p>
                </div>
              </motion.div>
            </ScrollAnimationWrapper>
          ))}
        </div>
      </div>
    </section>
  );
}

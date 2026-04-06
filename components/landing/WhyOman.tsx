"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { Globe, BarChart3, Building2, Sunrise } from "lucide-react";
import { ScrollAnimationWrapper } from "./ScrollAnimationWrapper";
import type { LucideIcon } from "lucide-react";

const reasons: {
  title: string;
  desc: string;
  Icon: LucideIcon;
  photo: string;
  photoAlt: string;
}[] = [
  {
    title: "Strategic Position",
    desc: "Gateway to the GCC, East Africa & South Asia. A 2-hour flight connects you to 2 billion consumers.",
    Icon: Globe,
    photo: "https://images.pexels.com/photos/18331886/pexels-photo-18331886.jpeg?auto=compress&cs=tinysrgb&w=800&q=80",
    photoAlt: "Aerial view of Muscat showing Oman's strategic coastal position",
  },
  {
    title: "Pro-Business Environment",
    desc: "0% corporate tax for 5 years, 100% foreign ownership, and digital banking licenses available.",
    Icon: BarChart3,
    photo: "https://images.pexels.com/photos/30798982/pexels-photo-30798982.jpeg?auto=compress&cs=tinysrgb&w=800&q=80",
    photoAlt: "Scenic modern coastal road in Muscat, Oman",
  },
  {
    title: "Values & Stability",
    desc: "Halal-first economy, political neutrality, and a robust Islamic finance ecosystem.",
    Icon: Building2,
    photo: "https://images.pexels.com/photos/20396304/pexels-photo-20396304.jpeg?auto=compress&cs=tinysrgb&w=800&q=80",
    photoAlt: "Sultan Qaboos Grand Mosque, Muscat, Oman",
  },
  {
    title: "Quality of Life",
    desc: "Affordable, safe, and family-friendly. One of the most welcoming nations in the Gulf.",
    Icon: Sunrise,
    photo: "https://images.pexels.com/photos/31159570/pexels-photo-31159570.jpeg?auto=compress&cs=tinysrgb&w=800&q=80",
    photoAlt: "Breathtaking Snake Canyon natural scenery in Oman",
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
          <p className="text-center text-gray-500 mb-16 max-w-2xl mx-auto text-base leading-relaxed font-body">
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
              <motion.div
                className="h-full rounded-xl border-t-4 border-gold shadow-md overflow-hidden bg-white flex flex-col"
                whileHover={{
                  y: -6,
                  boxShadow: "0 20px 40px rgba(201, 155, 60, 0.15)",
                }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
              >
                {/* Photo header with icon overlay */}
                <div className="relative h-44 w-full flex-shrink-0">
                  <Image
                    src={r.photo}
                    alt={r.photoAlt}
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 100vw, 25vw"
                  />
                  <div className="absolute inset-0 bg-navy/45" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-16 h-16 rounded-full bg-gold/20 border-2 border-gold/60 flex items-center justify-center backdrop-blur-sm">
                      <r.Icon className="w-8 h-8 text-white" strokeWidth={1.5} />
                    </div>
                  </div>
                </div>

                {/* Text content */}
                <div className="p-5 text-center flex-1">
                  <h3 className="text-lg font-bold text-navy mb-2 font-heading">
                    {r.title}
                  </h3>
                  <p className="text-sm text-gray-600 leading-relaxed font-body">
                    {r.desc}
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

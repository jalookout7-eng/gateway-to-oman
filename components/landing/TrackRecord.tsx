"use client";

import { motion, useInView, useMotionValue, useTransform, animate } from "framer-motion";
import { useRef, useEffect } from "react";
import { Users, Building2, CircleDollarSign, Globe } from "lucide-react";
import type { LucideIcon } from "lucide-react";

function AnimatedCounter({ target, suffix = "" }: { target: number; suffix?: string }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true });
  const count = useMotionValue(0);
  const rounded = useTransform(count, (v) => Math.round(v));

  useEffect(() => {
    if (isInView) {
      animate(count, target, { duration: 2, ease: "easeOut" });
    }
  }, [isInView, count, target]);

  return (
    <span ref={ref}>
      <motion.span>{rounded}</motion.span>
      {suffix}
    </span>
  );
}

const stats: { label: string; value: number; suffix: string; Icon: LucideIcon }[] = [
  { label: "Founders & Families Guided", value: 150, suffix: "+", Icon: Users },
  { label: "Startups Successfully Landed", value: 45, suffix: "+", Icon: Building2 },
  { label: "OMR Investments Facilitated", value: 12, suffix: "M+", Icon: CircleDollarSign },
  { label: "Active Community Members", value: 500, suffix: "+", Icon: Globe },
];

export function TrackRecord() {
  return (
    <section id="track-record" className="py-24 px-6 bg-navy text-white">
      <div className="max-w-6xl mx-auto">
        <h2 className="text-4xl md:text-5xl font-bold text-center mb-16 font-heading">
          Our <span className="text-gold">Track Record</span>
        </h2>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 text-center">
          {stats.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className="flex flex-col items-center gap-3"
            >
              <div className="w-12 h-12 rounded-full border border-gold/30 flex items-center justify-center mb-1">
                <stat.Icon className="w-5 h-5 text-gold" strokeWidth={1.5} />
              </div>
              <div className="text-4xl md:text-5xl font-bold text-gold font-heading tabular-nums">
                <AnimatedCounter target={stat.value} suffix={stat.suffix} />
              </div>
              <p className="text-sm text-gray-300 font-body leading-snug max-w-[140px] mx-auto">
                {stat.label}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/Button";
import { ShieldCheck, Users, Star } from "lucide-react";
import { useEffect, useState } from "react";
import { useChatModal } from "@/lib/context/ChatModalContext";

function GoldParticles() {
  const [particles, setParticles] = useState<
    { id: number; x: number; y: number; size: number; delay: number }[]
  >([]);

  useEffect(() => {
    setParticles(
      Array.from({ length: 24 }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: Math.random() * 3 + 1,
        delay: Math.random() * 5,
      }))
    );
  }, []);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {particles.map((p) => (
        <motion.div
          key={p.id}
          className="absolute rounded-full bg-gold/25"
          style={{ left: `${p.x}%`, top: `${p.y}%`, width: p.size, height: p.size }}
          animate={{ y: [0, -28, 0], opacity: [0.2, 0.5, 0.2] }}
          transition={{ duration: 4 + Math.random() * 3, repeat: Infinity, delay: p.delay, ease: "easeInOut" }}
        />
      ))}
    </div>
  );
}

const trustBadges = [
  { Icon: Users, label: "150+ Families Guided" },
  { Icon: ShieldCheck, label: "Verified Opportunities" },
  { Icon: Star, label: "26 Years Local Expertise" },
];

export function Hero() {
  const { openModal } = useChatModal();
  return (
    <section id="hero" className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Background photo — Sultan Qaboos Grand Mosque */}
      <div className="absolute inset-0">
        <Image
          src="/hero-muscat.png"
          alt="Sultan Qaboos Grand Mosque, Muscat, Oman"
          fill
          className="object-cover object-center"
          priority
        />
      </div>

      {/* Overlay — 25% opacity lets 75% of the image show through */}
      <div className="absolute inset-0 bg-navy/25" />

      <GoldParticles />

      <div className="relative z-10 text-center px-6 max-w-4xl mx-auto">
        {/* Eyebrow label */}
        <motion.div
          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-gold/40 bg-gold/10 text-gold text-sm font-body font-medium mb-8"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
        >
          <Star className="w-3.5 h-3.5" strokeWidth={1.5} />
          Strategic Advisory for Oman Opportunities
        </motion.div>

        <motion.h1
          className="text-5xl md:text-7xl font-bold text-white drop-shadow-lg mb-6 leading-tight font-heading"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
        >
          Your Strategic Bridge to{" "}
          <span className="text-transparent bg-clip-text gold-gradient">
            Opportunity in Oman
          </span>
        </motion.h1>

        <motion.blockquote
          className="text-lg md:text-xl text-gray-300 italic mb-10 max-w-2xl mx-auto font-body leading-relaxed"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.5 }}
        >
          &ldquo;If you had gone to the people of Oman, they would not have
          insulted or beaten you.&rdquo;
          <span className="block text-sm text-gold mt-2 not-italic font-medium">
            — Prophet Muhammad (Sahih Muslim 2544)
          </span>
        </motion.blockquote>

        <motion.div
          className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.8 }}
        >
          <Button size="lg" variant="gold">
            Explore Your Opportunity
          </Button>
          <Button size="lg" variant="outline" onClick={() => openModal({ intent: "consultation" })}>
            Book Free Consultation
          </Button>
        </motion.div>

        {/* Trust badges */}
        <motion.div
          className="flex flex-wrap items-center justify-center gap-4 gap-y-3"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 1.1 }}
        >
          {trustBadges.map(({ Icon, label }) => (
            <div key={label} className="flex items-center gap-2 text-gray-400 text-sm font-body">
              <Icon className="w-4 h-4 text-gold" strokeWidth={1.5} />
              <span>{label}</span>
            </div>
          ))}
        </motion.div>
      </div>

      {/* Scroll indicator */}
      <motion.div
        className="absolute bottom-8 left-1/2 -translate-x-1/2"
        animate={{ y: [0, 10, 0] }}
        transition={{ duration: 2, repeat: Infinity }}
      >
        <div className="w-6 h-10 rounded-full border-2 border-gold/40 flex items-start justify-center p-1">
          <motion.div
            className="w-1.5 h-3 rounded-full bg-gold"
            animate={{ y: [0, 12, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
        </div>
      </motion.div>
    </section>
  );
}

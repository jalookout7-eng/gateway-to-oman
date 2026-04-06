"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/Button";
import { useEffect, useState } from "react";

function GoldParticles() {
  const [particles, setParticles] = useState<
    { id: number; x: number; y: number; size: number; delay: number }[]
  >([]);

  useEffect(() => {
    setParticles(
      Array.from({ length: 30 }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: Math.random() * 4 + 1,
        delay: Math.random() * 5,
      }))
    );
  }, []);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {particles.map((p) => (
        <motion.div
          key={p.id}
          className="absolute rounded-full bg-gold/30"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: p.size,
            height: p.size,
          }}
          animate={{
            y: [0, -30, 0],
            opacity: [0.2, 0.6, 0.2],
          }}
          transition={{
            duration: 4 + Math.random() * 3,
            repeat: Infinity,
            delay: p.delay,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  );
}

export function Hero() {
  return (
    <section
      id="hero"
      className="relative min-h-screen flex items-center justify-center overflow-hidden"
    >
      {/* Background photo — aerial Muscat */}
      <div className="absolute inset-0">
        <Image
          src="https://images.pexels.com/photos/18331886/pexels-photo-18331886.jpeg?auto=compress&cs=tinysrgb&w=1920&q=80"
          alt="Aerial view of Muscat, Oman"
          fill
          className="object-cover object-center"
          priority
        />
      </div>

      {/* Dark navy overlay so text stays legible */}
      <div className="absolute inset-0 bg-gradient-to-br from-navy/92 via-navy/82 to-navy/92" />

      <GoldParticles />

      <div className="relative z-10 text-center px-6 max-w-4xl mx-auto">
        <motion.h1
          className="text-5xl md:text-7xl font-bold text-white mb-6 leading-tight"
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
          className="text-lg md:text-xl text-gray-300 italic mb-10 max-w-2xl mx-auto"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.5 }}
        >
          &ldquo;If you had gone to the people of Oman, they would not have
          insulted or beaten you.&rdquo;
          <span className="block text-sm text-gold mt-2 not-italic">
            — Prophet Muhammad (Sahih Muslim 2544)
          </span>
        </motion.blockquote>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.8 }}
        >
          <Button size="lg" variant="gold">
            Explore Your Opportunity
          </Button>
        </motion.div>
      </div>

      <motion.div
        className="absolute bottom-8 left-1/2 -translate-x-1/2"
        animate={{ y: [0, 10, 0] }}
        transition={{ duration: 2, repeat: Infinity }}
      >
        <div className="w-6 h-10 rounded-full border-2 border-gold/50 flex items-start justify-center p-1">
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

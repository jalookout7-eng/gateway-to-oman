"use client";

import { Quote } from "lucide-react";
import { ScrollAnimationWrapper } from "./ScrollAnimationWrapper";

export function FounderMission() {
  return (
    <section id="mission" className="py-24 px-6 bg-navy">
      <div className="max-w-4xl mx-auto">
        <ScrollAnimationWrapper animation="fadeIn">
          <div className="relative pl-8 border-l-2 border-gold/60">
            {/* Decorative quote icon */}
            <div className="absolute -left-[18px] top-0 w-9 h-9 rounded-full bg-navy border-2 border-gold/60 flex items-center justify-center">
              <Quote className="w-4 h-4 text-gold" strokeWidth={1.5} />
            </div>

            <blockquote className="text-2xl md:text-3xl text-white font-light leading-relaxed italic mb-8 font-body">
              &ldquo;Our mission is simple: to build genuine bridges between
              global talent and Oman&apos;s emerging opportunities. Not with
              hype, but with honesty. Not with promises, but with proof.&rdquo;
            </blockquote>

            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full gold-gradient flex items-center justify-center text-white font-bold text-lg font-heading shadow-md shadow-gold/30 flex-shrink-0">
                GTO
              </div>
              <div>
                <p className="text-gold font-semibold font-heading">Gateway to Oman</p>
                <p className="text-gray-400 text-sm font-body">
                  26 years of experience in Oman&apos;s telecom and legal sectors
                </p>
              </div>
            </div>
          </div>
        </ScrollAnimationWrapper>
      </div>
    </section>
  );
}

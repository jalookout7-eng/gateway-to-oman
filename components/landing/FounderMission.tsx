"use client";

import { ScrollAnimationWrapper } from "./ScrollAnimationWrapper";

export function FounderMission() {
  return (
    <section id="mission" className="py-24 px-6 bg-navy">
      <div className="max-w-4xl mx-auto">
        <ScrollAnimationWrapper animation="fadeIn">
          <div className="border-l-4 border-gold pl-8">
            <blockquote className="text-2xl md:text-3xl text-white font-light leading-relaxed italic mb-8">
              &ldquo;My mission is simple: to build genuine bridges between
              global talent and Oman&apos;s emerging opportunities. Not with
              hype, but with honesty. Not with promises, but with proof.&rdquo;
            </blockquote>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full gold-gradient flex items-center justify-center text-white font-bold text-lg">
                A
              </div>
              <div>
                <p className="text-gold font-semibold">Ahmed Al-Azizi</p>
                <p className="text-gray-400 text-sm">
                  Founder, Gateway to Oman
                </p>
              </div>
            </div>
          </div>
        </ScrollAnimationWrapper>
      </div>
    </section>
  );
}

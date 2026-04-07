"use client";

import { Mail, CalendarDays } from "lucide-react";
import { ScrollAnimationWrapper } from "./ScrollAnimationWrapper";

export function ContactCTA() {
  return (
    <section id="contact" className="py-24 px-6 bg-white">
      <div className="max-w-3xl mx-auto text-center">
        <ScrollAnimationWrapper animation="fadeUp">
          <h2 className="text-4xl md:text-5xl font-bold text-navy mb-4 font-heading">
            Ready to Explore Your{" "}
            <span className="text-gold">Oman Opportunity</span>?
          </h2>
          <p className="text-gray-500 mb-10 text-lg font-body leading-relaxed">
            Let&apos;s have an honest conversation about whether Oman makes
            sense for YOUR journey.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-8">
            <a
              href="mailto:azizi@alazizigroup.com"
              className="inline-flex items-center gap-2.5 px-8 py-4 rounded-lg gold-gradient text-white font-semibold text-lg shadow-lg shadow-gold/25 hover:shadow-xl hover:shadow-gold/30 hover:-translate-y-0.5 transition-all duration-200 cursor-pointer font-body"
            >
              <Mail className="w-5 h-5" strokeWidth={1.5} />
              Email Us
            </a>
            <button className="inline-flex items-center gap-2.5 px-8 py-4 rounded-lg border-2 border-gold text-gold font-semibold text-lg hover:bg-gold hover:text-white transition-all duration-200 cursor-pointer font-body">
              <CalendarDays className="w-5 h-5" strokeWidth={1.5} />
              Book Free Consultation
            </button>
          </div>
        </ScrollAnimationWrapper>
      </div>
    </section>
  );
}

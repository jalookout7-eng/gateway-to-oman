"use client";

import { ScrollAnimationWrapper } from "./ScrollAnimationWrapper";
import { Button } from "@/components/ui/Button";

export function ContactCTA() {
  return (
    <section id="contact" className="py-24 px-6 bg-white">
      <div className="max-w-3xl mx-auto text-center">
        <ScrollAnimationWrapper animation="fadeUp">
          <h2 className="text-4xl md:text-5xl font-bold text-navy mb-4">
            Ready to Explore Your{" "}
            <span className="text-gold">Oman Opportunity</span>?
          </h2>
          <p className="text-gray-500 mb-8 text-lg">
            Let&apos;s have an honest conversation about whether Oman makes
            sense for YOUR journey.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-8">
            <a href="mailto:azizi@alazizigroup.com">
              <Button variant="gold" size="lg">
                Email Us
              </Button>
            </a>
            <Button variant="outline" size="lg">
              Book Free Consultation
            </Button>
          </div>

          <p className="text-sm text-gray-400 italic">
            No sales pitch. Just truth.
          </p>
        </ScrollAnimationWrapper>
      </div>
    </section>
  );
}

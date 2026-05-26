"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

interface LeadCaptureFormProps {
  conversationId: string;
  segment: string | null;
  interest: string | null;
  onSubmit: (data: {
    name: string;
    email: string;
    phone: string;
    countryCode: string;
  }) => void;
}

export function LeadCaptureForm({
  conversationId,
  segment,
  interest,
  onSubmit,
}: LeadCaptureFormProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [countryCode, setCountryCode] = useState("+971");
  const [phone, setPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email) return;

    setSubmitting(true);
    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          phone,
          countryCode,
          conversationId,
          segment,
          interests: interest,
        }),
      });

      if (res.ok) {
        onSubmit({ name, email, phone, countryCode });
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <motion.form
      onSubmit={handleSubmit}
      className="p-4 bg-warm-white rounded-xl mx-3 mb-3 space-y-3"
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: "spring", stiffness: 200, damping: 20 }}
    >
      <p className="text-sm font-semibold text-navy">
        Share your details and our team will reach out:
      </p>
      <Input
        placeholder="Your name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        required
      />
      <Input
        type="email"
        placeholder="Email address"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
      />
      <div className="flex gap-2">
        <input
          type="text"
          value={countryCode}
          onChange={(e) => setCountryCode(e.target.value)}
          className="w-20 px-3 py-2.5 rounded-lg border border-gray-200 bg-warm-white text-sm outline-none focus:border-gold"
          placeholder="+971"
        />
        <Input
          type="tel"
          placeholder="Mobile number"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          className="flex-1"
        />
      </div>
      <Button
        type="submit"
        variant="gold"
        size="sm"
        className="w-full disabled:opacity-50"
        disabled={submitting || !name.trim() || !email.trim() || !phone.trim()}
      >
        {submitting ? "Connecting..." : "Get in touch"}
      </Button>
      <p className="mt-3 text-[11px] text-gray-400 leading-snug">
        By submitting, you agree to our{" "}
        <Link href="/privacy" className="underline hover:text-navy">Privacy Policy</Link> and{" "}
        <Link href="/terms" className="underline hover:text-navy">Terms</Link>.
      </p>
    </motion.form>
  );
}

"use client";

import { motion } from "framer-motion";

interface BookingButtonProps {
  onClick: () => void;
}

export function BookingButton({ onClick }: BookingButtonProps) {
  return (
    <motion.div
      className="px-4 pb-3"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <button
        onClick={onClick}
        className="w-full py-3 rounded-xl gold-gradient text-white font-semibold text-sm shadow-lg shadow-gold/30 hover:shadow-xl hover:-translate-y-0.5 transition-all"
      >
        Book a Priority Session with Ahmed
      </button>
    </motion.div>
  );
}

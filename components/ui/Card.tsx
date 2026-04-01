"use client";

import { motion } from "framer-motion";

interface CardProps {
  children: React.ReactNode;
  className?: string;
  hover3d?: boolean;
}

export function Card({ children, className = "", hover3d = false }: CardProps) {
  if (hover3d) {
    return (
      <motion.div
        className={`bg-white rounded-xl border-t-4 border-gold shadow-md p-6 ${className}`}
        whileHover={{
          rotateY: 5,
          rotateX: -5,
          scale: 1.02,
          boxShadow: "0 20px 40px rgba(201, 155, 60, 0.15)",
        }}
        transition={{ type: "spring", stiffness: 300, damping: 20 }}
        style={{ transformPerspective: 1000 }}
      >
        {children}
      </motion.div>
    );
  }

  return (
    <div
      className={`bg-white rounded-xl border-t-4 border-gold shadow-md p-6 hover:shadow-lg transition-shadow ${className}`}
    >
      {children}
    </div>
  );
}

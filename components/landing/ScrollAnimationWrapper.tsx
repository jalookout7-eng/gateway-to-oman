"use client";

import { motion, useInView } from "framer-motion";
import { useRef } from "react";

interface ScrollAnimationWrapperProps {
  children: React.ReactNode;
  className?: string;
  animation?:
    | "fadeUp"
    | "fadeIn"
    | "flipIn"
    | "slideLeft"
    | "slideRight"
    | "scaleIn";
  delay?: number;
  duration?: number;
}

const animations = {
  fadeUp: {
    hidden: { opacity: 0, y: 60 },
    visible: { opacity: 1, y: 0 },
  },
  fadeIn: {
    hidden: { opacity: 0 },
    visible: { opacity: 1 },
  },
  flipIn: {
    hidden: { opacity: 0, rotateY: -90 },
    visible: { opacity: 1, rotateY: 0 },
  },
  slideLeft: {
    hidden: { opacity: 0, x: -60 },
    visible: { opacity: 1, x: 0 },
  },
  slideRight: {
    hidden: { opacity: 0, x: 60 },
    visible: { opacity: 1, x: 0 },
  },
  scaleIn: {
    hidden: { opacity: 0, scale: 0.8 },
    visible: { opacity: 1, scale: 1 },
  },
};

export function ScrollAnimationWrapper({
  children,
  className = "",
  animation = "fadeUp",
  delay = 0,
  duration = 0.6,
}: ScrollAnimationWrapperProps) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  const variant = animations[animation];

  return (
    <motion.div
      ref={ref}
      className={className}
      initial="hidden"
      animate={isInView ? "visible" : "hidden"}
      variants={variant}
      transition={{
        duration,
        delay,
        type: animation === "flipIn" ? "spring" : "tween",
        stiffness: animation === "flipIn" ? 100 : undefined,
        ease: animation === "flipIn" ? undefined : "easeOut",
      }}
      style={
        animation === "flipIn" ? { transformPerspective: 1000 } : undefined
      }
    >
      {children}
    </motion.div>
  );
}

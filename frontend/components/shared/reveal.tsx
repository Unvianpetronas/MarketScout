"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "motion/react";

type RevealVariant = "up" | "left" | "right" | "scale";

// Shared "gentle expo" easing — matches the page-transition + WhyMarketScout curves.
const EASE = [0.16, 1, 0.3, 1] as const;

/**
 * Scroll-triggered entrance. Plays ONCE when the element first crosses into
 * view and then stays put — no re-hiding on scroll-up, which is what made the
 * old version flicker/feel "stiff".
 *
 * - Simple variants use framer-motion `whileInView`.
 * - `stagger` grids keep the CSS nth-child stagger (globals.css) so the grid's
 *   equal-height layout is never wrapped/disturbed; we only toggle `is-visible`
 *   once via an observer.
 */
export function Reveal({
  children,
  className = "",
  variant = "up",
  stagger = false,
}: {
  children: React.ReactNode;
  className?: string;
  variant?: RevealVariant;
  stagger?: boolean;
}) {
  const reduce = useReducedMotion() ?? false;

  if (stagger) {
    return <StaggerReveal className={className}>{children}</StaggerReveal>;
  }

  const hidden = reduce
    ? { opacity: 0 }
    : variant === "left"
      ? { opacity: 0, x: -32 }
      : variant === "right"
        ? { opacity: 0, x: 32 }
        : variant === "scale"
          ? { opacity: 0, scale: 0.94 }
          : { opacity: 0, y: 28 };

  return (
    <motion.div
      className={className}
      initial={hidden}
      whileInView={{ opacity: 1, x: 0, y: 0, scale: 1 }}
      viewport={{ once: true, margin: "0px 0px -80px 0px" }}
      transition={{ duration: 0.7, ease: EASE }}
    >
      {children}
    </motion.div>
  );
}

function StaggerReveal({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.15, rootMargin: "0px 0px -80px 0px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} className={`reveal-stagger ${visible ? "is-visible" : ""} ${className}`}>
      {children}
    </div>
  );
}

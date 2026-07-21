"use client";

import { useEffect, useRef, useState } from "react";

type RevealVariant = "up" | "left" | "right" | "scale";

/**
 * Scroll-triggered entrance — fades/slides an element in every time it crosses
 * into the viewport (IntersectionObserver), and re-hides it once it fully
 * leaves, so the popup effect replays on scroll-up as well as scroll-down.
 * Respects prefers-reduced-motion via CSS (see globals.css) rather than
 * skipping the observer, so no extra branching here.
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
  const ref = useRef<HTMLDivElement | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        setVisible(entry.isIntersecting);
      },
      { threshold: 0.15, rootMargin: "0px 0px -80px 0px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const base = stagger ? "reveal-stagger" : `reveal reveal-${variant}`;
  return (
    <div ref={ref} className={`${base} ${visible ? "is-visible" : ""} ${className}`}>
      {children}
    </div>
  );
}

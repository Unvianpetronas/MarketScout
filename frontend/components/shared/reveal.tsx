"use client";

import { useEffect, useRef, useState } from "react";

type RevealVariant = "up" | "left" | "right" | "scale";

/**
 * Scroll-triggered entrance — fades/slides an element in the first time it
 * crosses into the viewport (IntersectionObserver), then leaves it alone.
 * Reveals once and never re-hides on scroll-up, so re-reading a page never
 * flickers content away. Respects prefers-reduced-motion via CSS (see
 * globals.css) rather than skipping the observer, so no extra branching here.
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

  const base = stagger ? "reveal-stagger" : `reveal reveal-${variant}`;
  return (
    <div ref={ref} className={`${base} ${visible ? "is-visible" : ""} ${className}`}>
      {children}
    </div>
  );
}

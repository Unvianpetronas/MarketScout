"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Counts a number up from 0 to `end` the first time it scrolls into view, then
 * stays put (never re-runs on scroll-up — a replaying counter reads as a glitch,
 * unlike the decorative Reveal). Honors prefers-reduced-motion by jumping
 * straight to the final value.
 */
export function CountUp({
  end,
  decimals = 0,
  suffix = "",
  duration = 1400,
}: {
  end: number;
  decimals?: number;
  suffix?: string;
  duration?: number;
}) {
  const ref = useRef<HTMLSpanElement | null>(null);
  const started = useRef(false);
  const [value, setValue] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting || started.current) return;
        started.current = true;
        observer.disconnect();

        if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
          setValue(end);
          return;
        }

        const start = performance.now();
        const tick = (now: number) => {
          const p = Math.min((now - start) / duration, 1);
          const eased = 1 - Math.pow(1 - p, 3); // easeOutCubic
          setValue(end * eased);
          if (p < 1) requestAnimationFrame(tick);
          else setValue(end);
        };
        requestAnimationFrame(tick);
      },
      { threshold: 0.5 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [end, duration]);

  return (
    <span ref={ref}>
      {value.toFixed(decimals)}
      {suffix}
    </span>
  );
}

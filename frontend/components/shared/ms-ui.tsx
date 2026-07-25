"use client";

import type { CSSProperties } from "react";

/**
 * Shared MarketScout design-system primitives (the "handoff" language used by
 * the dashboard). Import these instead of re-declaring tokens per page so every
 * authenticated screen stays visually consistent.
 */

// ── Tokens ──
export const INK = "#10162b";       // headings / numbers
export const MUTED = "#5b6474";     // body text
export const FAINT = "#8b93a3";     // labels / meta
export const ACCENT = "#059669";    // brand emerald
export const ACCENT_DARK = "#047857";
export const AMBER = "#c98a2c";     // risk: medium
export const RED = "#c1483d";       // risk: high
export const BORDER = "rgba(16,22,43,0.06)";
export const PAGE_BG = "#faf9f6";

/** Soft, diffused card surface — matches the dashboard cards. */
export const cardStyle: CSSProperties = {
  border: `1px solid ${BORDER}`,
  boxShadow: "0 2px 20px rgba(16,22,43,0.03)",
};

export type RiskTone = { color: string; bg: string; labelKey: string };

/** Map the backend's Vietnamese risk level to a tone (color + tinted pill bg). */
export function riskTone(level?: string | null): RiskTone {
  if (level === "Cao" || level === "Nghiêm trọng")
    return { color: RED, bg: "rgba(193,72,61,0.1)", labelKey: "risk.high" };
  if (level === "Trung bình")
    return { color: AMBER, bg: "rgba(201,138,44,0.13)", labelKey: "risk.medium" };
  return { color: ACCENT, bg: "rgba(5,150,105,0.1)", labelKey: "risk.low" };
}

/** Conic-gradient risk donut with the numeric score at its center. */
export function RiskGauge({ score, color, size = 36 }: { score: number; color: string; size?: number }) {
  const pct = Math.max(0, Math.min(100, score));
  const inset = Math.round(size / 9);
  return (
    <div
      className="relative rounded-full shrink-0"
      style={{ width: size, height: size, background: `conic-gradient(${color} ${pct}%, rgba(16,22,43,0.08) 0)` }}
    >
      <div
        className="absolute rounded-full bg-white flex items-center justify-center font-bold"
        style={{ inset, fontSize: Math.round(size / 3.2), color: INK }}
      >
        {score}
      </div>
    </div>
  );
}

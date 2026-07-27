"use client";

import { useId } from "react";

const W = 460, H = 130, TOP = 12, BOT = 112; // line area 12..112 within 130

/** SVG gradient-area + stroked line + highlighted latest dot, month labels below. */
export function TrendAreaChart({
  values, labels, color = "#059669",
}: {
  values: number[];
  labels: string[];
  color?: string;
}) {
  const id = useId().replace(/:/g, "");
  const max = Math.max(...values, 1);
  const n = values.length;

  const pt = (v: number, i: number): [number, number] => [
    n <= 1 ? W / 2 : (i / (n - 1)) * W,
    BOT - (v / max) * (BOT - TOP),
  ];
  const pts = values.map(pt);
  const linePoints = pts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const areaPath = `M ${pts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" L ")} L ${W},${H} L 0,${H} Z`;
  const [lastX, lastY] = pts[pts.length - 1];

  return (
    <div>
      <svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none"
        style={{ display: "block", overflow: "visible" }}>
        <defs>
          <linearGradient id={`ta-${id}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.22" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={areaPath} fill={`url(#ta-${id})`} />
        <polyline points={linePoints} fill="none" stroke={color} strokeWidth="2.5"
          strokeLinecap="round" strokeLinejoin="round" />
        <circle cx={lastX} cy={lastY} r="4.5" fill={color} />
        <circle cx={lastX} cy={lastY} r="8" fill={color} fillOpacity="0.18" />
      </svg>
      <div className="flex justify-between mt-2 px-0.5">
        {labels.map((l, i) => (
          <span key={i} className="text-[11px] text-[#8b93a3]">{l}</span>
        ))}
      </div>
    </div>
  );
}

"use client";

export type DonutSegment = { label: string; value: number; color: string };

/** conic-gradient ring with an inset white "hole" (center value/label) + side legend. */
export function DonutChart({
  segments, size = 132, centerValue, centerLabel,
}: {
  segments: DonutSegment[];
  size?: number;
  centerValue: string;
  centerLabel: string;
}) {
  const total = segments.reduce((s, x) => s + x.value, 0) || 1;
  const stops = segments.map((s, i) => {
    const before = segments.slice(0, i).reduce((a, x) => a + x.value, 0);
    const start = (before / total) * 100;
    const end = ((before + s.value) / total) * 100;
    return `${s.color} ${start.toFixed(2)}% ${end.toFixed(2)}%`;
  });
  // CSS requires at least two colour stops in a gradient, so a one-segment
  // donut (only one plan earning, or every report on the same status) produced
  // an invalid `conic-gradient(<one stop>)` that browsers drop entirely — the
  // ring rendered blank. A single category is a solid ring.
  const gradient =
    stops.length === 1 ? segments[0].color : `conic-gradient(${stops.join(", ")})`;

  return (
    <div className="flex items-center gap-5">
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <div className="w-full h-full rounded-full" style={{ background: gradient }} />
        <div className="absolute inset-0 m-auto rounded-full bg-white flex flex-col items-center justify-center"
          style={{ width: size - 44, height: size - 44 }}>
          <span className="text-lg font-extrabold text-[#10162b] font-display leading-none">{centerValue}</span>
          <span className="text-[10px] text-[#8b93a3] mt-0.5">{centerLabel}</span>
        </div>
      </div>
      <div className="flex-1 min-w-0 space-y-2">
        {segments.map((s) => (
          <div key={s.label} className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-[3px] shrink-0" style={{ background: s.color }} />
            <span className="text-[13px] text-[#5b6474] truncate flex-1">{s.label}</span>
            <span className="text-[13px] font-bold text-[#10162b] shrink-0">{s.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

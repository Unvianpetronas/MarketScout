"use client";

export type StackSegment = { label: string; value: number; color: string };

/** Single horizontal stacked bar + legend (dot / label / count) below. */
export function StackedSegmentBar({ segments }: { segments: StackSegment[] }) {
  const total = segments.reduce((s, x) => s + x.value, 0) || 1;
  return (
    <div>
      <div className="flex w-full h-4 rounded-lg overflow-hidden bg-[#f0f1f4]">
        {segments.map((s) => (
          <div key={s.label} style={{ width: `${(s.value / total) * 100}%`, background: s.color }} />
        ))}
      </div>
      <div className="flex flex-wrap gap-x-5 gap-y-2 mt-4">
        {segments.map((s) => (
          <div key={s.label} className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-[3px]" style={{ background: s.color }} />
            <span className="text-[13px] text-[#5b6474]">{s.label}</span>
            <span className="text-[13px] font-bold text-[#10162b]">{s.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

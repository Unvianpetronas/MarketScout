"use client";

export function SectionCard({
  title, headerRight, children, className = "",
}: {
  title?: string;
  headerRight?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`bg-white rounded-[22px] border border-[rgba(16,22,43,0.06)] p-[24px_26px] shadow-[0_2px_20px_rgba(16,22,43,0.03)] ${className}`}>
      {(title || headerRight) && (
        <div className="flex items-center justify-between gap-3 mb-5">
          {title && <h2 className="text-[15.5px] font-bold text-[#10162b]">{title}</h2>}
          {headerRight}
        </div>
      )}
      {children}
    </div>
  );
}

/** Small green trend pill for section headers, e.g. "+300.0%". */
export function TrendPill({ pct }: { pct: number }) {
  const up = pct >= 0;
  return (
    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${up ? "text-emerald-700 bg-emerald-50" : "text-red-600 bg-red-50"}`}>
      {up ? "+" : ""}{pct.toFixed(1)}%
    </span>
  );
}

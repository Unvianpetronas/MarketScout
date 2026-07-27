"use client";

/** 2-letter country/code badge (rounded square). */
export function CodeBadge({ code, color = "#059669" }: { code: string; color?: string }) {
  return (
    <span className="w-8 h-8 rounded-[9px] flex items-center justify-center text-[11px] font-bold shrink-0"
      style={{ background: `${color}1a`, color }}>
      {code.slice(0, 2).toUpperCase()}
    </span>
  );
}

/** Colored-initials avatar square. */
export function InitialsAvatar({ name, color = "#059669", size = 30 }: { name: string; color?: string; size?: number }) {
  const initials = name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join("").toUpperCase();
  return (
    <span className="rounded-[9px] flex items-center justify-center font-bold text-white shrink-0"
      style={{ width: size, height: size, background: color, fontSize: size * 0.36 }}>
      {initials || "?"}
    </span>
  );
}

export type RankedItem = {
  id: string;
  label: string;
  value: number;       // drives the bar width
  valueText: string;   // right-aligned label
  barColor?: string;
  leading?: React.ReactNode; // rank / avatar / badge
};

export function RankedBarList({
  items, max, showBar = true, barColor = "#059669",
}: {
  items: RankedItem[];
  max?: number;
  showBar?: boolean;
  barColor?: string;
}) {
  const top = max ?? Math.max(...items.map((i) => i.value), 1);
  if (items.length === 0) return <p className="text-sm text-[#8b93a3] py-4">Chưa có dữ liệu.</p>;

  return (
    <div className="space-y-3.5">
      {items.map((it) => (
        <div key={it.id} className="flex items-center gap-3">
          {it.leading}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <span className="text-[13px] font-semibold text-[#10162b] truncate">{it.label}</span>
              <span className="text-[12px] font-semibold text-[#8b93a3] shrink-0">{it.valueText}</span>
            </div>
            {showBar && (
              <div className="h-1.5 rounded-full bg-[#f0f1f4] overflow-hidden">
                <div className="h-full rounded-full"
                  style={{ width: `${Math.max(4, (it.value / top) * 100)}%`, background: it.barColor ?? barColor }} />
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

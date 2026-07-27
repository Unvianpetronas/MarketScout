"use client";

import { RefreshCw, Download } from "lucide-react";

export function AdminPageHeader({
  breadcrumb, title, subtitle, rightSlot,
}: {
  breadcrumb: string;
  title: string;
  subtitle: string;
  rightSlot?: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4 mb-7">
      <div>
        <p className="text-xs font-bold text-[#a8adb8] uppercase tracking-widest mb-1.5">{breadcrumb}</p>
        <h1 className="text-[28px] leading-tight font-extrabold text-[#10162b] font-display">{title}</h1>
        <p className="text-[15px] text-[#5b6474] mt-1">{subtitle}</p>
      </div>
      {rightSlot && <div className="flex items-center gap-2.5 shrink-0">{rightSlot}</div>}
    </div>
  );
}

/** Segmented pill group (e.g. time range). First matching value is tinted/active. */
export function SegmentedPills<T extends string>({
  options, value, onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex items-center gap-1 p-1 rounded-xl bg-white border border-[rgba(16,22,43,0.08)] shadow-sm">
      {options.map((o) => (
        <button key={o.value} onClick={() => onChange(o.value)}
          className={`px-3.5 py-1.5 rounded-lg text-[13px] font-semibold transition-colors ${
            o.value === value
              ? "bg-[#059669]/10 text-[#047857]"
              : "text-[#5b6474] hover:text-[#10162b]"
          }`}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function RefreshButton({ onClick, spinning }: { onClick: () => void; spinning?: boolean }) {
  return (
    <button onClick={onClick} aria-label="Làm mới"
      className="group w-11 h-11 rounded-full flex items-center justify-center bg-white border border-[rgba(16,22,43,0.08)] text-[#5b6474] shadow-sm hover:text-[#10162b] transition-colors">
      <RefreshCw className={`w-4 h-4 transition-transform duration-300 ${spinning ? "animate-spin" : "group-hover:rotate-90"}`} />
    </button>
  );
}

export function ExportButton({ onClick }: { onClick?: () => void }) {
  return (
    <button onClick={onClick}
      className="flex items-center gap-2 px-4 h-11 rounded-xl bg-white border border-[rgba(16,22,43,0.08)] text-[13px] font-semibold text-[#10162b] shadow-sm hover:bg-[#faf9f6] transition-colors">
      <Download className="w-4 h-4" />
      Xuất báo cáo
    </button>
  );
}

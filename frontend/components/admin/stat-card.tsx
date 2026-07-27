"use client";

import { TrendingUp, TrendingDown, ArrowUpRight } from "lucide-react";

export function StatCard({
  icon: Icon, iconBg, iconColor, value, trend, label, description, live,
}: {
  icon: React.ElementType;
  iconBg: string;    // e.g. "rgba(99,102,241,0.12)"
  iconColor: string; // e.g. "#6366f1"
  value: string;
  trend?: { pct: number };
  label: string;
  description?: string;
  live?: boolean;
}) {
  const up = trend ? trend.pct >= 0 : false;
  return (
    <div className="group relative bg-white rounded-[22px] border border-[rgba(16,22,43,0.06)] p-[22px] shadow-[0_2px_20px_rgba(16,22,43,0.03)] transition-all duration-200 hover:-translate-y-[3px] hover:shadow-[0_16px_32px_-18px_rgba(16,22,43,0.18)]">
      <ArrowUpRight className="absolute top-4 right-4 w-4 h-4 text-[#c3c8d1]" />
      <div className="w-11 h-11 rounded-[12px] flex items-center justify-center mb-3.5"
        style={{ background: iconBg }}>
        <Icon className="w-5 h-5" style={{ color: iconColor }} strokeWidth={2} />
      </div>
      <div className="flex items-center gap-2.5">
        <span className="text-[28px] font-extrabold text-[#10162b] font-display leading-none">{value}</span>
        {live && (
          <span className="w-2 h-2 rounded-full bg-[#10b981]" style={{ animation: "pulseDot 1.6s ease-in-out infinite" }} />
        )}
        {trend && (
          <span className={`inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full ${
            up ? "text-emerald-700 bg-emerald-50" : "text-red-600 bg-red-50"
          }`}>
            {up ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
            {Math.abs(trend.pct).toFixed(1)}%
          </span>
        )}
      </div>
      <p className="text-sm font-bold text-[#10162b] mt-2">{label}</p>
      {description && <p className="text-xs text-[#8b93a3] mt-0.5">{description}</p>}
    </div>
  );
}

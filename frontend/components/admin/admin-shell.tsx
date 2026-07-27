"use client";

import Link from "next/link";
import {
  BarChart2, Users, DollarSign, Database, CreditCard, FileWarning,
  Gauge, History, Terminal, ArrowLeft, Search,
} from "lucide-react";

export type AdminNavId =
  | "overview" | "customers" | "revenue" | "quota" | "billing" | "reports"
  | "evaluation" | "history" | "logs";

type NavItem = { id: AdminNavId; label: string; href: string; icon: React.ElementType };

const NAV_SECTIONS: { label: string; items: NavItem[] }[] = [
  {
    label: "NỀN TẢNG CỐT LÕI",
    items: [
      { id: "overview",  label: "Tổng quan",       href: "/admin",           icon: BarChart2 },
      { id: "customers", label: "Khách hàng",       href: "/admin/customers", icon: Users },
      { id: "revenue",   label: "Doanh thu",        href: "/admin/revenue",   icon: DollarSign },
      { id: "quota",     label: "Quota Matrix",     href: "/admin/quota",     icon: Database },
      { id: "billing",   label: "Billing",          href: "/admin/billing",   icon: CreditCard },
      { id: "reports",   label: "Reports & Flags",  href: "/admin/reports",   icon: FileWarning },
      { id: "evaluation", label: "Đánh giá",        href: "/admin/evaluation", icon: Gauge },
    ],
  },
  {
    label: "KIỂM TOÁN & NHẬT KÝ",
    items: [
      { id: "history", label: "Lịch sử",     href: "/admin/history", icon: History },
      { id: "logs",    label: "System Logs", href: "/admin/logs",    icon: Terminal },
    ],
  },
];

export function AdminShell({ active, children }: { active: AdminNavId; children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex bg-[#faf9f6]">
      {/* ── Sidebar ── */}
      <aside className="w-[264px] shrink-0 sticky top-0 h-screen flex flex-col bg-[#0b0f1a] px-3.5 py-[22px] overflow-y-auto scrollbar-thin">
        {/* Logo */}
        <div className="flex items-center gap-2.5 px-2">
          <div className="w-[34px] h-[34px] rounded-[10px] flex items-center justify-center shrink-0"
            style={{ background: "linear-gradient(155deg,#059669,#0a7a56)" }}>
            <Search className="w-[18px] h-[18px] text-white" strokeWidth={2.4} />
          </div>
          <div className="leading-tight">
            <p className="text-[16.5px] font-extrabold text-white font-display">MarketScout</p>
            <p className="text-[11px] font-bold text-[#34d399] tracking-[0.08em]">SUPER ADMIN</p>
          </div>
        </div>

        {/* Back to dashboard */}
        <Link href="/dashboard"
          className="mt-5 mb-3 flex items-center gap-2.5 px-2.5 py-2.5 rounded-xl text-sm text-white/60 hover:text-white hover:bg-white/[0.06] transition-colors border-b border-white/5 pb-4">
          <ArrowLeft className="w-4 h-4 shrink-0" />
          Về Dashboard
        </Link>

        {/* Nav */}
        <nav className="flex-1 space-y-5">
          {NAV_SECTIONS.map((section) => (
            <div key={section.label}>
              <p className="text-[11px] font-bold text-white/30 tracking-[0.12em] mb-2 px-2.5">
                {section.label}
              </p>
              <div className="space-y-0.5">
                {section.items.map((item) => {
                  const isActive = item.id === active;
                  return (
                    <Link key={item.href} href={item.href}
                      className={`flex items-center gap-2.5 px-2.5 py-2.5 rounded-xl text-[13.5px] transition-colors ${
                        isActive
                          ? "bg-white text-[#10162b] font-bold"
                          : "text-white/[0.62] hover:text-white hover:bg-white/[0.06]"
                      }`}>
                      <item.icon className="w-[18px] h-[18px] shrink-0" />
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* User card */}
        <div className="mt-5 flex items-center gap-2.5 p-2.5 rounded-[14px] bg-white/[0.04]">
          <div className="w-[34px] h-[34px] rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
            style={{ background: "linear-gradient(155deg,#059669,#0a7a56)" }}>
            SA
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-semibold text-white truncate">Super Admin</p>
            <p className="text-[11px] text-white/45 truncate">admin@marketscout.vn</p>
          </div>
          <span className="w-2 h-2 rounded-full bg-[#34d399] shrink-0" />
        </div>
      </aside>

      {/* ── Content ── */}
      <main className="flex-1 min-w-0 overflow-x-hidden">
        <div className="max-w-[1560px] mx-auto px-11 pt-9 pb-16">{children}</div>
      </main>
    </div>
  );
}

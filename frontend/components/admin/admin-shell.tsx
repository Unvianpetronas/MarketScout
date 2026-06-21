"use client";

import Link from "next/link";
import { BarChart2, Users, Database, CreditCard, History, Terminal, Shield } from "lucide-react";

export type AdminNavId = "overview" | "customers" | "quota" | "billing" | "history" | "logs";

const NAV_SECTIONS: { label: string; items: { id: AdminNavId; label: string; href: string; icon: React.ElementType }[] }[] = [
  {
    label: "Core Platform",
    items: [
      { id: "overview", label: "Tổng quan", href: "/admin", icon: BarChart2 },
      { id: "customers", label: "Khách hàng", href: "/admin/customers", icon: Users },
      { id: "quota", label: "Quota Matrix", href: "/admin/quota", icon: Database },
      { id: "billing", label: "Billing", href: "/admin/billing", icon: CreditCard },
    ],
  },
  {
    label: "Audit & Logs",
    items: [
      { id: "history", label: "Lịch sử", href: "/admin/history", icon: History },
      { id: "logs", label: "System Logs", href: "/admin/logs", icon: Terminal },
    ],
  },
];

export function AdminShell({ active, children }: { active: AdminNavId; children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex bg-[#0A0F1A]">
      <aside className="w-60 shrink-0 flex flex-col bg-[#0D1117] border-r border-white/5">
        <div className="p-5 border-b border-white/5">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl gradient-brand flex items-center justify-center">
              <Shield className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-sm font-bold text-white">MarketScout</p>
              <p className="text-[10px] text-[#00D26A] font-bold uppercase tracking-widest">Super Admin</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-3 pt-5 space-y-5">
          {NAV_SECTIONS.map((section) => (
            <div key={section.label}>
              <p className="text-[10px] text-gray-600 uppercase tracking-widest font-bold mb-2 px-3">
                {section.label}
              </p>
              <div className="space-y-0.5">
                {section.items.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm transition-all ${
                      item.id === active
                        ? "bg-white/10 text-white font-semibold"
                        : "text-gray-500 hover:text-white hover:bg-white/5"
                    }`}
                  >
                    <item.icon className="w-4 h-4 shrink-0" />
                    {item.label}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </nav>

        <div className="p-4 border-t border-white/5">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-teal-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
              SA
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white truncate">Super Admin</p>
              <p className="text-xs text-gray-500 truncate">admin@marketscout.vn</p>
            </div>
            <div className="w-2 h-2 rounded-full bg-[#00D26A]" />
          </div>
        </div>
      </aside>

      <div className="flex-1 bg-[#F8FAFB] overflow-y-auto">
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}

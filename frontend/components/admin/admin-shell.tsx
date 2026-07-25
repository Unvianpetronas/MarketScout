"use client";

import Link from "next/link";
import { BarChart2, Users, Database, CreditCard, History, Terminal, ArrowLeft, FileWarning } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { useLanguage } from "@/providers/language-provider";

export type AdminNavId = "overview" | "customers" | "quota" | "billing" | "reports" | "history" | "logs";

const NAV_SECTIONS: { labelKey: string; items: { id: AdminNavId; labelKey: string; href: string; icon: React.ElementType }[] }[] = [
  {
    labelKey: "admin.shell.sectionCore",
    items: [
      { id: "overview", labelKey: "admin.shell.navOverview", href: "/admin", icon: BarChart2 },
      { id: "customers", labelKey: "admin.shell.navCustomers", href: "/admin/customers", icon: Users },
      { id: "quota", labelKey: "admin.shell.navQuota", href: "/admin/quota", icon: Database },
      { id: "billing", labelKey: "admin.shell.navBilling", href: "/admin/billing", icon: CreditCard },
      { id: "reports", labelKey: "admin.shell.navReports", href: "/admin/reports", icon: FileWarning },
    ],
  },
  {
    labelKey: "admin.shell.sectionAudit",
    items: [
      { id: "history", labelKey: "admin.shell.navHistory", href: "/admin/history", icon: History },
      { id: "logs", labelKey: "admin.shell.navLogs", href: "/admin/logs", icon: Terminal },
    ],
  },
];

export function AdminShell({ active, children }: { active: AdminNavId; children: React.ReactNode }) {
  const { t } = useLanguage();
  return (
    <div className="min-h-screen flex bg-[#0A0F1A]">
      <aside className="w-60 shrink-0 flex flex-col bg-[#0D1117] border-r border-white/5">
        <div className="p-5 border-b border-white/5">
          <div className="flex items-center gap-2.5">
            <Logo className="w-9 h-9" />
            <div>
              <p className="text-sm font-bold text-white">MarketScout</p>
              <p className="text-[10px] text-[#059669] font-bold uppercase tracking-widest">{t("admin.shell.superAdmin")}</p>
            </div>
          </div>
        </div>

        <div className="p-3 pt-4">
          <Link
            href="/dashboard"
            className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm text-gray-400 hover:text-white hover:bg-white/5 transition-all"
          >
            <ArrowLeft className="w-4 h-4 shrink-0" />
            {t("admin.shell.backToDashboard")}
          </Link>
        </div>

        <nav className="flex-1 p-3 pt-2 space-y-5">
          {NAV_SECTIONS.map((section) => (
            <div key={section.labelKey}>
              <p className="text-[10px] text-gray-600 uppercase tracking-widest font-bold mb-2 px-3">
                {t(section.labelKey)}
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
                    {t(item.labelKey)}
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
              <p className="text-sm font-semibold text-white truncate">{t("admin.shell.superAdmin")}</p>
              <p className="text-xs text-gray-500 truncate">admin@marketscout.vn</p>
            </div>
            <div className="w-2 h-2 rounded-full bg-[#059669]" />
          </div>
        </div>
      </aside>

      <div className="flex-1 bg-[#F8FAFB] overflow-y-auto">
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}

"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  MessageSquare, Search, Shield, Settings, Plus, ChevronLeft, ChevronRight,
  LogOut, FileText, Globe, Star, LayoutDashboard, Home
} from "lucide-react";
import { useAuth } from "@/providers/auth-provider";
import { useLanguage } from "@/providers/language-provider";
import { useState } from "react";

const NAV_ITEMS: { id: string; labelKey: string; icon: React.ElementType; href: string; badge?: string | null }[] = [
  { id: "dashboard", labelKey: "nav.dashboard", icon: Home, href: "/dashboard" },
  { id: "ai-assistant", labelKey: "nav.assistant", icon: MessageSquare, href: "/chat", badge: null },
  { id: "find-partners", labelKey: "nav.findPartners", icon: Search, href: "/find-partners" },
  { id: "verify", labelKey: "nav.verify", icon: Shield, href: "/verify" },
  { id: "reports", labelKey: "nav.reports", icon: FileText, href: "/reports" },
  { id: "intelligence", labelKey: "nav.intelligence", icon: Globe, href: "/intelligence" },
];

const BOTTOM_ITEMS: { id: string; labelKey: string; icon: React.ElementType; href: string; highlight?: boolean }[] = [
  { id: "pricing", labelKey: "nav.upgrade", icon: Star, href: "/pricing", highlight: true },
  { id: "profile", labelKey: "nav.settings", icon: Settings, href: "/profile" },
];

function UserAvatar({ name }: { name: string }) {
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  return (
    <div className="w-8 h-8 rounded-full gradient-brand flex items-center justify-center text-white text-xs font-bold shrink-0">
      {initials}
    </div>
  );
}

export function Sidebar({ active }: { active?: string }) {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const { t, lang, toggle } = useLanguage();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);

  const isActive = (item: { id: string; href: string }) =>
    active ? active === item.id : pathname.startsWith(item.href);

  // "Upgrade Plan" only makes sense for free-tier users — hide it on paid plans.
  const isFreeTier = !user?.planName || user.planName.toLowerCase() === "free";
  const bottomItems = BOTTOM_ITEMS.filter((item) => item.id !== "pricing" || isFreeTier);

  const planLabel = user?.planName
    ? `${user.planName.charAt(0).toUpperCase()}${user.planName.slice(1)} ${t("nav.planSuffix")}`
    : t("nav.freePlan");

  return (
    <aside
      className={`shrink-0 bg-white border-r border-gray-100 flex flex-col h-screen sticky top-0 transition-all duration-300 ${
        collapsed ? "w-[70px]" : "w-64"
      }`}
    >
      {/* ── Logo ── */}
      <div className="flex items-center justify-between px-4 py-5 border-b border-gray-100">
        <Link href="/dashboard" className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 gradient-brand rounded-xl flex items-center justify-center shrink-0 shadow-sm">
            <Search className="w-4 h-4 text-white" strokeWidth={2.5} />
          </div>
          {!collapsed && (
            <span className="font-extrabold text-gray-900 text-[17px] tracking-tight truncate animate-fade-in">
              MarketScout
            </span>
          )}
        </Link>
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-colors shrink-0"
          title={collapsed ? t("sidebar.expand") : t("sidebar.collapse")}
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* ── Quick Action ── */}
      <div className="px-3 pt-4 pb-2">
        <button
          onClick={() => router.push("/verify")}
          title={collapsed ? t("nav.newVerify") : undefined}
          className={`w-full flex items-center justify-center gap-2 px-3 py-2 gradient-brand text-white text-sm font-semibold rounded-xl shadow-sm hover:opacity-90 transition-opacity ${collapsed ? "" : ""}`}
        >
          <Plus className="w-4 h-4" />
          {!collapsed && t("nav.newVerify")}
        </button>
      </div>

      {/* ── Nav Label ── */}
      {!collapsed && (
        <div className="px-5 pt-3 pb-1">
          <p className="text-[10px] text-gray-400 uppercase tracking-widest font-bold">{t("nav.menu")}</p>
        </div>
      )}

      {/* ── Nav Items ── */}
      <nav className="px-2 flex-1 space-y-0.5 overflow-y-auto scrollbar-thin">
        {NAV_ITEMS.map((item) => {
          const itemActive = isActive(item);
          return (
            <Link
              key={item.id}
              href={item.href}
              title={collapsed ? t(item.labelKey) : undefined}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-150 group ${
                itemActive
                  ? "bg-[#E6F9F0] text-[#00843F] font-semibold"
                  : "text-gray-500 hover:bg-gray-50 hover:text-gray-900"
              } ${collapsed ? "justify-center" : ""}`}
            >
              <item.icon
                className={`w-[18px] h-[18px] shrink-0 transition-colors ${
                  itemActive ? "text-[#00D26A]" : "text-gray-400 group-hover:text-gray-700"
                }`}
              />
              {!collapsed && <span className="flex-1 truncate">{t(item.labelKey)}</span>}
              {!collapsed && item.badge && (
                <span className="text-[10px] bg-[#00D26A] text-white font-bold px-1.5 py-0.5 rounded-full">
                  {item.badge}
                </span>
              )}
              {itemActive && !collapsed && (
                <div className="w-1.5 h-1.5 rounded-full bg-[#00D26A]" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* ── Admin Panel shortcut (admin only) ── */}
      {user?.role?.toUpperCase() === "ADMIN" && (
        <div className="px-2 pb-1">
          <Link
            href="/admin"
            title={collapsed ? t("nav.adminPanel") : undefined}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all duration-150 bg-gradient-to-r from-purple-50 to-indigo-50 text-purple-700 hover:from-purple-100 hover:to-indigo-100 border border-purple-100 ${collapsed ? "justify-center" : ""}`}
          >
            <LayoutDashboard className="w-[18px] h-[18px] shrink-0 text-purple-500" />
            {!collapsed && <span className="truncate">{t("nav.adminPanel")}</span>}
            {!collapsed && (
              <span className="ml-auto text-[10px] bg-purple-600 text-white font-bold px-1.5 py-0.5 rounded-full">
                ADMIN
              </span>
            )}
          </Link>
        </div>
      )}

      {/* ── Bottom Section ── */}
      <div className="border-t border-gray-100 px-2 py-3 space-y-0.5">
        {bottomItems.map((item) => (
          <Link
            key={item.id}
            href={item.href}
            title={collapsed ? t(item.labelKey) : undefined}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-150 ${
              item.highlight
                ? "bg-gradient-to-r from-amber-50 to-orange-50 text-amber-700 font-semibold hover:from-amber-100 hover:to-orange-100"
                : "text-gray-500 hover:bg-gray-50 hover:text-gray-900"
            } ${collapsed ? "justify-center" : ""}`}
          >
            <item.icon className={`w-[18px] h-[18px] shrink-0 ${item.highlight ? "text-amber-500" : "text-gray-400"}`} />
            {!collapsed && <span className="truncate">{t(item.labelKey)}</span>}
            {!collapsed && item.highlight && (
              <span className="badge-premium">Pro</span>
            )}
          </Link>
        ))}

        {/* Language toggle (EN / VI) */}
        <button
          onClick={toggle}
          title={t("lang.switchTo")}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-gray-500 hover:bg-gray-50 hover:text-gray-900 transition-all duration-150 ${collapsed ? "justify-center" : ""}`}
        >
          <Globe className="w-[18px] h-[18px] shrink-0 text-gray-400" />
          {!collapsed && (
            <>
              <span className="flex-1 text-left truncate">{lang === "vi" ? "Tiếng Việt" : "English"}</span>
              <span className="text-[10px] font-bold text-[#00843F] bg-[#E6F9F0] px-1.5 py-0.5 rounded-full">
                {lang === "vi" ? "EN" : "VI"}
              </span>
            </>
          )}
        </button>

        {/* User card */}
        <div className={`mt-2 bg-gray-50 rounded-xl px-3 py-2.5 flex items-center gap-3 ${collapsed ? "justify-center" : ""}`}>
          <UserAvatar name={user?.fullName || "U"} />
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900 truncate">{user?.fullName || t("nav.guest")}</p>
              <p className="text-[11px] text-gray-400 truncate">{planLabel}</p>
            </div>
          )}
          {!collapsed && (
            <button
              onClick={logout}
              className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
              title={t("nav.logout")}
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </aside>
  );
}

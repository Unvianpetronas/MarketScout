"use client";

import { useState, useEffect } from "react";
import {
  Users, Ban,
  Search, Download, UserPlus,
  ArrowUpRight, AlertTriangle, CheckCircle2,
  Activity
} from "lucide-react";
import { toast } from "sonner";
import { AuthGuard } from "@/components/shared/auth-guard";
import { AdminShell } from "@/components/admin/admin-shell";
import { AdminPageHeader, RefreshButton } from "@/components/admin/admin-page-header";
import { getAdminUsers, setUserQuota, refundUserQuota, AdminUser } from "@/services/admin.service";
import { useLanguage } from "@/providers/language-provider";

function getQuotaBarColor(pct: number) {
  if (pct >= 90) return "#EF4444";
  if (pct >= 70) return "#F59E0B";
  return "#059669";
}

function getPlanStyle(plan: string) {
  const p = plan.toLowerCase();
  if (p.includes("enterprise")) return "text-pink-700 bg-pink-50 border-pink-200";
  if (p.includes("pro")) return "text-purple-700 bg-purple-50 border-purple-200";
  if (p.includes("starter")) return "text-blue-700 bg-blue-50 border-blue-200";
  return "text-gray-600 bg-gray-50 border-gray-200";
}

function getAvatarColor(name: string) {
  const colors = ["bg-teal-500", "bg-blue-500", "bg-purple-600", "bg-rose-500", "bg-amber-500", "bg-indigo-500"];
  const idx = name.charCodeAt(0) % colors.length;
  return colors[idx];
}

export default function AdminCustomersPage() {
  const { t } = useLanguage();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(0);
  const [planFilter, setPlanFilter] = useState("all");
  const [quotaModal, setQuotaModal] = useState<{ userId: string; name: string } | null>(null);
  const [quotaValue, setQuotaValue] = useState("50");
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchUsers = async () => {
    try {
      const res = await getAdminUsers(page, 20, searchQuery);
      setUsers(res.users);
      setTotal(res.total);
    } catch {
      toast.error(t("admin.customers.errLoad"));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { Promise.resolve().then(fetchUsers); }, [page, searchQuery]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchUsers();
    setTimeout(() => setIsRefreshing(false), 500);
  };

  const handleSetQuota = async () => {
    if (!quotaModal) return;
    try {
      await setUserQuota(quotaModal.userId, parseInt(quotaValue));
      toast.success(t("admin.customers.quotaUpdated", { name: quotaModal.name }));
      setQuotaModal(null);
      fetchUsers();
    } catch { toast.error(t("admin.customers.quotaUpdateFail")); }
  };

  const handleRefund = async (userId: string, name: string) => {
    try { await refundUserQuota(userId); toast.success(t("admin.customers.refunded", { name })); fetchUsers(); }
    catch { toast.error(t("admin.customers.refundFail")); }
  };

  // Filter by plan locally
  const filtered = users.filter((u) =>
    planFilter === "all" || u.planName.toLowerCase().includes(planFilter.toLowerCase())
  );

  const activeCount = users.filter((u) => u.isActive).length;
  const suspendedCount = users.filter((u) => !u.isActive).length;
  const unverifiedCount = users.filter((u) => !u.emailVerified).length;

  const METRICS = [
    { label: t("admin.customers.metric.total"), value: total.toString(), sub: t("admin.customers.metric.totalSub"), subColor: "text-blue-600", icon: Users, iconBg: "bg-blue-50", iconColor: "text-blue-600" },
    { label: t("admin.customers.metric.active"), value: activeCount.toString(), sub: t("admin.customers.metric.activeSub"), subColor: "text-emerald-600", icon: Activity, iconBg: "bg-emerald-50", iconColor: "text-emerald-600" },
    { label: t("admin.customers.metric.unverified"), value: unverifiedCount.toString(), sub: t("admin.customers.metric.unverifiedSub"), subColor: "text-amber-600", icon: AlertTriangle, iconBg: "bg-amber-50", iconColor: "text-amber-600" },
    { label: t("admin.customers.status.suspended"), value: suspendedCount.toString(), sub: t("admin.customers.metric.suspendedSub"), subColor: "text-red-500", icon: Ban, iconBg: "bg-red-50", iconColor: "text-red-600" },
  ];

  return (
    <AuthGuard requiredRole="ADMIN">
      <AdminShell active="customers">
            <AdminPageHeader
              breadcrumb="GLOBAL OPERATIONS > CUSTOMER CENTRAL"
              title="Khách hàng"
              subtitle="Quản lý người dùng, gói cước và hạn mức trên toàn hệ thống."
              rightSlot={
                <>
                  <button onClick={() => toast.info(t("profile.comingSoon"))}
                    className="flex items-center gap-2 px-4 h-11 rounded-xl bg-white border border-[rgba(16,22,43,0.08)] text-[13px] font-semibold text-[#10162b] shadow-sm hover:bg-[#faf9f6] transition-colors">
                    <Download className="w-4 h-4" /> {t("admin.customers.export")}
                  </button>
                  <button onClick={() => toast.info(t("profile.comingSoon"))}
                    className="flex items-center gap-2 px-4 h-11 rounded-xl text-white text-[13px] font-semibold shadow-sm hover:opacity-90 transition-opacity"
                    style={{ background: "linear-gradient(155deg,#059669,#0a7a56)" }}>
                    <UserPlus className="w-4 h-4" /> {t("admin.customers.createAccount")}
                  </button>
                  <RefreshButton onClick={handleRefresh} spinning={isRefreshing} />
                </>
              }
            />

            {/* Metrics */}
            <div className="grid grid-cols-4 gap-4 mb-6">
              {METRICS.map((m) => (
                <div key={m.label} className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm card-hover">
                  <div className="flex items-start justify-between mb-3">
                    <div className={`w-10 h-10 rounded-xl ${m.iconBg} flex items-center justify-center`}>
                      <m.icon className={`w-5 h-5 ${m.iconColor}`} />
                    </div>
                    <ArrowUpRight className="w-4 h-4 text-gray-200" />
                  </div>
                  <p className="text-2xl font-extrabold text-gray-900">{m.value}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{m.label}</p>
                  <p className={`text-xs mt-1 font-semibold ${m.subColor}`}>{m.sub}</p>
                </div>
              ))}
            </div>

            {/* Search & Filters */}
            <div className="bg-white rounded-2xl border border-gray-100 p-4 mb-4 flex items-center gap-3 shadow-sm">
              <div className="relative flex-1 min-w-48">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
                <input value={searchQuery} onChange={(e) => { setSearchQuery(e.target.value); setPage(0); }}
                  placeholder={t("admin.customers.searchPlaceholder")}
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus-ms" />
              </div>
              <select value={planFilter} onChange={(e) => setPlanFilter(e.target.value)}
                className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm bg-white text-gray-700 focus:outline-none">
                <option value="all">{t("admin.customers.filter.all")}</option>
                <option value="free">Free</option>
                <option value="starter">Starter</option>
                <option value="pro">Pro</option>
                <option value="enterprise">Enterprise</option>
              </select>
            </div>

            {/* Table */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              {isLoading ? (
                <div className="p-12 flex flex-col items-center">
                  <div className="w-10 h-10 border-2 border-[#059669]/20 border-t-[#059669] rounded-full animate-spin mb-3" />
                  <p className="text-sm text-gray-400">{t("admin.customers.loading")}</p>
                </div>
              ) : filtered.length === 0 ? (
                <div className="p-16 text-center">
                  <Users className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                  <p className="text-gray-400 text-sm">{t("admin.customers.empty")}</p>
                </div>
              ) : (
                <>
                  <table className="w-full">
                    <thead>
                      <tr className="text-[10px] font-bold text-gray-400 uppercase tracking-wider bg-gray-50/80">
                        <th className="px-5 py-4 text-left">{t("admin.customers.col.customer")}</th>
                        <th className="px-5 py-4 text-left">{t("admin.customers.col.plan")}</th>
                        <th className="px-5 py-4 text-left">{t("profile.quotaUsage")}</th>
                        <th className="px-5 py-4 text-left">{t("dash.col.status")}</th>
                        <th className="px-5 py-4 text-left">{t("admin.customers.col.created")}</th>
                        <th className="px-5 py-4 text-left">{t("admin.customers.col.actions")}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {filtered.map((user) => {
                        const qPct = user.monthlyQuota > 0 ? Math.min((user.quotaUsed / user.monthlyQuota) * 100, 100) : 0;
                        const initials = user.fullName.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase();
                        const avatarColor = getAvatarColor(user.fullName);
                        return (
                          <tr key={user.id} className="hover:bg-[#faf9f6] transition-colors group">
                            <td className="px-5 py-4">
                              <div className="flex items-center gap-3">
                                <div className={`w-9 h-9 rounded-xl ${avatarColor} flex items-center justify-center text-white font-bold text-sm shrink-0`}>
                                  {initials}
                                </div>
                                <div>
                                  <div className="flex items-center gap-1.5">
                                    <p className="text-sm font-semibold text-gray-900">{user.fullName}</p>
                                    {user.emailVerified
                                      ? <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                                      : <AlertTriangle className="w-3 h-3 text-amber-400" />
                                    }
                                  </div>
                                  <p className="text-xs text-gray-400">{user.email}</p>
                                  <p className="text-[10px] text-gray-300 font-mono uppercase">{user.id.slice(0, 8)}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-5 py-4">
                              <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${getPlanStyle(user.planName)}`}>
                                {user.planName}
                              </span>
                            </td>
                            <td className="px-5 py-4 min-w-36">
                              <div className="flex items-center gap-2 mb-1">
                                <div className="flex-1 bg-gray-100 rounded-full h-1.5">
                                  <div className="h-1.5 rounded-full transition-all" style={{ width: `${qPct}%`, backgroundColor: getQuotaBarColor(qPct) }} />
                                </div>
                                <span className="text-xs text-gray-500 shrink-0">{user.quotaUsed}/{user.monthlyQuota}</span>
                              </div>
                              <p className="text-[11px] text-gray-400">{t("admin.customers.pctUsed", { pct: qPct.toFixed(0) })}</p>
                            </td>
                            <td className="px-5 py-4">
                              <span className={`text-xs font-bold flex items-center gap-1.5 ${user.isActive ? "text-emerald-600" : "text-red-600"}`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${user.isActive ? "bg-emerald-500" : "bg-red-500"}`} />
                                {user.isActive ? t("admin.customers.status.active") : t("admin.customers.status.suspended")}
                              </span>
                            </td>
                            <td className="px-5 py-4 text-xs text-gray-400">
                              {user.createdAt ? new Date(user.createdAt).toLocaleDateString("vi-VN") : "—"}
                            </td>
                            <td className="px-5 py-4">
                              <div className="flex gap-2 opacity-70 group-hover:opacity-100 transition-opacity">
                                <button onClick={() => { setQuotaModal({ userId: user.id, name: user.fullName }); setQuotaValue("50"); }}
                                  className="px-3 py-1.5 text-xs font-bold bg-blue-50 text-blue-700 rounded-xl hover:bg-blue-100 border border-blue-200 transition-colors">
                                  {t("admin.customers.quotaBtn")}
                                </button>
                                <button onClick={() => handleRefund(user.id, user.fullName)}
                                  className="px-3 py-1.5 text-xs font-bold bg-amber-50 text-amber-700 rounded-xl hover:bg-amber-100 border border-amber-200 transition-colors">
                                  {t("admin.customers.refundBtn")}
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  <div className="px-5 py-4 border-t border-gray-100 flex items-center justify-between bg-gray-50/50">
                    <p className="text-xs text-gray-400">
                      {t("admin.customers.showingLabel")} <span className="font-semibold">{filtered.length}</span> {t("admin.customers.ofTotal", { total })}
                    </p>
                    <div className="flex items-center gap-2">
                      <button onClick={() => setPage(Math.max(0, page - 1))} disabled={page === 0}
                        className="px-3 py-1.5 border border-gray-200 rounded-xl text-xs text-gray-500 hover:bg-gray-50 disabled:opacity-40">
                        {t("admin.customers.prevPage")}
                      </button>
                      <span className="text-xs font-semibold text-gray-600 bg-white border border-gray-200 px-3 py-1.5 rounded-xl">
                        {t("admin.customers.pageLabel", { page: page + 1 })}
                      </span>
                      <button onClick={() => setPage(page + 1)} disabled={filtered.length < 20}
                        className="px-3 py-1.5 bg-gray-900 text-white rounded-xl text-xs font-semibold hover:bg-gray-700 disabled:opacity-40">
                        {t("admin.customers.nextPage")}
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>

        {/* Quota Modal */}
        {quotaModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl animate-scale-in">
              <h3 className="text-base font-bold text-gray-900 mb-1">{t("admin.customers.modal.title")}</h3>
              <p className="text-sm text-gray-500 mb-4">{t("admin.customers.modal.descPrefix")} <strong>{quotaModal.name}</strong></p>
              <input type="number" value={quotaValue} onChange={(e) => setQuotaValue(e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus-ms mb-4" min="0" />
              <div className="flex gap-3">
                <button onClick={handleSetQuota} className="flex-1 py-3 gradient-brand text-white font-bold rounded-xl hover:opacity-90 text-sm">
                  {t("admin.customers.modal.apply")}
                </button>
                <button onClick={() => setQuotaModal(null)} className="flex-1 py-3 border border-gray-200 text-gray-600 font-semibold rounded-xl hover:bg-gray-50 text-sm">
                  {t("admin.customers.modal.cancel")}
                </button>
              </div>
            </div>
          </div>
        )}
      </AdminShell>
    </AuthGuard>
  );
}

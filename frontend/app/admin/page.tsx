"use client";

import { useEffect, useState } from "react";
import {
  Users, FileText, AlertTriangle, Activity, TrendingUp, TrendingDown,
  ArrowUpRight, RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import { AuthGuard } from "@/components/shared/auth-guard";
import { AdminShell } from "@/components/admin/admin-shell";
import { getAnalyticsOverview, AnalyticsOverview } from "@/services/admin.service";
import { useLanguage } from "@/providers/language-provider";

function pctChange(current: number, previous: number): number | null {
  if (previous === 0) return current > 0 ? 100 : null;
  return ((current - previous) / previous) * 100;
}

function TrendBadge({ pct }: { pct: number | null }) {
  if (pct === null) return null;
  const isUp = pct >= 0;
  const Icon = isUp ? TrendingUp : TrendingDown;
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-semibold ${isUp ? "text-emerald-600" : "text-red-500"}`}>
      <Icon className="w-3.5 h-3.5" />
      {Math.abs(pct).toFixed(1)}%
    </span>
  );
}

function getRiskColor(level: string) {
  const l = level.toLowerCase();
  if (l.includes("high") || l.includes("critical")) return "bg-red-500";
  if (l.includes("medium")) return "bg-amber-500";
  return "bg-emerald-500";
}

export default function AdminOverviewPage() {
  const { t } = useLanguage();
  const [data, setData] = useState<AnalyticsOverview | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchOverview = async () => {
    try {
      const res = await getAnalyticsOverview();
      setData(res);
    } catch {
      toast.error(t("admin.dashboard.loadError"));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchOverview(); }, []);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchOverview();
    setTimeout(() => setIsRefreshing(false), 500);
  };

  return (
    <AuthGuard requiredRole="ADMIN">
      <AdminShell active="overview">
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-widest mb-1">{t("admin.dashboard.breadcrumb")}</p>
            <h1 className="text-2xl font-extrabold text-gray-900">{t("admin.dashboard.title")}</h1>
          </div>
          <button onClick={handleRefresh} disabled={isRefreshing}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-sm font-medium text-gray-600 rounded-xl hover:bg-gray-50 shadow-sm">
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? "animate-spin" : ""}`} />
          </button>
        </div>

        {isLoading || !data ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-16 flex flex-col items-center shadow-sm">
            <div className="w-10 h-10 border-2 border-[#00D26A]/20 border-t-[#00D26A] rounded-full animate-spin mb-3" />
            <p className="text-sm text-gray-400">{t("admin.dashboard.loading")}</p>
          </div>
        ) : (
          <>
            {/* Top metrics */}
            <div className="grid grid-cols-4 gap-4 mb-6">
              <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm card-hover">
                <div className="flex items-start justify-between mb-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
                    <Users className="w-5 h-5 text-blue-600" />
                  </div>
                  <ArrowUpRight className="w-4 h-4 text-gray-200" />
                </div>
                <p className="text-2xl font-extrabold text-gray-900">{data.totalUsers}</p>
                <p className="text-xs text-gray-500 mt-0.5">{t("admin.dashboard.totalUsers")}</p>
                <div className="mt-1 flex items-center gap-2">
                  <TrendBadge pct={pctChange(data.newUsersThisMonth, data.newUsersLastMonth)} />
                  <span className="text-[11px] text-gray-400">{t("admin.dashboard.newThisMonth", { count: data.newUsersThisMonth })}</span>
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm card-hover">
                <div className="flex items-start justify-between mb-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center">
                    <Activity className="w-5 h-5 text-emerald-600" />
                  </div>
                  <ArrowUpRight className="w-4 h-4 text-gray-200" />
                </div>
                <p className="text-2xl font-extrabold text-gray-900">{data.activeUsers}</p>
                <p className="text-xs text-gray-500 mt-0.5">{t("admin.dashboard.activeUsers")}</p>
                <p className="text-[11px] text-gray-400 mt-1">
                  {t("admin.dashboard.pctOfTotal", { pct: data.totalUsers > 0 ? ((data.activeUsers / data.totalUsers) * 100).toFixed(0) : 0 })}
                </p>
              </div>

              <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm card-hover">
                <div className="flex items-start justify-between mb-3">
                  <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center">
                    <FileText className="w-5 h-5 text-purple-600" />
                  </div>
                  <ArrowUpRight className="w-4 h-4 text-gray-200" />
                </div>
                <p className="text-2xl font-extrabold text-gray-900">{data.totalReports}</p>
                <p className="text-xs text-gray-500 mt-0.5">{t("admin.dashboard.totalReports")}</p>
                <div className="mt-1 flex items-center gap-2">
                  <TrendBadge pct={pctChange(data.reportsThisMonth, data.reportsLastMonth)} />
                  <span className="text-[11px] text-gray-400">{t("admin.dashboard.thisMonth", { count: data.reportsThisMonth })}</span>
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm card-hover">
                <div className="flex items-start justify-between mb-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center">
                    <AlertTriangle className="w-5 h-5 text-amber-600" />
                  </div>
                  <ArrowUpRight className="w-4 h-4 text-gray-200" />
                </div>
                <p className="text-2xl font-extrabold text-gray-900">{data.openAlerts}</p>
                <p className="text-xs text-gray-500 mt-0.5">{t("admin.dashboard.openAlerts")}</p>
                <p className="text-[11px] text-gray-400 mt-1">
                  {t("admin.dashboard.jobsStatus", { failed: data.failedJobs, running: data.runningJobs })}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-6">
              {/* Reports by status */}
              <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
                <p className="text-sm font-bold text-gray-900 mb-4">{t("admin.dashboard.reportsByStatus")}</p>
                <div className="space-y-3">
                  {Object.entries(data.reportsByStatus).length === 0 ? (
                    <p className="text-sm text-gray-400">{t("admin.dashboard.noData")}</p>
                  ) : (
                    Object.entries(data.reportsByStatus).map(([status, count]) => {
                      const pct = data.totalReports > 0 ? (count / data.totalReports) * 100 : 0;
                      return (
                        <div key={status}>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-semibold text-gray-600">{status}</span>
                            <span className="text-xs text-gray-400">{count}</span>
                          </div>
                          <div className="bg-gray-100 rounded-full h-1.5">
                            <div className="h-1.5 rounded-full bg-[#00D26A]" style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Reports by risk level */}
              <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
                <p className="text-sm font-bold text-gray-900 mb-4">{t("admin.dashboard.reportsByRisk")}</p>
                <div className="space-y-3">
                  {Object.entries(data.reportsByRiskLevel).length === 0 ? (
                    <p className="text-sm text-gray-400">{t("admin.dashboard.noData")}</p>
                  ) : (
                    Object.entries(data.reportsByRiskLevel).map(([level, count]) => {
                      const pct = data.totalReports > 0 ? (count / data.totalReports) * 100 : 0;
                      return (
                        <div key={level}>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-semibold text-gray-600">{level}</span>
                            <span className="text-xs text-gray-400">{count}</span>
                          </div>
                          <div className="bg-gray-100 rounded-full h-1.5">
                            <div className={`h-1.5 rounded-full ${getRiskColor(level)}`} style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Top companies */}
              <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
                <p className="text-sm font-bold text-gray-900 mb-4">{t("admin.dashboard.topCompanies")}</p>
                {data.topCompanies.length === 0 ? (
                  <p className="text-sm text-gray-400">{t("admin.dashboard.noData")}</p>
                ) : (
                  <div className="space-y-2">
                    {data.topCompanies.map((c, i) => (
                      <div key={c.name} className="flex items-center justify-between py-1.5">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className="text-xs font-bold text-gray-400 w-5 shrink-0">#{i + 1}</span>
                          <span className="text-sm text-gray-700 truncate">{c.name}</span>
                        </div>
                        <span className="text-xs font-semibold text-gray-500 shrink-0">{t("admin.dashboard.lookupCount", { count: c.count })}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Users by plan */}
              <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
                <p className="text-sm font-bold text-gray-900 mb-4">{t("admin.dashboard.usersByPlan")}</p>
                {Object.entries(data.usersByPlan).length === 0 ? (
                  <p className="text-sm text-gray-400">{t("admin.dashboard.noData")}</p>
                ) : (
                  <div className="space-y-3">
                    {Object.entries(data.usersByPlan).map(([plan, count]) => {
                      const pct = data.totalUsers > 0 ? (count / data.totalUsers) * 100 : 0;
                      return (
                        <div key={plan}>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-semibold text-gray-600">{plan}</span>
                            <span className="text-xs text-gray-400">{count}</span>
                          </div>
                          <div className="bg-gray-100 rounded-full h-1.5">
                            <div className="h-1.5 rounded-full bg-blue-500" style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </AdminShell>
    </AuthGuard>
  );
}

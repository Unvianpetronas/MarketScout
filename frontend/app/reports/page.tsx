"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  FileText, Search, Filter, Download, Clock, CheckCircle2,
  XCircle, AlertTriangle, Globe, Calendar, ChevronRight,
  BarChart3, RefreshCw, Zap
} from "lucide-react";
import { toast } from "sonner";
import { AuthGuard } from "@/components/shared/auth-guard";
import { Sidebar } from "@/components/layout/sidebar";
import { useLanguage } from "@/providers/language-provider";
import { getReports } from "@/services/report.service";
import { ReportListItem, isProcessingStatus, isHighRiskLevel } from "@/types/report";

type StatusFilter = "all" | "DONE" | "PROCESSING" | "FAILED";
type T = (key: string, vars?: Record<string, string | number>) => string;

function getRiskInfo(risk: string | null | undefined, t: T) {
  if (risk === "Thấp") return { color: "text-emerald-600", bg: "bg-emerald-50 border-emerald-200", label: t("risk.low") };
  if (risk === "Trung bình") return { color: "text-amber-600", bg: "bg-amber-50 border-amber-200", label: t("risk.medium") };
  if (risk === "Cao") return { color: "text-red-600", bg: "bg-red-50 border-red-200", label: t("risk.high") };
  if (risk === "Nghiêm trọng") return { color: "text-red-700", bg: "bg-red-100 border-red-300", label: t("risk.critical") };
  return { color: "text-gray-400", bg: "bg-gray-50 border-gray-200", label: risk || "—" };
}

function getStatusInfo(status: string | null | undefined, t: T) {
  if (status === "DONE") return { icon: CheckCircle2, iconColor: "text-emerald-500", label: t("status.completed"), bg: "bg-emerald-50 text-emerald-700 border-emerald-200" };
  if (isProcessingStatus(status)) return { icon: Clock, iconColor: "text-blue-500", label: t("status.processing"), bg: "bg-blue-50 text-blue-700 border-blue-200" };
  if (status === "HARD_STOP") return { icon: XCircle, iconColor: "text-red-600", label: t("reports.status.hardStop"), bg: "bg-red-50 text-red-700 border-red-200" };
  if (status === "FAILED") return { icon: XCircle, iconColor: "text-red-500", label: t("status.failed"), bg: "bg-red-50 text-red-700 border-red-200" };
  return { icon: Clock, iconColor: "text-gray-400", label: status || "—", bg: "bg-gray-50 text-gray-600 border-gray-200" };
}

function ScoreCircle({ score }: { score: number | null | undefined }) {
  if (!score && score !== 0) return <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center text-xs text-gray-300">—</div>;
  const color = score < 40 ? "#00D26A" : score < 70 ? "#F59E0B" : "#EF4444";
  const bg = score < 40 ? "#E6F9F0" : score < 70 ? "#FFF8E7" : "#FFF1F0";
  return (
    <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-extrabold" style={{ backgroundColor: bg, color }}>
      {score}
    </div>
  );
}

export default function ReportsPage() {
  const { t } = useLanguage();
  const [reports, setReports] = useState<ReportListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchReports = async () => {
    try {
      const data = await getReports();
      setReports(data);
    } catch {
      toast.error(t("reports.errLoad"));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { Promise.resolve().then(fetchReports); }, []);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchReports();
    setTimeout(() => setIsRefreshing(false), 500);
  };

  const filtered = reports.filter((r) => {
    const matchSearch = !search || r.entityName?.toLowerCase().includes(search.toLowerCase())
      || r.countryIso2?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all"
      || (statusFilter === "PROCESSING" ? isProcessingStatus(r.status) : r.status === statusFilter);
    return matchSearch && matchStatus;
  });

  const stats = {
    total: reports.length,
    completed: reports.filter((r) => r.status === "DONE").length,
    processing: reports.filter((r) => isProcessingStatus(r.status)).length,
    highRisk: reports.filter((r) => isHighRiskLevel(r.riskLevel)).length,
  };

  return (
    <AuthGuard>
      <div className="flex h-screen overflow-hidden bg-[#FAFBFA]">
        <Sidebar active="reports" />
        <div className="flex-1 overflow-y-auto scrollbar-thin">
          <div className="max-w-6xl mx-auto px-6 py-8">

            {/* ── Header ── */}
            <div className="flex items-start justify-between mb-6 animate-fade-in-up">
              <div>
                <h1 className="text-2xl font-extrabold text-gray-900 mb-1">{t("reports.title")}</h1>
                <p className="text-sm text-gray-400">{t("reports.subtitle")}</p>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={handleRefresh} disabled={isRefreshing}
                  className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-sm font-medium text-gray-600 rounded-xl hover:bg-gray-50 shadow-sm">
                  <RefreshCw className={`w-4 h-4 ${isRefreshing ? "animate-spin" : ""}`} />
                  {t("reports.refresh")}
                </button>
                <button onClick={() => toast.info(t("profile.soon"))}
                  className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-sm font-medium text-gray-600 rounded-xl hover:bg-gray-50 shadow-sm">
                  <Download className="w-4 h-4" /> {t("reports.exportBtn")}
                </button>
                <Link href="/verify"
                  className="flex items-center gap-2 px-4 py-2 gradient-brand text-white text-sm font-semibold rounded-xl hover:opacity-90 shadow-sm">
                  <Zap className="w-4 h-4" /> {t("nav.newVerify")}
                </Link>
              </div>
            </div>

            {/* ── Stats ── */}
            <div className="grid grid-cols-4 gap-4 mb-6">
              {[
                { label: t("dash.stat.totalReports"), value: stats.total, icon: FileText, color: "text-blue-600", bg: "bg-blue-50" },
                { label: t("status.completed"), value: stats.completed, icon: CheckCircle2, color: "text-emerald-600", bg: "bg-emerald-50" },
                { label: t("status.processing"), value: stats.processing, icon: Clock, color: "text-amber-600", bg: "bg-amber-50" },
                { label: t("reports.stat.highRisk"), value: stats.highRisk, icon: AlertTriangle, color: "text-red-600", bg: "bg-red-50" },
              ].map(({ label, value, icon: Icon, color, bg }) => (
                <div key={label} className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs text-gray-500 font-medium">{label}</p>
                    <div className={`w-8 h-8 rounded-xl ${bg} flex items-center justify-center`}>
                      <Icon className={`w-4 h-4 ${color}`} />
                    </div>
                  </div>
                  <p className={`text-2xl font-extrabold ${color}`}>{value}</p>
                </div>
              ))}
            </div>

            {/* ── Filters ── */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-5 flex items-center gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
                <input value={search} onChange={(e) => setSearch(e.target.value)}
                  placeholder={t("reports.searchPlaceholder")}
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus-ms" />
              </div>
              <div className="flex items-center gap-2">
                {(["all", "DONE", "PROCESSING", "FAILED"] as StatusFilter[]).map((s) => (
                  <button key={s} onClick={() => setStatusFilter(s)}
                    className={`px-3 py-2 rounded-xl text-xs font-semibold border transition-all ${
                      statusFilter === s
                        ? "gradient-brand text-white border-transparent"
                        : "bg-gray-50 text-gray-500 border-gray-200 hover:border-gray-300"
                    }`}>
                    {s === "all" ? t("reports.filter.all") : s === "DONE" ? t("status.completed") : s === "PROCESSING" ? t("status.processing") : t("status.failed")}
                  </button>
                ))}
              </div>
            </div>

            {/* ── Table ── */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              {isLoading ? (
                <div className="flex flex-col items-center py-20">
                  <div className="w-10 h-10 border-2 border-[#00D26A]/20 border-t-[#00D26A] rounded-full animate-spin mb-3" />
                  <p className="text-sm text-gray-400">{t("reports.loading")}</p>
                </div>
              ) : filtered.length === 0 ? (
                <div className="flex flex-col items-center py-20">
                  <FileText className="w-12 h-12 text-gray-100 mb-4" />
                  <p className="text-gray-500 font-semibold mb-1">
                    {reports.length === 0 ? t("dash.noReports") : t("reports.noResults")}
                  </p>
                  <p className="text-sm text-gray-400 mb-4">
                    {reports.length === 0 ? t("dash.noReportsSub") : t("reports.tryDifferentFilter")}
                  </p>
                  {reports.length === 0 && (
                    <Link href="/verify"
                      className="flex items-center gap-2 px-5 py-2.5 gradient-brand text-white font-semibold rounded-xl hover:opacity-90 text-sm">
                      <Zap className="w-4 h-4" /> {t("reports.verifyNow")}
                    </Link>
                  )}
                </div>
              ) : (
                <>
                  <table className="w-full">
                    <thead>
                      <tr className="text-[10px] font-bold text-gray-400 uppercase tracking-wider bg-gray-50/80">
                        <th className="px-5 py-4 text-left">{t("dash.col.company")}</th>
                        <th className="px-5 py-4 text-left">{t("dash.col.riskScore")}</th>
                        <th className="px-5 py-4 text-left">{t("dash.col.riskLevel")}</th>
                        <th className="px-5 py-4 text-left">{t("dash.col.status")}</th>
                        <th className="px-5 py-4 text-left">{t("dash.col.date")}</th>
                        <th className="px-5 py-4 text-left"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {filtered.map((report) => {
                        const { icon: StatusIcon, iconColor, bg: statusBg, label: statusLabel } = getStatusInfo(report.status, t);
                        const { color: riskColor, bg: riskBg, label: riskLabel } = getRiskInfo(report.riskLevel, t);
                        const isProcessing = isProcessingStatus(report.status);
                        return (
                          <tr key={report.id} className="hover:bg-[#FAFBFA] transition-colors group">
                            <td className="px-5 py-4">
                              <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center text-gray-500 font-bold text-sm shrink-0">
                                  {(report.entityName || "?").slice(0, 2).toUpperCase()}
                                </div>
                                <div>
                                  <div className="flex items-center gap-2">
                                    <p className="text-sm font-semibold text-gray-900">{report.entityName}</p>
                                    {report.hardStop && (
                                      <span className="text-[10px] font-bold text-red-700 bg-red-50 border border-red-200 px-1.5 py-0.5 rounded">
                                        {t("reports.badge.hardStop")}
                                      </span>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-2 text-xs text-gray-400">
                                    {report.countryIso2 && (
                                      <span className="flex items-center gap-1">
                                        <Globe className="w-3 h-3" /> {report.countryIso2}
                                      </span>
                                    )}
                                    <span className="text-[10px] font-mono text-gray-300">{report.id?.slice(0, 8).toUpperCase()}</span>
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="px-5 py-4">
                              <ScoreCircle score={report.overallScore} />
                            </td>
                            <td className="px-5 py-4">
                              <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${riskBg} ${riskColor}`}>
                                {riskLabel}
                              </span>
                            </td>
                            <td className="px-5 py-4">
                              <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border ${statusBg}`}>
                                {isProcessing
                                  ? <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                                  : <StatusIcon className={`w-3 h-3 ${iconColor}`} />
                                }
                                {statusLabel}
                              </span>
                            </td>
                            <td className="px-5 py-4 text-xs text-gray-400">
                              <div className="flex items-center gap-1.5">
                                <Calendar className="w-3 h-3" />
                                {report.createdAt
                                  ? new Date(report.createdAt as string).toLocaleDateString("vi-VN")
                                  : "—"
                                }
                              </div>
                            </td>
                            <td className="px-5 py-4">
                              <Link href={`/reports/${report.id}`}
                                className="flex items-center gap-1 text-xs font-semibold text-[#00D26A] hover:underline opacity-0 group-hover:opacity-100 transition-opacity">
                                {t("reports.viewDetails")} <ChevronRight className="w-3.5 h-3.5" />
                              </Link>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  <div className="px-5 py-4 border-t border-gray-100 flex items-center justify-between bg-gray-50/30">
                    <p className="text-xs text-gray-400">
                      {t("reports.showingPrefix")} <span className="font-semibold text-gray-700">{filtered.length}</span> / {reports.length} {t("reports.showingSuffix")}
                    </p>
                    {filtered.length !== reports.length && (
                      <button onClick={() => { setSearch(""); setStatusFilter("all"); }}
                        className="text-xs text-[#00D26A] hover:underline font-semibold">
                        {t("reports.clearFilters")}
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>

          </div>
        </div>
      </div>
    </AuthGuard>
  );
}

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  FileText, Search, ExternalLink, RefreshCw, TrendingUp,
  Shield, AlertTriangle, CheckCircle2, Clock, Globe,
  ArrowUpRight, ArrowDownRight, Zap, BarChart3, Building2,
  ChevronRight, Info, Plus
} from "lucide-react";
import { toast } from "sonner";
import { AuthGuard } from "@/components/shared/auth-guard";
import { Sidebar } from "@/components/layout/sidebar";
import { useAuth } from "@/providers/auth-provider";
import { useLanguage } from "@/providers/language-provider";
import { getReports } from "@/services/report.service";
import { ReportListItem } from "@/types/report";

function getRiskBadge(risk: string) {
  switch (risk) {
    case "LOW": return "risk-low";
    case "MEDIUM": return "risk-medium";
    case "HIGH": return "risk-high";
    case "CRITICAL": return "risk-critical";
    default: return "bg-gray-100 text-gray-600 border border-gray-200";
  }
}

function getScoreRing(score: number) {
  if (score >= 75) return { color: "#00D26A", labelKey: "score.low", cls: "score-excellent" };
  if (score >= 50) return { color: "#84CC16", labelKey: "score.lowMid", cls: "score-good" };
  if (score >= 30) return { color: "#F59E0B", labelKey: "score.highMid", cls: "score-medium" };
  return { color: "#EF4444", labelKey: "score.high", cls: "score-poor" };
}

function StatCard({
  title, value, sub, icon: Icon, trend, color, href
}: {
  title: string; value: string | number; sub: string;
  icon: React.ElementType; trend?: { value: number; label: string };
  color: string; href?: string;
}) {
  const inner = (
    <div className={`bg-white rounded-2xl border border-gray-100 p-5 shadow-sm card-hover group cursor-pointer`}>
      <div className="flex items-start justify-between mb-4">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center`} style={{ backgroundColor: `${color}15` }}>
          <Icon className="w-5 h-5" style={{ color }} />
        </div>
        {trend && (
          <span className={`flex items-center gap-1 text-xs font-semibold ${trend.value >= 0 ? "text-emerald-600" : "text-red-500"}`}>
            {trend.value >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
            {Math.abs(trend.value)}%
          </span>
        )}
      </div>
      <p className="text-2xl font-extrabold text-gray-900 mb-1">{value}</p>
      <p className="text-xs text-gray-500 font-medium">{title}</p>
      <p className="text-[11px] text-gray-400 mt-0.5">{sub}</p>
    </div>
  );
  return href ? <Link href={href}>{inner}</Link> : inner;
}

function ScoreCircle({ score }: { score: number }) {
  const { t } = useLanguage();
  const { color, labelKey } = getScoreRing(score);
  const radius = 20;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  return (
    <div className="flex items-center gap-2">
      <svg width="48" height="48" viewBox="0 0 48 48">
        <circle cx="24" cy="24" r={radius} fill="none" stroke="#F0F5F2" strokeWidth="4" />
        <circle
          cx="24" cy="24" r={radius} fill="none"
          stroke={color} strokeWidth="4"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform="rotate(-90 24 24)"
          style={{ transition: "stroke-dashoffset 0.8s ease" }}
        />
        <text x="24" y="28" textAnchor="middle" fontSize="11" fontWeight="700" fill={color}>{score}</text>
      </svg>
      <div>
        <p className="text-xs font-bold" style={{ color }}>{t("dash.riskPrefix")} {t(labelKey)}</p>
      </div>
    </div>
  );
}

function ActivityFeed({ reports }: { reports: ReportListItem[] }) {
  const { t } = useLanguage();
  const recent = reports.slice(0, 5);
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      <h3 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
        <Clock className="w-4 h-4 text-[#00D26A]" />
        {t("dash.recentActivity")}
      </h3>
      {recent.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-6">{t("dash.noActivity")}</p>
      ) : (
        <div className="space-y-3">
          {recent.map((r) => (
            <div key={r.id} className="flex items-start gap-3">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                r.status === "COMPLETED" ? "bg-emerald-50" : r.status === "FAILED" ? "bg-red-50" : "bg-blue-50"
              }`}>
                {r.status === "COMPLETED" ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                ) : r.status === "FAILED" ? (
                  <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
                ) : (
                  <RefreshCw className="w-3.5 h-3.5 text-blue-400 animate-spin" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-gray-800 truncate">{r.entityName}</p>
                <p className="text-[11px] text-gray-400">
                  {r.countryIso2 || "—"} · {r.createdAt ? new Date(r.createdAt).toLocaleDateString("vi-VN") : "—"}
                </p>
              </div>
              <Link href={`/reports/${r.id}`} className="text-[#00D26A] hover:text-[#00843F] transition-colors">
                <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const router = useRouter();
  const [reports, setReports] = useState<ReportListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [quickSearch, setQuickSearch] = useState("");
  const [quickCountry, setQuickCountry] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);

  useEffect(() => {
    getReports()
      .catch(() => [] as ReportListItem[])
      .then((r) => { setReports(r); setIsLoading(false); });
  }, []);

  const handleQuickVerify = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickSearch.trim()) { toast.error(t("dash.errEnterName")); return; }
    router.push(`/verify?q=${encodeURIComponent(quickSearch)}&country=${quickCountry}`);
  };

  const totalReports = reports.length;
  const completed = reports.filter((r) => r.status === "COMPLETED").length;
  const highRisk = reports.filter((r) => (r.riskLevel as string) === "HIGH" || (r.riskLevel as string) === "CRITICAL").length;
  const processing = reports.filter((r) => (r.status as string) === "PROCESSING" || (r.status as string) === "DEEP_SCANNING").length;

  const hour = new Date().getHours();
  const greeting = hour < 12 ? t("dash.greetingMorning") : hour < 18 ? t("dash.greetingAfternoon") : t("dash.greetingEvening");

  return (
    <AuthGuard>
      <div className="h-screen flex overflow-hidden bg-[#FAFBFA]">
        <Sidebar active="dashboard" />
        <div className="flex-1 overflow-y-auto scrollbar-thin">
          <main className="max-w-7xl mx-auto px-6 py-8 space-y-6">

            {/* ── Header ── */}
            <div className="flex items-start justify-between animate-fade-in-up">
              <div>
                <p className="text-sm text-gray-400 font-medium mb-1">{greeting} 👋</p>
                <h1 className="text-2xl font-extrabold text-gray-900">
                  {user?.fullName?.split(" ").slice(-1)[0] || t("chat.you")},
                  <span className="text-gray-400 font-normal">{t("dash.overviewToday")}</span>
                </h1>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => router.push("/chat")}
                  className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-600 text-sm font-medium rounded-xl hover:bg-gray-50 transition-colors shadow-sm"
                >
                  <Zap className="w-4 h-4 text-[#00D26A]" />
                  {t("dash.askAi")}
                </button>
                <button
                  onClick={() => router.push("/verify")}
                  className="flex items-center gap-2 px-4 py-2 gradient-brand text-white text-sm font-semibold rounded-xl hover:opacity-90 transition-opacity shadow-sm"
                >
                  <Plus className="w-4 h-4" />
                  {t("nav.newVerify")}
                </button>
              </div>
            </div>

            {/* ── Stat Cards ── */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 stagger">
              <StatCard
                title={t("dash.stat.totalReports")} value={totalReports}
                sub={t("dash.stat.completedSuffix", { n: completed })}
                icon={FileText} color="#00D26A"
                trend={{ value: 12, label: "" }}
                href="/reports"
              />
              <StatCard
                title={t("dash.stat.processing")} value={processing}
                sub={t("dash.stat.processingSub")}
                icon={RefreshCw} color="#0EA5E9"
                href="/reports"
              />
              <StatCard
                title={t("dash.stat.highRisk")} value={highRisk}
                sub={t("dash.stat.highRiskSub")}
                icon={AlertTriangle} color="#EF4444"
                trend={highRisk > 0 ? { value: -5, label: "" } : undefined}
                href="/reports"
              />
              <StatCard
                title={t("dash.stat.countries")} value={new Set(reports.map((r) => r.countryIso2).filter(Boolean)).size}
                sub={t("dash.stat.countriesSub")}
                icon={Globe} color="#8B5CF6"
              />
            </div>

            {/* ── Quick Verify ── */}
            <div className={`bg-white rounded-2xl border shadow-sm p-6 transition-all duration-200 ${
              searchFocused ? "border-[#00D26A] ring-2 ring-[#00D26A]/15" : "border-gray-100"
            } animate-fade-in-up`}>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 bg-[#E6F9F0] rounded-xl flex items-center justify-center">
                  <Search className="w-4 h-4 text-[#00D26A]" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-gray-900">{t("dash.quickVerify")}</h2>
                  <p className="text-xs text-gray-400">{t("dash.quickVerifySub")}</p>
                </div>
              </div>
              <form onSubmit={handleQuickVerify} className="flex gap-3 flex-wrap">
                <div className="flex-1 relative min-w-48">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
                  <input
                    value={quickSearch}
                    onChange={(e) => setQuickSearch(e.target.value)}
                    onFocus={() => setSearchFocused(true)}
                    onBlur={() => setSearchFocused(false)}
                    placeholder={t("dash.quickPlaceholder")}
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus-ms transition-all"
                  />
                </div>
                <select
                  value={quickCountry}
                  onChange={(e) => setQuickCountry(e.target.value)}
                  className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus-ms bg-white text-gray-700"
                >
                  <option value="">{t("country.all")}</option>
                  <option value="VN">{t("country.vn")}</option>
                  <option value="CN">{t("country.cn")}</option>
                  <option value="US">{t("country.us")}</option>
                  <option value="DE">{t("country.de")}</option>
                  <option value="GB">{t("country.gb")}</option>
                  <option value="JP">{t("country.jp")}</option>
                  <option value="KR">{t("country.kr")}</option>
                  <option value="IN">{t("country.in")}</option>
                  <option value="SG">{t("country.sg")}</option>
                </select>
                <button
                  type="submit"
                  className="px-6 py-2.5 gradient-brand text-white font-semibold rounded-xl hover:opacity-90 transition-opacity text-sm shadow-sm"
                >
                  {t("dash.startVerify")}
                </button>
              </form>
            </div>

            {/* ── Main Content Grid ── */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Reports Table — 2/3 */}
              <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm">
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-50">
                  <h2 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-[#00D26A]" />
                    {t("dash.recentReports")}
                  </h2>
                  <Link href="/reports" className="text-xs text-[#00D26A] hover:text-[#00843F] font-semibold flex items-center gap-1">
                    {t("dash.viewAll")} <ChevronRight className="w-3 h-3" />
                  </Link>
                </div>

                {isLoading ? (
                  <div className="p-6 space-y-3">
                    {[...Array(4)].map((_, i) => (
                      <div key={i} className="h-12 shimmer rounded-xl" />
                    ))}
                  </div>
                ) : reports.length === 0 ? (
                  <div className="p-12 text-center">
                    <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                      <FileText className="w-8 h-8 text-gray-200" />
                    </div>
                    <p className="text-gray-500 text-sm font-medium mb-1">{t("dash.noReports")}</p>
                    <p className="text-gray-400 text-xs mb-4">{t("dash.noReportsSub")}</p>
                    <Link
                      href="/verify"
                      className="inline-flex items-center gap-2 px-4 py-2 gradient-brand text-white text-sm font-semibold rounded-xl"
                    >
                      <Plus className="w-4 h-4" />
                      {t("dash.createFirst")}
                    </Link>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="text-[11px] font-bold text-gray-400 uppercase tracking-wider bg-gray-50/60">
                          <th className="px-6 py-3 text-left">{t("dash.col.company")}</th>
                          <th className="px-6 py-3 text-left">{t("dash.col.country")}</th>
                          <th className="px-6 py-3 text-left">{t("dash.col.riskScore")}</th>
                          <th className="px-6 py-3 text-left">{t("dash.col.riskLevel")}</th>
                          <th className="px-6 py-3 text-left">{t("dash.col.status")}</th>
                          <th className="px-6 py-3 text-left">{t("dash.col.date")}</th>
                          <th className="px-6 py-3 text-left"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {reports.slice(0, 8).map((report) => (
                          <tr key={report.id} className="hover:bg-[#FAFBFA] transition-colors group">
                            <td className="px-6 py-3.5">
                              <div className="flex items-center gap-2.5">
                                <div className="w-7 h-7 bg-gray-100 rounded-lg flex items-center justify-center shrink-0">
                                  <Building2 className="w-3.5 h-3.5 text-gray-400" />
                                </div>
                                <span className="text-sm font-semibold text-gray-900 truncate max-w-[140px]">
                                  {report.entityName}
                                </span>
                              </div>
                            </td>
                            <td className="px-6 py-3.5 text-sm text-gray-500">{report.countryIso2 || "—"}</td>
                            <td className="px-6 py-3.5">
                              <ScoreCircle score={report.overallScore} />
                            </td>
                            <td className="px-6 py-3.5">
                              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full whitespace-nowrap ${getRiskBadge(report.riskLevel)}`}>
                                {report.riskLevel === "LOW" ? t("risk.low") :
                                  report.riskLevel === "MEDIUM" ? t("risk.medium") :
                                  report.riskLevel === "HIGH" ? t("risk.high") : report.riskLevel || "—"}
                              </span>
                            </td>
                            <td className="px-6 py-3.5">
                              <span className={`flex items-center gap-1.5 text-xs font-medium ${
                                report.status === "COMPLETED" ? "text-emerald-600" :
                                report.status === "PROCESSING" ? "text-blue-500" :
                                report.status === "FAILED" ? "text-red-500" : "text-gray-400"
                              }`}>
                                {report.status === "COMPLETED" && <CheckCircle2 className="w-3 h-3" />}
                                {report.status === "PROCESSING" && (
                                  <RefreshCw className="w-3 h-3 animate-spin" />
                                )}
                                {report.status === "FAILED" && <AlertTriangle className="w-3 h-3" />}
                                {report.status === "COMPLETED" ? t("status.completed") :
                                  report.status === "PROCESSING" ? t("status.processing") :
                                  report.status === "FAILED" ? t("status.failed") : report.status}
                              </span>
                            </td>
                            <td className="px-6 py-3.5 text-xs text-gray-400">
                              {report.createdAt ? new Date(report.createdAt).toLocaleDateString("vi-VN") : "—"}
                            </td>
                            <td className="px-6 py-3.5">
                              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Link
                                  href={`/reports/${report.id}`}
                                  className="p-1.5 text-gray-400 hover:text-[#00D26A] hover:bg-[#E6F9F0] rounded-lg transition-colors"
                                >
                                  <ExternalLink className="w-3.5 h-3.5" />
                                </Link>
                                <button
                                  onClick={() => router.push(`/verify?rescan=${report.id}`)}
                                  className="p-1.5 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                                >
                                  <RefreshCw className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Sidebar Widgets — 1/3 */}
              <div className="space-y-4">
                <ActivityFeed reports={reports} />

                {/* Plan CTA */}
                <div className="relative bg-gradient-to-br from-[#0A1A12] to-[#0D2218] rounded-2xl p-5 overflow-hidden">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-[#00D26A]/10 rounded-full -translate-y-8 translate-x-8" />
                  <div className="absolute bottom-0 left-0 w-16 h-16 bg-[#00D26A]/5 rounded-full translate-y-6 -translate-x-6" />
                  <div className="relative">
                    <span className="text-[10px] font-bold text-[#5FD48A] uppercase tracking-widest">{t("dash.upgrade")}</span>
                    <h3 className="text-white font-bold text-base mt-1 mb-2">{t("dash.unlockAll")}</h3>
                    <p className="text-[#7BAA8C] text-xs mb-4">{t("dash.unlockDesc")}</p>
                    <Link
                      href="/pricing"
                      className="inline-flex items-center gap-2 px-4 py-2 bg-[#00D26A] text-white text-sm font-bold rounded-xl hover:bg-[#00B85D] transition-colors"
                    >
                      {t("dash.viewPlans")} <ChevronRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>

                {/* Quick Tips */}
                <div className="bg-blue-50 rounded-2xl p-4 border border-blue-100">
                  <div className="flex items-start gap-3">
                    <Info className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-bold text-blue-800 mb-1">{t("dash.tip")}</p>
                      <p className="text-xs text-blue-600">
                        {t("dash.tipText")}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

          </main>
        </div>
      </div>
    </AuthGuard>
  );
}

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
  if (score >= 75) return { color: "#00D26A", label: "Thấp", cls: "score-excellent" };
  if (score >= 50) return { color: "#84CC16", label: "Trung bình thấp", cls: "score-good" };
  if (score >= 30) return { color: "#F59E0B", label: "Trung bình cao", cls: "score-medium" };
  return { color: "#EF4444", label: "Cao", cls: "score-poor" };
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
  const { color, label } = getScoreRing(score);
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
        <p className="text-xs font-bold" style={{ color }}>Rủi ro {label}</p>
      </div>
    </div>
  );
}

function ActivityFeed({ reports }: { reports: ReportListItem[] }) {
  const recent = reports.slice(0, 5);
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      <h3 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
        <Clock className="w-4 h-4 text-[#00D26A]" />
        Hoạt động gần đây
      </h3>
      {recent.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-6">Chưa có hoạt động</p>
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
    if (!quickSearch.trim()) { toast.error("Vui lòng nhập tên doanh nghiệp."); return; }
    router.push(`/verify?q=${encodeURIComponent(quickSearch)}&country=${quickCountry}`);
  };

  const totalReports = reports.length;
  const completed = reports.filter((r) => r.status === "COMPLETED").length;
  const highRisk = reports.filter((r) => (r.riskLevel as string) === "HIGH" || (r.riskLevel as string) === "CRITICAL").length;
  const processing = reports.filter((r) => (r.status as string) === "PROCESSING" || (r.status as string) === "DEEP_SCANNING").length;

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Chào buổi sáng" : hour < 18 ? "Chào buổi chiều" : "Chào buổi tối";

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
                  {user?.fullName?.split(" ").slice(-1)[0] || "Bạn"},
                  <span className="text-gray-400 font-normal"> đây là tổng quan hôm nay.</span>
                </h1>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => router.push("/chat")}
                  className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-600 text-sm font-medium rounded-xl hover:bg-gray-50 transition-colors shadow-sm"
                >
                  <Zap className="w-4 h-4 text-[#00D26A]" />
                  Hỏi AI
                </button>
                <button
                  onClick={() => router.push("/verify")}
                  className="flex items-center gap-2 px-4 py-2 gradient-brand text-white text-sm font-semibold rounded-xl hover:opacity-90 transition-opacity shadow-sm"
                >
                  <Plus className="w-4 h-4" />
                  Thẩm định mới
                </button>
              </div>
            </div>

            {/* ── Stat Cards ── */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 stagger">
              <StatCard
                title="Tổng báo cáo" value={totalReports}
                sub={`${completed} hoàn thành`}
                icon={FileText} color="#00D26A"
                trend={{ value: 12, label: "so với tháng trước" }}
                href="/reports"
              />
              <StatCard
                title="Đang xử lý" value={processing}
                sub="đang quét dữ liệu"
                icon={RefreshCw} color="#0EA5E9"
                href="/reports"
              />
              <StatCard
                title="Cảnh báo rủi ro cao" value={highRisk}
                sub="cần xem xét ngay"
                icon={AlertTriangle} color="#EF4444"
                trend={highRisk > 0 ? { value: -5, label: "giảm so với tháng trước" } : undefined}
                href="/reports"
              />
              <StatCard
                title="Quốc gia đã quét" value={new Set(reports.map((r) => r.countryIso2).filter(Boolean)).size}
                sub="190+ quốc gia hỗ trợ"
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
                  <h2 className="text-sm font-bold text-gray-900">Thẩm định nhanh</h2>
                  <p className="text-xs text-gray-400">Nhập tên công ty để bắt đầu thẩm định 8 trụ cột</p>
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
                    placeholder="Tên công ty, mã số thuế..."
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus-ms transition-all"
                  />
                </div>
                <select
                  value={quickCountry}
                  onChange={(e) => setQuickCountry(e.target.value)}
                  className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus-ms bg-white text-gray-700"
                >
                  <option value="">Tất cả quốc gia</option>
                  <option value="VN">🇻🇳 Việt Nam</option>
                  <option value="CN">🇨🇳 Trung Quốc</option>
                  <option value="US">🇺🇸 Hoa Kỳ</option>
                  <option value="DE">🇩🇪 Đức</option>
                  <option value="GB">🇬🇧 Anh Quốc</option>
                  <option value="JP">🇯🇵 Nhật Bản</option>
                  <option value="KR">🇰🇷 Hàn Quốc</option>
                  <option value="IN">🇮🇳 Ấn Độ</option>
                  <option value="SG">🇸🇬 Singapore</option>
                </select>
                <button
                  type="submit"
                  className="px-6 py-2.5 gradient-brand text-white font-semibold rounded-xl hover:opacity-90 transition-opacity text-sm shadow-sm"
                >
                  Bắt đầu thẩm định →
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
                    Báo cáo gần đây
                  </h2>
                  <Link href="/reports" className="text-xs text-[#00D26A] hover:text-[#00843F] font-semibold flex items-center gap-1">
                    Xem tất cả <ChevronRight className="w-3 h-3" />
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
                    <p className="text-gray-500 text-sm font-medium mb-1">Chưa có báo cáo nào</p>
                    <p className="text-gray-400 text-xs mb-4">Bắt đầu thẩm định doanh nghiệp đầu tiên của bạn</p>
                    <Link
                      href="/verify"
                      className="inline-flex items-center gap-2 px-4 py-2 gradient-brand text-white text-sm font-semibold rounded-xl"
                    >
                      <Plus className="w-4 h-4" />
                      Tạo báo cáo đầu tiên
                    </Link>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="text-[11px] font-bold text-gray-400 uppercase tracking-wider bg-gray-50/60">
                          <th className="px-6 py-3 text-left">Doanh nghiệp</th>
                          <th className="px-6 py-3 text-left">Quốc gia</th>
                          <th className="px-6 py-3 text-left">Điểm rủi ro</th>
                          <th className="px-6 py-3 text-left">Mức rủi ro</th>
                          <th className="px-6 py-3 text-left">Trạng thái</th>
                          <th className="px-6 py-3 text-left">Ngày</th>
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
                              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${getRiskBadge(report.riskLevel)}`}>
                                {report.riskLevel === "LOW" ? "Thấp" :
                                  report.riskLevel === "MEDIUM" ? "Trung bình" :
                                  report.riskLevel === "HIGH" ? "Cao" : report.riskLevel || "—"}
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
                                {report.status === "COMPLETED" ? "Hoàn thành" :
                                  report.status === "PROCESSING" ? "Đang xử lý" :
                                  report.status === "FAILED" ? "Thất bại" : report.status}
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
                    <span className="text-[10px] font-bold text-[#5FD48A] uppercase tracking-widest">Nâng cấp</span>
                    <h3 className="text-white font-bold text-base mt-1 mb-2">Mở khóa toàn bộ tính năng</h3>
                    <p className="text-[#7BAA8C] text-xs mb-4">Thẩm định không giới hạn, API access, và nhiều hơn nữa.</p>
                    <Link
                      href="/pricing"
                      className="inline-flex items-center gap-2 px-4 py-2 bg-[#00D26A] text-white text-sm font-bold rounded-xl hover:bg-[#00B85D] transition-colors"
                    >
                      Xem các gói <ChevronRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>

                {/* Quick Tips */}
                <div className="bg-blue-50 rounded-2xl p-4 border border-blue-100">
                  <div className="flex items-start gap-3">
                    <Info className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-bold text-blue-800 mb-1">Mẹo sử dụng</p>
                      <p className="text-xs text-blue-600">
                        Sử dụng <strong>AI Assistant</strong> để phân tích báo cáo và nhận tư vấn thương mại quốc tế theo ngữ cảnh.
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

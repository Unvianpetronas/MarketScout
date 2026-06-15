"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, ExternalLink, CheckCircle2, AlertCircle, Zap, Lock,
  ChevronRight, Shield, Globe, Building2, Calendar, Hash,
  AlertTriangle, FileText, Clock, MessageSquare
} from "lucide-react";
import { toast } from "sonner";
import { AuthGuard } from "@/components/shared/auth-guard";
import { Sidebar } from "@/components/layout/sidebar";
import { getReport } from "@/services/report.service";
import { getMyQuota } from "@/services/quota.service";
import { VerificationReport } from "@/types/report";
import { QuotaStatus } from "@/types/quota";

interface IntelPageProps {
  params: Promise<{ id: string }>;
}

function parseJSON(raw: string | undefined): string[] {
  if (!raw) return [];
  try { return JSON.parse(raw) as string[]; } catch { return [raw]; }
}

function DataHealthScore({ score }: { score: number }) {
  return (
    <div>
      <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-1">Độ tin cậy dữ liệu</p>
      <p className="text-2xl font-extrabold text-gray-900">
        {score} <span className="text-sm text-gray-400">/ 100</span>
      </p>
      <div className="flex gap-0.5 mt-1">
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className={`w-2.5 h-3 rounded-sm transition-all ${i < Math.floor(score / 10) ? "bg-[#00D26A]" : "bg-gray-100"}`} />
        ))}
      </div>
    </div>
  );
}

export default function IntelligencePage({ params }: IntelPageProps) {
  const { id } = use(params);
  const router = useRouter();
  const [report, setReport] = useState<VerificationReport | null>(null);
  const [quota, setQuota] = useState<QuotaStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    Promise.all([
      getReport(id).catch(() => null),
      getMyQuota().catch(() => null),
    ]).then(([r, q]) => {
      if (!r) setNotFound(true);
      else setReport(r);
      setQuota(q);
    }).finally(() => setIsLoading(false));
  }, [id]);

  if (isLoading) {
    return (
      <AuthGuard>
        <div className="flex h-screen overflow-hidden bg-[#FAFBFA]">
          <Sidebar active="intelligence" />
          <div className="flex-1 flex items-center justify-center">
            <div className="flex flex-col items-center gap-3">
              <div className="w-12 h-12 border-2 border-[#00D26A]/20 border-t-[#00D26A] rounded-full animate-spin" />
              <p className="text-sm text-gray-400">Đang tải dữ liệu tình báo...</p>
            </div>
          </div>
        </div>
      </AuthGuard>
    );
  }

  if (notFound || !report) {
    return (
      <AuthGuard>
        <div className="flex h-screen overflow-hidden bg-[#FAFBFA]">
          <Sidebar active="intelligence" />
          <div className="flex-1 flex flex-col items-center justify-center gap-4">
            <Building2 className="w-16 h-16 text-gray-100" />
            <p className="text-gray-500 font-semibold">Không tìm thấy hồ sơ</p>
            <Link href="/reports" className="flex items-center gap-2 px-4 py-2 gradient-brand text-white text-sm rounded-xl">
              <ArrowLeft className="w-4 h-4" /> Về danh sách báo cáo
            </Link>
          </div>
        </div>
      </AuthGuard>
    );
  }

  const isCompleted = (report.status as string) === "COMPLETED";
  const isProcessing = ["PROCESSING", "DEEP_SCANNING"].includes((report.status as string) || "");
  const overallScore = report.overallScore ?? 0;
  const riskColor = overallScore < 40 ? "#00D26A" : overallScore < 70 ? "#F59E0B" : "#EF4444";
  const dataHealthScore = isCompleted ? Math.min(95, 60 + (report.pillars?.length ?? 0) * 4) : 30;
  const passCount = report.pillars?.filter((p) => (p.status as string) === "PASS").length ?? 0;
  const failCount = report.pillars?.filter((p) => (p.status as string) === "FAIL").length ?? 0;
  const initials = report.entityName?.slice(0, 3).toUpperCase() || "ENT";

  return (
    <AuthGuard>
      <div className="flex h-screen overflow-hidden bg-[#FAFBFA]">
        <Sidebar active="intelligence" />
        <div className="flex-1 overflow-y-auto scrollbar-thin">
          <div className="max-w-7xl mx-auto px-6 py-8">

            {/* ── Breadcrumb ── */}
            <div className="flex items-center gap-2 text-xs text-gray-400 mb-6 animate-fade-in">
              <Link href="/reports" className="hover:text-gray-600 flex items-center gap-1">
                <ArrowLeft className="w-3 h-3" /> Báo cáo
              </Link>
              <ChevronRight className="w-3 h-3" />
              <span className="text-gray-600 font-semibold">{report.entityName}</span>
              <ChevronRight className="w-3 h-3" />
              <span className="text-[#00D26A] font-semibold">Intelligence Hub</span>
            </div>

            <div className="grid grid-cols-3 gap-5">
              {/* ── LEFT COL (2/3) ── */}
              <div className="col-span-2 space-y-5">

                {/* Header card */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 animate-fade-in-up">
                  <div className="flex items-start gap-5">
                    <div className="w-14 h-14 rounded-2xl bg-[#E6F9F0] border border-[#00D26A]/20 flex items-center justify-center text-[#00843F] font-extrabold text-xl shrink-0">
                      {initials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2 flex-wrap">
                        <h1 className="text-xl font-extrabold text-gray-900 uppercase">{report.entityName}</h1>
                        {isCompleted && (
                          <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                            <CheckCircle2 className="w-3 h-3" /> ĐÃ XÁC MINH
                          </span>
                        )}
                        {isProcessing && (
                          <span className="flex items-center gap-1.5 text-[10px] font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2.5 py-0.5 rounded-full">
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" /> ĐANG PHÂN TÍCH
                          </span>
                        )}
                        {report.hardStop && (
                          <span className="flex items-center gap-1 text-[10px] font-bold text-red-700 bg-red-50 border border-red-200 px-2.5 py-0.5 rounded-full">
                            <AlertTriangle className="w-3 h-3" /> HARD STOP
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-4 text-xs text-gray-400">
                        {report.taxId && <span className="flex items-center gap-1"><Hash className="w-3 h-3" /> Tax ID: <span className="font-mono font-bold text-gray-600">{report.taxId}</span></span>}
                        {report.lei && <span>LEI: <span className="font-mono font-bold text-gray-600">{report.lei}</span></span>}
                        {report.countryIso2 && <span className="flex items-center gap-1"><Globe className="w-3 h-3" /> {report.countryIso2}</span>}
                        {report.createdAt && <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {new Date(report.createdAt as string).toLocaleDateString("vi-VN")}</span>}
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      <DataHealthScore score={dataHealthScore} />
                    </div>
                  </div>
                </div>

                {/* Pillar Results */}
                {report.pillars && report.pillars.length > 0 && (
                  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-sm font-extrabold text-gray-900 flex items-center gap-2">
                        <Shield className="w-4 h-4 text-[#00D26A]" />
                        Kết quả phân tích 8 trụ cột
                      </h2>
                      <div className="flex items-center gap-2 text-xs">
                        <span className="text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full font-bold">{passCount} PASS</span>
                        {failCount > 0 && <span className="text-red-700 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full font-bold">{failCount} FAIL</span>}
                      </div>
                    </div>
                    <div className="space-y-2">
                      {report.pillars.map((p) => {
                        const score = p.score ?? 0;
                        const color = score < 40 ? "#00D26A" : score < 70 ? "#F59E0B" : "#EF4444";
                        const findings = parseJSON(p.findings);
                        return (
                          <div key={p.pillarNo} className="flex items-center gap-4 py-3 border-b border-gray-50 last:border-0">
                            <div className="w-8 text-xs text-gray-400 font-mono shrink-0">P{p.pillarNo}</div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-gray-800 mb-1">{p.pillarName}</p>
                              {findings.length > 0 && (
                                <p className="text-xs text-gray-400 truncate">{findings[0]}</p>
                              )}
                            </div>
                            <div className="flex items-center gap-3 shrink-0">
                              <div className="w-24 bg-gray-100 rounded-full h-1.5">
                                <div className="h-1.5 rounded-full" style={{ width: `${score}%`, backgroundColor: color }} />
                              </div>
                              <span className="text-sm font-extrabold w-8 text-right" style={{ color }}>{score}</span>
                              {p.status && (
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                  p.status === "PASS" ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                    : p.status === "FAIL" ? "bg-red-50 text-red-700 border border-red-200"
                                    : "bg-amber-50 text-amber-700 border border-amber-200"
                                }`}>{p.status}</span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Deal Safety */}
                {report.dealSafetyAnalysis && (
                  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                    <h2 className="text-sm font-extrabold text-gray-900 mb-3 flex items-center gap-2">
                      <FileText className="w-4 h-4 text-[#00D26A]" />
                      Deal Safety Analysis
                    </h2>
                    <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap">
                      {typeof report.dealSafetyAnalysis === "string" ? report.dealSafetyAnalysis : JSON.stringify(report.dealSafetyAnalysis, null, 2)}
                    </p>
                  </div>
                )}

              </div>

              {/* ── RIGHT COL (1/3) ── */}
              <div className="space-y-4">

                {/* Intelligence Radar */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                  <h3 className="text-xs font-extrabold text-gray-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                    <Shield className="w-3.5 h-3.5 text-[#00D26A]" /> Radar Tình báo
                  </h3>
                  <div className="space-y-3">
                    {[
                      { label: "Điểm rủi ro tổng thể", value: `${overallScore}/100`, style: { color: riskColor } },
                      { label: "Trụ cột PASS", value: `${passCount}/8`, style: { color: "#00D26A" } },
                      { label: "Hard Stop", value: report.hardStop ? "⚠ Có" : "✓ Không", style: { color: report.hardStop ? "#EF4444" : "#00D26A" } },
                      { label: "Quốc gia", value: report.countryIso2 || "—", style: {} },
                      { label: "Nguồn", value: report.source || "AI Scan", style: {} },
                    ].map(({ label, value, style }) => (
                      <div key={label} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                        <span className="text-xs text-gray-400">{label}</span>
                        <span className="text-xs font-bold text-gray-800" style={style}>{value}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                  <h3 className="text-xs font-extrabold text-gray-500 uppercase tracking-widest mb-4">Hành động nhanh</h3>
                  <div className="space-y-2.5">
                    <Link href={`/reports/${id}`}
                      className="w-full flex items-center gap-2 px-4 py-2.5 bg-gray-50 border border-gray-200 text-gray-700 text-sm font-semibold rounded-xl hover:bg-gray-100 transition-all">
                      <FileText className="w-4 h-4 text-gray-400" /> Xem báo cáo đầy đủ
                    </Link>
                    <Link href={`/chat?preMessage=${encodeURIComponent(`Phân tích chi tiết về ${report.entityName}`)}`}
                      className="w-full flex items-center gap-2 px-4 py-2.5 bg-gray-50 border border-gray-200 text-gray-700 text-sm font-semibold rounded-xl hover:bg-gray-100 transition-all">
                      <MessageSquare className="w-4 h-4 text-gray-400" /> Hỏi AI về doanh nghiệp
                    </Link>
                    {report.website && (
                      <a href={`https://${report.website}`} target="_blank" rel="noopener"
                        className="w-full flex items-center gap-2 px-4 py-2.5 bg-gray-50 border border-gray-200 text-gray-700 text-sm font-semibold rounded-xl hover:bg-gray-100 transition-all">
                        <ExternalLink className="w-4 h-4 text-gray-400" /> Truy cập Website
                      </a>
                    )}
                  </div>
                </div>

                {/* Deep Verify CTA */}
                {!isCompleted && !isProcessing && (
                  <div className="bg-[#0A1A12] rounded-2xl p-5">
                    <p className="text-[10px] font-bold text-[#00D26A] uppercase tracking-widest mb-2">Premium</p>
                    <h3 className="text-base font-extrabold text-white mb-2">Kích hoạt Deep Verify</h3>
                    <p className="text-xs text-gray-400 mb-4 leading-relaxed">
                      Phân tích chuyên sâu 8 trụ cột với AI tự động thu thập từ 50+ nguồn dữ liệu.
                    </p>
                    <div className="bg-[#0F2318] rounded-xl p-3 mb-4 text-xs">
                      <div className="flex justify-between mb-1">
                        <span className="text-gray-400">Quota cần dùng</span>
                        <span className="text-white font-bold">1 quota</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Quota còn lại</span>
                        <span className="text-[#00D26A] font-bold">{quota?.quotaRemaining ?? 0}</span>
                      </div>
                    </div>
                    <button onClick={() => {
                      if (!quota || quota.quotaRemaining <= 0) { toast.error("Hết quota."); return; }
                      const msg = encodeURIComponent(`Thực hiện thẩm định chuyên sâu cho ${report.entityName}`);
                      router.push(`/chat?preMessage=${msg}`);
                    }} className="w-full py-3 gradient-brand text-white font-bold rounded-xl hover:opacity-90 flex items-center justify-center gap-2 text-sm">
                      <Zap className="w-4 h-4" /> Kích hoạt (1 Quota)
                    </button>
                    <p className="text-[10px] text-gray-600 text-center mt-2 flex items-center justify-center gap-1">
                      <Lock className="w-3 h-3" /> Mã hóa TLS 1.3
                    </p>
                  </div>
                )}

              </div>
            </div>
          </div>
        </div>
      </div>
    </AuthGuard>
  );
}

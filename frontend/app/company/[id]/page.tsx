"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, ExternalLink, AlertTriangle, Shield, Globe,
  CheckCircle2, XCircle, Clock, ChevronRight, Download,
  MessageSquare, Building2, Zap, TrendingUp, Star, FileText,
  Calendar, Hash, Info
} from "lucide-react";
import { toast } from "sonner";
import { AuthGuard } from "@/components/shared/auth-guard";
import { Sidebar } from "@/components/layout/sidebar";
import { getReport, quickScan } from "@/services/report.service";
import { VerificationReport, PillarResult } from "@/types/report";
import { getMyQuota } from "@/services/quota.service";
import { QuotaStatus } from "@/types/quota";

interface Props {
  params: Promise<{ id: string }>;
}

const PILLAR_ICONS: Record<number, string> = {
  1: "🏛", 2: "💰", 3: "⚖️", 4: "⭐",
  5: "🏭", 6: "👥", 7: "🌐", 8: "🚢",
};
const PILLAR_NAMES_VI: Record<number, string> = {
  1: "Pháp lý & Đăng ký", 2: "Tài chính & Minh bạch", 3: "Tuân thủ & AML",
  4: "Uy tín thị trường", 5: "Năng lực vận hành", 6: "Nhân sự & Ban lãnh đạo",
  7: "Dấu vết kỹ thuật số", 8: "Thương mại quốc tế",
};

function getRiskInfo(score: number) {
  if (score < 40) return { color: "#00D26A", bg: "#E6F9F0", textClass: "text-emerald-700", label: "Rủi ro Thấp", badgeCls: "risk-low" };
  if (score < 70) return { color: "#F59E0B", bg: "#FFF8E7", textClass: "text-amber-700", label: "Rủi ro Trung bình", badgeCls: "risk-medium" };
  return { color: "#EF4444", bg: "#FFF1F0", textClass: "text-red-700", label: "Rủi ro Cao", badgeCls: "risk-high" };
}

function ScoreGauge({ score }: { score: number }) {
  const { color, label, textClass } = getRiskInfo(score);
  const circumference = 2 * Math.PI * 52;
  const dashOffset = circumference - (circumference * score) / 100;
  return (
    <div className="flex flex-col items-center">
      <div className="relative w-32 h-32">
        <svg className="w-32 h-32 -rotate-90" viewBox="0 0 120 120">
          <circle cx="60" cy="60" r="52" fill="none" stroke="#F0F5F2" strokeWidth="10" />
          <circle cx="60" cy="60" r="52" fill="none" stroke={color} strokeWidth="10"
            strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={dashOffset}
            style={{ transition: "stroke-dashoffset 1.2s ease" }} />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-4xl font-extrabold text-gray-900">{score}</span>
          <span className="text-xs text-gray-400">/100</span>
        </div>
      </div>
      <p className={`text-sm font-bold mt-2 ${textClass}`}>{label}</p>
    </div>
  );
}

function parseJSON(raw: string | undefined): string[] {
  if (!raw) return [];
  try { return JSON.parse(raw) as string[]; } catch { return [raw]; }
}

function PillarCard({ pillar }: { pillar: PillarResult }) {
  const [expanded, setExpanded] = useState(false);
  const score = pillar.score ?? 0;
  const { color } = getRiskInfo(score);
  const findings = parseJSON(pillar.findings);
  const icon = PILLAR_ICONS[pillar.pillarNo] || "📊";
  const nameVi = PILLAR_NAMES_VI[pillar.pillarNo] || pillar.pillarName;

  const statusBg = pillar.status === "PASS" ? "bg-emerald-50 text-emerald-700 border-emerald-200"
    : pillar.status === "FAIL" ? "bg-red-50 text-red-700 border-red-200"
    : "bg-amber-50 text-amber-700 border-amber-200";

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden card-hover">
      <div className="p-4">
        <div className="flex items-start gap-3 mb-3">
          <div className="w-10 h-10 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-center text-lg shrink-0">
            {icon}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2 mb-1">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">P{pillar.pillarNo}</p>
              {pillar.status && (
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${statusBg}`}>
                  {pillar.status}
                </span>
              )}
            </div>
            <p className="text-sm font-bold text-gray-900">{nameVi}</p>
          </div>
        </div>

        <div className="flex items-center gap-3 mb-2">
          <div className="flex-1 bg-gray-100 rounded-full h-2">
            <div className="h-2 rounded-full transition-all duration-1000"
              style={{ width: `${score}%`, backgroundColor: color }} />
          </div>
          <span className="text-sm font-extrabold" style={{ color }}>{score}</span>
        </div>

        {findings.length > 0 && (
          <>
            <button onClick={() => setExpanded(!expanded)}
              className="text-xs text-[#00D26A] hover:underline font-semibold flex items-center gap-1 mt-1">
              {expanded ? "Thu gọn" : `${findings.length} phát hiện`} <ChevronRight className={`w-3 h-3 transition-transform ${expanded ? "rotate-90" : ""}`} />
            </button>
            {expanded && (
              <ul className="mt-2 space-y-1">
                {findings.map((f, i) => (
                  <li key={i} className="text-xs text-gray-500 flex items-start gap-1.5">
                    <span className="text-[#00D26A] mt-0.5">•</span> {f}
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default function CompanyDetailPage({ params }: Props) {
  const { id } = use(params);
  const router = useRouter();
  const [report, setReport] = useState<VerificationReport | null>(null);
  const [quota, setQuota] = useState<QuotaStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    Promise.all([
      getReport(id).catch(() => null),
      getMyQuota().catch(() => null),
    ]).then(([r, q]) => {
      if (!r) { setNotFound(true); }
      else { setReport(r); }
      setQuota(q);
    }).finally(() => setIsLoading(false));
  }, [id]);

  const handleDeepVerify = async () => {
    if (!quota || quota.quotaRemaining <= 0) {
      toast.error("Hết quota. Vui lòng nâng cấp gói dịch vụ.");
      router.push("/pricing");
      return;
    }
    const msg = encodeURIComponent(`Thực hiện thẩm định chuyên sâu cho doanh nghiệp ${report?.entityName}. Phân tích đầy đủ 8 trụ cột.`);
    router.push(`/chat?preMessage=${msg}`);
  };

  if (isLoading) {
    return (
      <AuthGuard>
        <div className="flex h-screen overflow-hidden bg-[#FAFBFA]">
          <Sidebar active="reports" />
          <div className="flex-1 flex items-center justify-center">
            <div className="flex flex-col items-center gap-3">
              <div className="w-12 h-12 border-2 border-[#00D26A]/20 border-t-[#00D26A] rounded-full animate-spin" />
              <p className="text-sm text-gray-400">Đang tải báo cáo...</p>
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
          <Sidebar active="reports" />
          <div className="flex-1 flex flex-col items-center justify-center gap-4">
            <Building2 className="w-16 h-16 text-gray-100" />
            <p className="text-gray-500 font-semibold">Không tìm thấy báo cáo</p>
            <Link href="/reports" className="flex items-center gap-2 px-4 py-2 gradient-brand text-white text-sm rounded-xl">
              <ArrowLeft className="w-4 h-4" /> Về danh sách
            </Link>
          </div>
        </div>
      </AuthGuard>
    );
  }

  const overallScore = report.overallScore ?? 0;
  const { color: scoreColor, bg: scoreBg, textClass, badgeCls } = getRiskInfo(overallScore);
  const isCompleted = (report.status as string) === "COMPLETED";
  const isProcessing = ["PROCESSING", "DEEP_SCANNING"].includes((report.status as string) || "");

  return (
    <AuthGuard>
      <div className="flex h-screen overflow-hidden bg-[#FAFBFA]">
        <Sidebar active="reports" />
        <div className="flex-1 overflow-y-auto scrollbar-thin">
          <div className="max-w-5xl mx-auto px-6 py-8">

            {/* ── Breadcrumb + Actions ── */}
            <div className="flex items-center justify-between mb-6 animate-fade-in">
              <div className="flex items-center gap-2 text-sm text-gray-400">
                <Link href="/reports" className="hover:text-gray-600 flex items-center gap-1">
                  <ArrowLeft className="w-3.5 h-3.5" /> Báo cáo
                </Link>
                <ChevronRight className="w-3.5 h-3.5" />
                <span className="text-gray-700 font-semibold">{report.entityName}</span>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => toast.info("Sắp ra mắt.")}
                  className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-sm font-medium text-gray-600 rounded-xl hover:bg-gray-50 shadow-sm">
                  <Download className="w-4 h-4" /> Tải PDF
                </button>
                <Link href={`/chat?preMessage=${encodeURIComponent(`Phân tích thêm về báo cáo ${report.entityName}`)}`}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white text-sm font-semibold rounded-xl hover:bg-gray-700 shadow-sm">
                  <MessageSquare className="w-4 h-4" /> Hỏi AI
                </Link>
              </div>
            </div>

            {/* ── Hero Card ── */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-5 animate-fade-in-up">
              <div className="flex items-start justify-between gap-6">
                <div className="flex-1">
                  {/* Status badges */}
                  <div className="flex items-center gap-2 mb-3 flex-wrap">
                    {isProcessing && (
                      <span className="flex items-center gap-1.5 text-xs font-bold text-blue-700 bg-blue-50 border border-blue-200 px-3 py-1 rounded-full">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" /> Đang phân tích...
                      </span>
                    )}
                    {isCompleted && (
                      <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full">
                        <CheckCircle2 className="w-3 h-3" /> Hoàn thành
                      </span>
                    )}
                    {report.hardStop && (
                      <span className="flex items-center gap-1.5 text-xs font-bold text-red-700 bg-red-50 border border-red-300 px-3 py-1 rounded-full animate-pulse">
                        <AlertTriangle className="w-3 h-3" /> HARD STOP
                      </span>
                    )}
                    {report.countryIso2 && (
                      <span className="flex items-center gap-1.5 text-xs font-medium text-blue-600 bg-blue-50 border border-blue-200 px-3 py-1 rounded-full">
                        <Globe className="w-3 h-3" /> {report.countryIso2}
                      </span>
                    )}
                    {report.source && (
                      <span className="text-xs font-medium text-gray-500 bg-gray-50 border border-gray-200 px-3 py-1 rounded-full">
                        {report.source}
                      </span>
                    )}
                  </div>

                  <h1 className="text-2xl font-extrabold text-gray-900 mb-4 uppercase">{report.entityName}</h1>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[
                      { label: "Mã báo cáo", value: report.id?.slice(0, 8).toUpperCase() || "—", icon: Hash },
                      { label: "Mã số thuế", value: report.taxId || "—", icon: Building2 },
                      { label: "Website", value: report.website || "—", icon: Globe },
                      { label: "Ngày tạo", value: report.createdAt ? new Date(report.createdAt as string).toLocaleDateString("vi-VN") : "—", icon: Calendar },
                    ].map(({ label, value, icon: Icon }) => (
                      <div key={label}>
                        <p className="text-[10px] text-gray-400 uppercase tracking-wider font-bold mb-1 flex items-center gap-1">
                          <Icon className="w-3 h-3" /> {label}
                        </p>
                        {label === "Website" && report.website ? (
                          <a href={`https://${report.website}`} target="_blank" rel="noopener"
                            className="text-sm text-[#00D26A] hover:underline font-medium flex items-center gap-1">
                            {report.website} <ExternalLink className="w-3 h-3" />
                          </a>
                        ) : (
                          <p className="text-sm font-semibold text-gray-900">{value}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="shrink-0">
                  <ScoreGauge score={overallScore} />
                </div>
              </div>
            </div>

            {/* ── Hard Stop Alert ── */}
            {report.hardStop && (
              <div className="bg-red-50 border border-red-200 rounded-2xl p-5 mb-5 flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <p className="text-base font-extrabold text-red-800 mb-1">⚠️ HARD STOP — Không khuyến nghị hợp tác</p>
                  <p className="text-sm text-red-600 leading-relaxed">
                    Doanh nghiệp này có dấu hiệu nghiêm trọng trong quá trình thẩm định. Cần xem xét kỹ lưỡng trước khi tiến hành bất kỳ giao dịch thương mại nào.
                  </p>
                </div>
              </div>
            )}

            {/* ── Processing banner ── */}
            {isProcessing && (
              <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 mb-5 flex items-center gap-3">
                <div className="w-8 h-8 border-2 border-blue-300 border-t-blue-600 rounded-full animate-spin shrink-0" />
                <div>
                  <p className="text-sm font-bold text-blue-800">Đang thu thập và phân tích dữ liệu</p>
                  <p className="text-xs text-blue-600">AI đang quét 50+ nguồn dữ liệu. Có thể mất 2-5 phút. Trang tự động cập nhật.</p>
                </div>
              </div>
            )}

            {/* ── Pillars Grid ── */}
            {report.pillars && report.pillars.length > 0 && (
              <div className="mb-5">
                <h2 className="text-base font-extrabold text-gray-900 mb-4 flex items-center gap-2">
                  <Shield className="w-4 h-4 text-[#00D26A]" />
                  Phân tích 8 trụ cột
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 stagger">
                  {report.pillars.map((p) => <PillarCard key={p.pillarNo} pillar={p} />)}
                </div>
              </div>
            )}

            {/* ── Deal Safety Analysis ── */}
            {report.dealSafetyAnalysis && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-5">
                <h2 className="text-base font-extrabold text-gray-900 mb-4 flex items-center gap-2">
                  <Shield className="w-4 h-4 text-[#00D26A]" />
                  Deal Safety Analysis
                </h2>
                <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap">
                  {typeof report.dealSafetyAnalysis === "string" ? report.dealSafetyAnalysis : JSON.stringify(report.dealSafetyAnalysis, null, 2)}
                </p>
              </div>
            )}

            {/* ── Deep Verify CTA ── */}
            {!isCompleted && !isProcessing && (
              <div className="bg-gradient-to-r from-[#0A1A12] to-[#1A3A28] rounded-2xl p-6 flex items-center justify-between gap-6">
                <div>
                  <span className="text-[10px] font-bold text-[#00D26A] uppercase tracking-widest border border-[#00D26A]/30 rounded px-2 py-0.5 mb-2 inline-block">
                    ⚡ Thẩm định chuyên sâu
                  </span>
                  <h3 className="text-lg font-extrabold text-white mb-1">Kích hoạt Deep Verify Report</h3>
                  <p className="text-sm text-gray-400">
                    Phân tích toàn diện 8 trụ cột bao gồm tình trạng pháp lý, tài chính, tuân thủ AML và thương mại quốc tế.
                  </p>
                  <p className="text-xs text-gray-500 mt-2">
                    Quota còn lại: <span className="text-[#00D26A] font-bold">{quota?.quotaRemaining ?? 0}</span>
                    {" | "}<Link href="/pricing" className="text-[#00D26A] hover:underline">Nâng cấp gói →</Link>
                  </p>
                </div>
                <button onClick={handleDeepVerify}
                  className="px-6 py-3 gradient-brand text-white font-bold rounded-xl hover:opacity-90 text-sm flex items-center gap-2 shrink-0">
                  <Zap className="w-4 h-4" /> Kích hoạt (1 Quota)
                </button>
              </div>
            )}

          </div>
        </div>
      </div>
    </AuthGuard>
  );
}

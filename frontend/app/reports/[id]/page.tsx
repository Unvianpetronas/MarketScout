"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import {
  ArrowLeft, AlertTriangle, Shield, RefreshCw, Globe, ExternalLink,
  CheckCircle2, XCircle, Clock, ChevronRight, Download, MessageSquare,
  Building2, FileText, TrendingDown, TrendingUp, Info, Star
} from "lucide-react";
import { toast } from "sonner";
import { AuthGuard } from "@/components/shared/auth-guard";
import { Sidebar } from "@/components/layout/sidebar";
import { getReport } from "@/services/report.service";
import { VerificationReport, PillarResult } from "@/types/report";

interface Props {
  params: Promise<{ id: string }>;
}

const PILLAR_ICONS: Record<number, React.ElementType> = {
  1: Shield, 2: Globe, 3: TrendingUp, 4: Building2,
  5: Star, 6: AlertTriangle, 7: FileText, 8: CheckCircle2,
};

function getRiskInfo(score: number) {
  if (score < 40) return { color: "#00D26A", bg: "#E6F9F0", textClass: "text-emerald-700", label: "Rủi ro Thấp", badgeCls: "risk-low" };
  if (score < 70) return { color: "#F59E0B", bg: "#FFF8E7", textClass: "text-amber-700", label: "Rủi ro Trung bình", badgeCls: "risk-medium" };
  return { color: "#EF4444", bg: "#FFF1F0", textClass: "text-red-700", label: "Rủi ro Cao", badgeCls: "risk-high" };
}

function ScoreGaugeLight({ score }: { score: number }) {
  const { color, label, textClass } = getRiskInfo(score);
  const circumference = 2 * Math.PI * 52;
  const dashOffset = circumference - (circumference * score) / 100;

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-36 h-36">
        <svg className="w-36 h-36 -rotate-90" viewBox="0 0 120 120">
          <circle cx="60" cy="60" r="52" fill="none" stroke="#F0F5F2" strokeWidth="10" />
          <circle
            cx="60" cy="60" r="52" fill="none" stroke={color} strokeWidth="10"
            strokeLinecap="round" strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            style={{ transition: "stroke-dashoffset 1.2s ease" }}
          />
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

function parseFindings(raw: string | undefined): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed.map(String);
    if (typeof parsed === "string") return [parsed];
    return [raw];
  } catch { return [raw]; }
}

function PillarCard({ pillar }: { pillar: PillarResult }) {
  const score = pillar.score ?? 0;
  const { color, bg, textClass } = getRiskInfo(score);
  const findings = parseFindings(pillar.findings);
  const Icon = PILLAR_ICONS[pillar.pillarNo] || Shield;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm card-hover">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: bg }}>
            <Icon className="w-4.5 h-4.5" style={{ color }} />
          </div>
          <div>
            <p className="text-[10px] text-gray-400 font-mono uppercase">Trụ cột {pillar.pillarNo}</p>
            <h3 className="text-sm font-bold text-gray-900 mt-0.5">{pillar.pillarName}</h3>
          </div>
        </div>
        <div className="text-right shrink-0">
          <div className="text-2xl font-extrabold" style={{ color }}>{score}</div>
          <div className="text-[10px] text-gray-400">điểm</div>
        </div>
      </div>

      <div className="w-full bg-gray-100 rounded-full h-1.5 mb-3">
        <div className="h-1.5 rounded-full transition-all duration-700" style={{ width: `${score}%`, backgroundColor: color }} />
      </div>

      <div className="flex items-center justify-between">
        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${
          score < 40 ? "risk-low" : score < 70 ? "risk-medium" : "risk-high"
        }`}>
          {pillar.status || (score >= 70 ? "Passed" : score >= 40 ? "Review" : "Alert")}
        </span>
        {pillar.confidence && (
          <span className="text-[11px] text-gray-400">Độ tin cậy: {pillar.confidence}</span>
        )}
      </div>

      {findings.length > 0 && (
        <ul className="mt-3 space-y-1 border-t border-gray-50 pt-3">
          {findings.slice(0, 2).map((finding, i) => (
            <li key={i} className="text-xs text-gray-500 flex items-start gap-1.5">
              <ChevronRight className="w-3 h-3 shrink-0 mt-0.5 text-gray-300" />
              {finding}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function ReportDetailPage({ params }: Props) {
  const { id } = use(params);
  const [report, setReport] = useState<VerificationReport | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRescan, setIsRescan] = useState(false);

  useEffect(() => {
    getReport(id)
      .then(setReport)
      .catch(() => toast.error("Không tải được báo cáo."))
      .finally(() => setIsLoading(false));
  }, [id]);

  const handleRescan = async () => {
    setIsRescan(true);
    toast.info("Đang khởi động lại quét...");
    setTimeout(() => setIsRescan(false), 2000);
  };

  const pillars = report?.pillars ?? [];

  interface DealSafety { warningLabel?: string; recommendation?: string; requiredProtocols?: string[] }
  let dealSafety: DealSafety | null = null;
  if (report?.dealSafetyAnalysis) {
    try { dealSafety = JSON.parse(report.dealSafetyAnalysis) as DealSafety; }
    catch { dealSafety = { recommendation: report.dealSafetyAnalysis }; }
  }

  const avgScore = pillars.length > 0 
    ? Math.round(pillars.reduce((s, p) => s + (p.score ?? 0), 0) / pillars.length)
    : report?.overallScore ?? 0;

  return (
    <AuthGuard>
      <div className="flex h-screen overflow-hidden bg-[#FAFBFA]">
        <Sidebar active="reports" />
        <div className="flex-1 overflow-y-auto scrollbar-thin">
          <main className="max-w-6xl mx-auto px-6 py-8">

            {/* ── Breadcrumb ── */}
            <div className="flex items-center justify-between mb-6 animate-fade-in">
              <div className="flex items-center gap-3">
                <Link href="/dashboard" className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-700 transition-colors">
                  <ArrowLeft className="w-4 h-4" />
                  Dashboard
                </Link>
                <span className="text-gray-200">/</span>
                <Link href="/reports" className="text-sm text-gray-400 hover:text-gray-700">Báo cáo</Link>
                <span className="text-gray-200">/</span>
                <span className="text-sm font-medium text-gray-700 font-mono">{id.slice(0, 8).toUpperCase()}</span>
                {report?.status === "PROCESSING" && (
                  <span className="flex items-center gap-1.5 text-xs font-semibold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full border border-blue-200">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                    Đang quét
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => toast.info("Export PDF sẽ sớm ra mắt.")}
                  className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-sm font-medium text-gray-600 rounded-xl hover:bg-gray-50 transition-colors shadow-sm"
                >
                  <Download className="w-4 h-4" />
                  Xuất báo cáo
                </button>
                <button
                  onClick={handleRescan}
                  disabled={isRescan}
                  className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-sm font-medium text-gray-600 rounded-xl hover:bg-gray-50 transition-colors shadow-sm disabled:opacity-60"
                >
                  <RefreshCw className={`w-4 h-4 ${isRescan ? "animate-spin" : ""}`} />
                  Quét lại
                </button>
              </div>
            </div>

            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-24 gap-4">
                <div className="w-12 h-12 border-2 border-[#00D26A]/20 border-t-[#00D26A] rounded-full animate-spin" />
                <p className="text-sm text-gray-400">Đang tải báo cáo...</p>
              </div>
            ) : !report ? (
              <div className="text-center py-24">
                <XCircle className="w-12 h-12 text-gray-200 mx-auto mb-3" />
                <p className="text-gray-500">Không tìm thấy báo cáo.</p>
              </div>
            ) : (
              <div className="space-y-6 stagger">

                {/* ── Company Header ── */}
                <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4">
                      <div className="w-14 h-14 bg-gradient-to-br from-gray-100 to-gray-200 rounded-2xl flex items-center justify-center text-gray-600 font-extrabold text-xl shrink-0">
                        {report.entityName.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <h1 className="text-2xl font-extrabold text-gray-900 mb-2">{report.entityName}</h1>
                        <div className="flex items-center gap-3 flex-wrap">
                          {report.countryIso2 && (
                            <div className="flex items-center gap-1.5 text-sm text-gray-500 bg-gray-50 px-3 py-1 rounded-full">
                              <Globe className="w-3.5 h-3.5" />
                              {report.countryIso2}
                            </div>
                          )}
                          {report.taxId && (
                            <span className="text-xs font-mono text-gray-500 bg-gray-50 px-3 py-1 rounded-full">
                              Tax: {report.taxId}
                            </span>
                          )}
                          {report.website && (
                            <a href={report.website} target="_blank" rel="noopener noreferrer"
                              className="flex items-center gap-1.5 text-xs text-[#00D26A] hover:underline bg-[#E6F9F0] px-3 py-1 rounded-full">
                              <ExternalLink className="w-3 h-3" />
                              {report.website}
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="shrink-0">
                      {report.hardStop ? (
                        <span className="flex items-center gap-2 text-sm font-bold text-red-700 bg-red-50 border border-red-200 px-4 py-2 rounded-xl">
                          <XCircle className="w-4 h-4" /> Hard Stop
                        </span>
                      ) : (
                        <span className="flex items-center gap-2 text-sm font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-4 py-2 rounded-xl">
                          <CheckCircle2 className="w-4 h-4" /> Không có Hard Stop
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* ── Hard Stop Alert ── */}
                {report.hardStop && (
                  <div className="bg-red-50 border border-red-200 rounded-2xl p-5 flex items-start gap-4">
                    <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center shrink-0">
                      <XCircle className="w-5 h-5 text-red-500" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-bold text-red-700 mb-1">⛔ HARD STOP — Cần xem xét ngay</p>
                      <p className="text-sm text-red-600/80">
                        Phát hiện vấn đề tuân thủ nghiêm trọng. Đề xuất tạm dừng mọi giao dịch với đơn vị này cho đến khi hoàn tất thẩm tra.
                      </p>
                    </div>
                  </div>
                )}

                {/* ── Score + Deal Safety ── */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                  <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm flex flex-col items-center">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Tổng điểm rủi ro</p>
                    <ScoreGaugeLight score={avgScore} />
                    <div className="mt-4 w-full space-y-1.5">
                      {[
                        { label: "Đánh giá", value: report.riskLevel },
                        { label: "Trạng thái", value: report.status },
                      ].map(({ label, value }) => (
                        <div key={label} className="flex items-center justify-between text-xs">
                          <span className="text-gray-400">{label}</span>
                          <span className="font-semibold text-gray-700">{value || "—"}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="w-8 h-8 bg-purple-50 rounded-xl flex items-center justify-center">
                        <Shield className="w-4 h-4 text-purple-500" />
                      </div>
                      <h3 className="text-sm font-bold text-gray-900">Khuyến nghị Deal Safety</h3>
                    </div>
                    {dealSafety ? (
                      <>
                        <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl mb-4">
                          <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                          <div>
                            <p className="text-sm font-bold text-amber-800 mb-1">
                              {dealSafety.warningLabel || "CẦN CHÚ Ý — Rủi ro cao"}
                            </p>
                            <p className="text-sm text-amber-700">{dealSafety.recommendation}</p>
                          </div>
                        </div>
                        {dealSafety.requiredProtocols && dealSafety.requiredProtocols.length > 0 && (
                          <div>
                            <p className="text-xs text-gray-500 font-bold uppercase tracking-wider mb-2">Giao thức bắt buộc:</p>
                            <ul className="space-y-2">
                              {dealSafety.requiredProtocols.map((p, i) => (
                                <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                                  <CheckCircle2 className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
                                  {p}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="flex items-center gap-3 text-sm text-gray-400 p-4 bg-gray-50 rounded-xl">
                        <Info className="w-4 h-4 shrink-0" />
                        Chưa có phân tích Deal Safety.
                      </div>
                    )}
                  </div>
                </div>

                {/* ── 8-Pillar Grid ── */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h2 className="text-lg font-extrabold text-gray-900">Phân tích 8 Trụ cột</h2>
                      <p className="text-sm text-gray-400">Thẩm định toàn diện theo từng chiều kiểm tra</p>
                    </div>
                    <span className="text-xs text-gray-400 bg-gray-50 border border-gray-100 px-3 py-1.5 rounded-xl">
                      {pillars.length}/8 trụ cột
                    </span>
                  </div>
                  {pillars.length === 0 ? (
                    <div className="bg-white rounded-2xl border border-gray-100 p-16 text-center shadow-sm">
                      <Clock className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                      <p className="text-gray-400 text-sm">Đang phân tích dữ liệu các trụ cột...</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {pillars.map((pillar) => <PillarCard key={pillar.pillarNo} pillar={pillar} />)}
                    </div>
                  )}
                </div>

                {/* ── AI CTA ── */}
                <div className="bg-gradient-to-r from-[#0A1A12] to-[#0D2218] rounded-2xl p-6 flex items-center justify-between">
                  <div>
                    <p className="text-[#5FD48A] text-xs font-bold uppercase tracking-widest mb-1">AI Copilot</p>
                    <h3 className="text-white font-bold text-base mb-1">Có câu hỏi về báo cáo này?</h3>
                    <p className="text-[#7BAA8C] text-sm">AI của chúng tôi sẵn sàng giải thích chi tiết từng trụ cột.</p>
                  </div>
                  <Link
                    href={`/chat?reportId=${id}`}
                    className="flex items-center gap-2 px-5 py-2.5 gradient-brand text-white font-bold rounded-xl hover:opacity-90 transition-opacity shrink-0"
                  >
                    <MessageSquare className="w-4 h-4" />
                    Hỏi AI →
                  </Link>
                </div>

              </div>
            )}
          </main>
        </div>
      </div>
    </AuthGuard>
  );
}

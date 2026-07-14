"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, AlertTriangle, Shield, RefreshCw, Globe, ExternalLink,
  CheckCircle2, XCircle, Clock, Download, MessageSquare,
  Building2, FileText, TrendingUp, Info, Star,
  Sparkles, ListChecks, Send, FileSearch
} from "lucide-react";
import { toast } from "sonner";
import { AuthGuard } from "@/components/shared/auth-guard";
import { Sidebar } from "@/components/layout/sidebar";
import { ContractPickerModal } from "@/components/contract/ContractPickerModal";
import { getReport, getReportRecommendations, patchDealInfo } from "@/services/report.service";
import { getContract, unlinkContract, listContractLinks } from "@/services/contract.service";
import { VerificationReport, PillarResult, ReportRecommendations, isProcessingStatus } from "@/types/report";
import { LinkResponse, ContractSummary } from "@/types/contract";

interface Props {
  params: Promise<{ id: string }>;
}

const PILLAR_ICONS: Record<number, React.ElementType> = {
  1: Shield, 2: Globe, 3: TrendingUp, 4: Building2,
  5: Star, 6: AlertTriangle, 7: FileText, 8: CheckCircle2,
};

// Trust-based color for the OVERALL score: higher = more trustworthy = green.
function trustStyle(score: number) {
  if (score >= 75) return { color: "#00D26A", bg: "#E6F9F0", textClass: "text-emerald-700", label: "Tin cậy cao" };
  if (score >= 40) return { color: "#F59E0B", bg: "#FFF8E7", textClass: "text-amber-700", label: "Cần thận trọng" };
  return { color: "#EF4444", bg: "#FFF1F0", textClass: "text-red-700", label: "Rủi ro cao" };
}

// Color/badge for a pillar driven by its STATUS (PASS/WARN/FAIL/SKIP),
// not by the raw number — so a high-trust pillar is green and an
// unverified one is a neutral grey "N/A" instead of a red "FAIL".
function pillarStatusStyle(status: string | undefined) {
  switch ((status || "").toUpperCase()) {
    case "PASS": return { color: "#00D26A", bg: "#E6F9F0", badge: "bg-emerald-50 text-emerald-700 border-emerald-200", label: "PASS", na: false };
    case "WARN": return { color: "#F59E0B", bg: "#FFF8E7", badge: "bg-amber-50 text-amber-700 border-amber-200", label: "WARN", na: false };
    case "FAIL": return { color: "#EF4444", bg: "#FFF1F0", badge: "bg-red-50 text-red-700 border-red-200", label: "FAIL", na: false };
    default:     return { color: "#9CA3AF", bg: "#F3F4F6", badge: "bg-gray-100 text-gray-500 border-gray-200", label: "N/A", na: true };
  }
}

function EvidenceRow({ ev }: { ev: { type?: string; text?: string; source?: string } }) {
  const t = (ev.type || "").toUpperCase();
  const Icon = t === "PASS" ? CheckCircle2 : t === "FAIL" ? XCircle : AlertTriangle;
  const cls = t === "PASS" ? "text-emerald-500" : t === "FAIL" ? "text-red-400" : "text-amber-500";
  return (
    <li className="text-xs text-gray-600 flex items-start gap-1.5">
      <Icon className={`w-3.5 h-3.5 shrink-0 mt-0.5 ${cls}`} />
      <span>
        {ev.text}
        {ev.source && <span className="text-gray-300"> · {ev.source}</span>}
      </span>
    </li>
  );
}

function ScoreGaugeLight({ score }: { score: number }) {
  const { color, label, textClass } = trustStyle(score);
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
  const st = pillarStatusStyle(pillar.status);
  const isNa = st.na || pillar.score == null;
  const score = pillar.score ?? 0;
  const Icon = PILLAR_ICONS[pillar.pillarNo] || Shield;
  const evidences = pillar.evidences ?? [];
  const findings = parseFindings(pillar.findings);

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm card-hover">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: st.bg }}>
            <Icon className="w-4.5 h-4.5" style={{ color: st.color }} />
          </div>
          <div>
            <p className="text-[10px] text-gray-400 font-mono uppercase">Trụ cột {pillar.pillarNo}</p>
            <h3 className="text-sm font-bold text-gray-900 mt-0.5">{pillar.pillarName}</h3>
          </div>
        </div>
        <div className="text-right shrink-0">
          {isNa ? (
            <div className="text-2xl font-extrabold text-gray-300">N/A</div>
          ) : (
            <>
              <div className="text-2xl font-extrabold" style={{ color: st.color }}>{score}</div>
              <div className="text-[10px] text-gray-400">điểm</div>
            </>
          )}
        </div>
      </div>

      {!isNa && (
        <div className="w-full bg-gray-100 rounded-full h-1.5 mb-3">
          <div className="h-1.5 rounded-full transition-all duration-700" style={{ width: `${score}%`, backgroundColor: st.color }} />
        </div>
      )}

      <div className="flex items-center justify-between">
        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${st.badge}`}>
          {isNa ? "N/A — Chưa đủ dữ liệu" : st.label}
        </span>
        {pillar.confidence && !isNa && (
          <span className="text-[11px] text-gray-400">Độ tin cậy: {pillar.confidence}</span>
        )}
      </div>

      {/* What was actually checked — evidence list */}
      {evidences.length > 0 ? (
        <ul className="mt-3 space-y-1.5 border-t border-gray-50 pt-3">
          {evidences.map((ev, i) => <EvidenceRow key={i} ev={ev} />)}
        </ul>
      ) : isNa ? (
        <p className="mt-3 border-t border-gray-50 pt-3 text-xs text-gray-400">
          {findings[0] || "Không tìm thấy dữ liệu từ nguồn để kiểm chứng trụ cột này."}
        </p>
      ) : null}
    </div>
  );
}

function RecGroup({ title, icon: Icon, items, color, bg }: {
  title: string; icon: React.ElementType; items?: string[]; color: string; bg: string;
}) {
  if (!items || items.length === 0) return null;
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-4">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: bg }}>
          <Icon className="w-4 h-4" style={{ color }} />
        </div>
        <p className="text-sm font-bold text-gray-900">{title}</p>
      </div>
      <ul className="space-y-2">
        {items.map((it, i) => (
          <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
            <span className="w-1.5 h-1.5 rounded-full shrink-0 mt-1.5" style={{ backgroundColor: color }} />
            <span>{it}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function AiRecommendations({ recs, loading }: { recs: ReportRecommendations | null; loading: boolean }) {
  const hasContent = recs && (
    (recs.actionItems?.length ?? 0) > 0 ||
    (recs.infoToProvide?.length ?? 0) > 0 ||
    (recs.infoToVerify?.length ?? 0) > 0 ||
    !!recs.summary
  );

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
      <div className="flex items-center gap-2 mb-1">
        <div className="w-8 h-8 bg-[#E6F9F0] rounded-xl flex items-center justify-center">
          <Sparkles className="w-4 h-4 text-[#00843F]" />
        </div>
        <h3 className="text-sm font-bold text-gray-900">Khuyến nghị từ AI</h3>
        <span className="text-[10px] font-bold text-[#00843F] bg-[#E6F9F0] px-2 py-0.5 rounded-full uppercase tracking-wider">
          AI
        </span>
      </div>
      <p className="text-xs text-gray-400 mb-4 ml-10">
        Các bước nên làm, thông tin cần bổ sung và cần xác minh — ngoài phần Deal Safety.
      </p>

      {loading ? (
        <div className="flex items-center gap-3 text-sm text-gray-400 p-4 bg-gray-50 rounded-xl">
          <div className="w-4 h-4 border-2 border-[#00D26A]/20 border-t-[#00D26A] rounded-full animate-spin" />
          AI đang phân tích và soạn khuyến nghị...
        </div>
      ) : !hasContent ? (
        <div className="flex items-center gap-3 text-sm text-gray-400 p-4 bg-gray-50 rounded-xl">
          <Info className="w-4 h-4 shrink-0" />
          Chưa tạo được khuyến nghị cho báo cáo này.
        </div>
      ) : (
        <>
          {recs?.summary && (
            <div className="flex items-start gap-3 p-4 bg-[#F0FAF4] border border-emerald-100 rounded-xl mb-4">
              <Sparkles className="w-5 h-5 text-[#00843F] shrink-0 mt-0.5" />
              <p className="text-sm text-emerald-800 font-medium">{recs.summary}</p>
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <RecGroup title="Nên làm gì" icon={ListChecks} items={recs?.actionItems}
              color="#00843F" bg="#E6F9F0" />
            <RecGroup title="Cần cung cấp thêm" icon={Send} items={recs?.infoToProvide}
              color="#2563EB" bg="#EFF4FF" />
            <RecGroup title="Cần xác minh" icon={FileSearch} items={recs?.infoToVerify}
              color="#9333EA" bg="#F6EEFE" />
          </div>
        </>
      )}
    </div>
  );
}

type PaymentMethodSafety = "SAFE" | "MODERATE" | "RISKY";

function TransactionInfoCard({
  report, onReportUpdate,
}: { report: VerificationReport; onReportUpdate: (r: VerificationReport) => void }) {
  const [showModal, setShowModal] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: "verified" | "mismatch"; text: string } | null>(null);
  // Keyed by contract id so a stale filename can never render for a moment
  // after unlink/relink — the effect only ever writes via its .then(), the
  // id-equality check below is what actually gates what's shown.
  const [verifiedContract, setVerifiedContract] = useState<{ id: string; fileName: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    paymentMethodSafety: report.selfReportPaymentMethodSafety ?? "",
    depositPercentage: report.selfReportDepositPercentage?.toString() ?? "",
    dealValueUsd: report.selfReportDealValueUsd?.toString() ?? "",
  });

  useEffect(() => {
    const id = report.p7VerifiedContractId;
    if (!id) return;
    let cancelled = false;
    getContract(id).then((c) => { if (!cancelled) setVerifiedContract({ id, fileName: c.fileName }); }).catch(() => {});
    return () => { cancelled = true; };
  }, [report.p7VerifiedContractId]);

  const verifiedFileName = verifiedContract && verifiedContract.id === report.p7VerifiedContractId ? verifiedContract.fileName : null;

  // A contract can be attached from the pre-scan form (/verify) too, before this
  // component ever mounts — if it mismatched there, nothing else would surface
  // that. Without this, "no contract attached" and "attached but mismatched"
  // look identical (P7 = N/A either way), which is confusing.
  useEffect(() => {
    if (report.p7VerifiedContractId) return;
    let cancelled = false;
    listContractLinks(report.id).then((links) => {
      if (cancelled || links.length === 0) return;
      const latest = links[0];
      if (latest.verificationStatus === "MISMATCH") {
        setStatusMessage({
          type: "mismatch",
          text: `⚠ Hợp đồng "${latest.fileName}" không khớp với ${report.entityName} — dữ liệu chỉ mang tính tham khảo, không ảnh hưởng điểm`,
        });
      }
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [report.id, report.p7VerifiedContractId, report.entityName]);

  const saveSelfReport = async (hasWrittenContract: boolean | null) => {
    setSaving(true);
    try {
      const updated = await patchDealInfo(report.id, {
        paymentMethodSafety: (form.paymentMethodSafety || null) as PaymentMethodSafety | null,
        depositPercentage: form.depositPercentage ? Number(form.depositPercentage) : null,
        dealValueUsd: form.dealValueUsd ? Number(form.dealValueUsd) : null,
        hasWrittenContract,
      });
      onReportUpdate(updated);
      toast.success("Đã lưu thông tin giao dịch.");
    } catch {
      toast.error("Không thể lưu thông tin giao dịch.");
    } finally {
      setSaving(false);
    }
  };

  const handleLinked = async (result: LinkResponse, contract: ContractSummary) => {
    setShowModal(false);
    setStatusMessage(
      result.verificationStatus === "VERIFIED"
        ? { type: "verified", text: `✓ Đã xác minh qua ${contract.fileName}` }
        : {
            type: "mismatch",
            text: `⚠ Hợp đồng không khớp với ${report.entityName} — dữ liệu chỉ mang tính tham khảo, không ảnh hưởng điểm`,
          }
    );
    try {
      onReportUpdate(await getReport(report.id));
    } catch { /* status message above already communicates the outcome */ }
  };

  const handleUnlink = async () => {
    if (!report.p7VerifiedContractId) return;
    try {
      await unlinkContract(report.id, report.p7VerifiedContractId);
      setStatusMessage(null);
      onReportUpdate(await getReport(report.id));
    } catch {
      toast.error("Không thể bỏ liên kết hợp đồng.");
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
      <div className="flex items-center gap-2 mb-1">
        <div className="w-8 h-8 bg-purple-50 rounded-xl flex items-center justify-center">
          <FileText className="w-4 h-4 text-purple-500" />
        </div>
        <h3 className="text-sm font-bold text-gray-900">Thông tin giao dịch</h3>
      </div>
      <p className="text-xs text-gray-400 mb-4 ml-10">
        Tự khai báo — chỉ tính điểm khi có hợp đồng thật đã tải lên và khớp với đối tác đang thẩm định.
      </p>

      {(verifiedFileName || statusMessage) && (
        <div className={`flex items-center justify-between gap-2 mb-4 px-4 py-2.5 rounded-xl text-sm ${
          verifiedFileName ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
            : statusMessage?.type === "verified" ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
            : "bg-amber-50 text-amber-700 border border-amber-200"
        }`}>
          <span>{verifiedFileName ? `✓ Đã xác minh qua ${verifiedFileName}` : statusMessage?.text}</span>
          {verifiedFileName && (
            <button onClick={handleUnlink} className="text-xs underline shrink-0">Bỏ liên kết</button>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
        <div>
          <label className="text-xs text-gray-500 block mb-1">Phương thức thanh toán</label>
          <select
            value={form.paymentMethodSafety}
            onChange={(e) => setForm((f) => ({ ...f, paymentMethodSafety: e.target.value }))}
            className="w-full text-sm border border-gray-200 rounded-lg px-2.5 py-1.5"
          >
            <option value="">— Chọn —</option>
            <option value="SAFE">An toàn (L/C, escrow)</option>
            <option value="MODERATE">Trung bình (T/T một phần)</option>
            <option value="RISKY">Rủi ro cao (trả trước 100%)</option>
          </select>
        </div>
        <div>
          <label className="text-xs text-gray-500 block mb-1">Đặt cọc trước (%)</label>
          <input
            type="number" min={0} max={100}
            value={form.depositPercentage}
            onChange={(e) => setForm((f) => ({ ...f, depositPercentage: e.target.value }))}
            className="w-full text-sm border border-gray-200 rounded-lg px-2.5 py-1.5"
          />
        </div>
        <div>
          <label className="text-xs text-gray-500 block mb-1">Giá trị giao dịch (USD)</label>
          <input
            type="number" min={0}
            value={form.dealValueUsd}
            onChange={(e) => setForm((f) => ({ ...f, dealValueUsd: e.target.value }))}
            className="w-full text-sm border border-gray-200 rounded-lg px-2.5 py-1.5"
          />
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">Đã có hợp đồng thành văn?</span>
          <button
            onClick={() => setShowModal(true)}
            className="px-3 py-1 text-xs font-semibold rounded-full bg-[#E6F9F0] text-[#00843F]"
          >Có</button>
          <button
            onClick={() => saveSelfReport(false)}
            className="px-3 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-500"
          >Không</button>
        </div>
        <button
          onClick={() => saveSelfReport(report.selfReportHasWrittenContract ?? null)}
          disabled={saving}
          className="px-3 py-1.5 text-xs font-bold text-white rounded-lg bg-gray-800 disabled:opacity-60"
        >
          {saving ? "Đang lưu..." : "Lưu"}
        </button>
      </div>

      {showModal && (
        <ContractPickerModal
          reportId={report.id}
          onClose={() => setShowModal(false)}
          onLinked={handleLinked}
        />
      )}
    </div>
  );
}

export default function ReportDetailPage({ params }: Props) {
  const { id } = use(params);
  const router = useRouter();
  const [report, setReport] = useState<VerificationReport | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRescan, setIsRescan] = useState(false);
  const [recs, setRecs] = useState<ReportRecommendations | null>(null);
  const [recsLoading, setRecsLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;

    const load = () => {
      getReport(id)
        .then((r) => {
          if (cancelled) return;
          setReport(r);
          // Scan pipeline still running in the background — poll until it lands
          // on a terminal status, otherwise the deal-safety recommendation and
          // final score only ever show up after a manual page reload.
          if (r.status === "PENDING" || r.status === "PROCESSING") {
            timer = setTimeout(load, 3000);
          }
        })
        .catch(() => { if (!cancelled) toast.error("Không tải được báo cáo."); })
        .finally(() => { if (!cancelled) setIsLoading(false); });
    };
    load();

    return () => { cancelled = true; clearTimeout(timer); };
  }, [id]);

  // Generate AI next-step recommendations once the report has loaded.
  useEffect(() => {
    if (!report || isProcessingStatus(report.status)) return;
    setRecsLoading(true);
    getReportRecommendations(id)
      .then(setRecs)
      .catch(() => setRecs(null))
      .finally(() => setRecsLoading(false));
  }, [report, id]);

  // A rescan is a brand-new Deep Verify run (fresh quota spend), not an in-place
  // refresh — pre-fill the /verify form with this report's company/country and
  // let the user review + confirm there, same as any other verify request.
  const handleRescan = () => {
    if (!report) return;
    setIsRescan(true);
    const params = new URLSearchParams({ q: report.entityName });
    if (report.countryIso2) params.set("country", report.countryIso2);
    router.push(`/verify?${params.toString()}`);
  };

  const pillars = report?.pillars ?? [];

  interface DealSafety { warningLabel?: string; recommendation?: string; requiredProtocols?: string[] }
  let dealSafety: DealSafety | null = null;
  if (report?.dealSafetyAnalysis) {
    try { dealSafety = JSON.parse(report.dealSafetyAnalysis) as DealSafety; }
    catch { dealSafety = { recommendation: report.dealSafetyAnalysis }; }
  }

  // Use the backend's weighted overall score — it already excludes N/A pillars,
  // so unverified sources don't drag a legitimate company's score down to 0.
  const avgScore = report?.overallScore ?? 0;

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
                {isProcessingStatus(report?.status) && (
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
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Điểm tin cậy tổng</p>
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

                {/* ── Transaction Info (P7 self-report + contract verification) ── */}
                <TransactionInfoCard report={report} onReportUpdate={setReport} />

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

                {/* ── AI Recommendations ── */}
                <AiRecommendations recs={recs} loading={recsLoading} />

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

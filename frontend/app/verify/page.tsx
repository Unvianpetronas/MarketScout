"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  Search, Globe, CheckCircle2, Clock, XCircle, Zap, Shield,
  HelpCircle, ChevronRight, AlertTriangle, Building2, ExternalLink,
  MapPin, Star, ChevronDown, ShieldCheck, ShieldAlert, Percent,
  FileSignature, DollarSign, Sparkles, FileText, X as XIcon,
} from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import { AuthGuard } from "@/components/shared/auth-guard";
import { Sidebar } from "@/components/layout/sidebar";
import { ContractPickerModal } from "@/components/contract/ContractPickerModal";
import { getMyQuota } from "@/services/quota.service";
import { QuotaStatus } from "@/types/quota";
import { getReports } from "@/services/report.service";
import { streamPipelineMessage } from "@/services/chat.service";
import { ReportListItem, isProcessingStatus } from "@/types/report";
import { useAuth } from "@/providers/auth-provider";
import { useLanguage } from "@/providers/language-provider";

const COUNTRIES = [
  { code: "US", name: "United States", flag: "🇺🇸" },
  { code: "CN", name: "China", flag: "🇨🇳" },
  { code: "VN", name: "Vietnam", flag: "🇻🇳" },
  { code: "DE", name: "Germany", flag: "🇩🇪" },
  { code: "GB", name: "United Kingdom", flag: "🇬🇧" },
  { code: "JP", name: "Japan", flag: "🇯🇵" },
  { code: "KR", name: "South Korea", flag: "🇰🇷" },
  { code: "IN", name: "India", flag: "🇮🇳" },
  { code: "SG", name: "Singapore", flag: "🇸🇬" },
  { code: "TH", name: "Thailand", flag: "🇹🇭" },
  { code: "MY", name: "Malaysia", flag: "🇲🇾" },
  { code: "AU", name: "Australia", flag: "🇦🇺" },
];

const EXAMPLE_QUERIES = [
  "Apple Inc, US",
  "Samsung Electronics, KR",
  "Vingroup JSC, VN",
  "Alibaba Group, CN",
];

function getRiskColor(score: number | null | undefined) {
  if (!score && score !== 0) return "#9CA3AF";
  if (score < 40) return "#059669";
  if (score < 70) return "#F59E0B";
  return "#EF4444";
}

function ScoreRing({ score }: { score: number | null | undefined }) {
  if (!score && score !== 0) return (
    <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center text-xs text-gray-300 shrink-0">—</div>
  );
  const color = getRiskColor(score);
  const bg = score < 40 ? "#E7F6EF" : score < 70 ? "#FFF8E7" : "#FFF1F0";
  const r = 18; const circ = 2 * Math.PI * r;
  const offset = circ - (score / 100) * circ;
  return (
    <div className="relative w-12 h-12 shrink-0">
      <svg width="48" height="48" viewBox="0 0 48 48" className="-rotate-90">
        <circle cx="24" cy="24" r={r} fill={bg} />
        <circle cx="24" cy="24" r={r} fill="none" stroke="#E5E7EB" strokeWidth="4" />
        <circle cx="24" cy="24" r={r} fill="none" stroke={color} strokeWidth="4"
          strokeDasharray={circ} strokeDashoffset={offset}
          strokeLinecap="round" />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-xs font-extrabold" style={{ color }}>
        {score}
      </span>
    </div>
  );
}

// Matches Report.status on the backend: PENDING | QUICK_SCANNING | DEEP_SCANNING | DONE | HARD_STOP | FAILED
function StatusBadge({ status }: { status: string | null | undefined }) {
  const { t } = useLanguage();
  const s = status || "";
  if (s === "DONE") return <span className="risk-low text-xs font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> {t("status.completed")}</span>;
  if (s === "PENDING" || s === "QUICK_SCANNING" || s === "DEEP_SCANNING") return (
    <span className="bg-blue-50 text-blue-700 border border-blue-200 text-xs font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1.5">
      <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" /> {t("verify.status.scanning")}
    </span>
  );
  if (s === "HARD_STOP") return <span className="risk-high text-xs font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1"><XCircle className="w-3 h-3" /> {t("verify.status.hardStop")}</span>;
  if (s === "FAILED") return <span className="risk-high text-xs font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1"><XCircle className="w-3 h-3" /> {t("status.failed")}</span>;
  return <span className="bg-gray-50 text-gray-500 border border-gray-200 text-xs font-bold px-2.5 py-0.5 rounded-full">{status}</span>;
}

function VerifyContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user } = useAuth();
  const { t } = useLanguage();
  const [query, setQuery] = useState(searchParams.get("q") || "");
  const [country, setCountry] = useState(searchParams.get("country") || "");
  const [website, setWebsite] = useState("");
  const [quota, setQuota] = useState<QuotaStatus | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [verifyStatus, setVerifyStatus] = useState("");
  const [recentReports, setRecentReports] = useState<ReportListItem[]>([]);
  const [isLoadingReports, setIsLoadingReports] = useState(true);
  const [inputFocused, setInputFocused] = useState(false);

  // ── P7 — Deal Structure Risk (optional) ──────────────────────────────────
  // Self-report fields below are reference-only (never scored — see
  // CompanyInput's note on the backend). Only pickedContract (a real, uploaded
  // contract) can actually move the P7 score, via cross-check after the
  // report is created.
  const [showDeal, setShowDeal] = useState(false);
  const [paymentSafety, setPaymentSafety] = useState<"" | "SAFE" | "MODERATE" | "RISKY">("");
  const [deposit, setDeposit] = useState(30);
  const [depositSet, setDepositSet] = useState(false);
  const [hasContract, setHasContract] = useState<null | boolean>(null);
  const [dealValue, setDealValue] = useState("");
  const [showContractModal, setShowContractModal] = useState(false);
  const [pickedContract, setPickedContract] = useState<{ id: string; fileName: string } | null>(null);

  const dealFilledCount =
    (paymentSafety ? 1 : 0) + (depositSet ? 1 : 0) + (hasContract !== null ? 1 : 0)
    + (dealValue ? 1 : 0) + (pickedContract ? 1 : 0);

  useEffect(() => {
    getMyQuota().then(setQuota).catch(() => null);
    getReports()
      .then((data) => setRecentReports(data.slice(0, 6)))
      .catch(() => null)
      .finally(() => setIsLoadingReports(false));
  }, []);

  const handleSearch = async (e: React.FormEvent | null, overrideQuery?: string) => {
    e?.preventDefault();
    const q = overrideQuery ?? query;
    if (!q.trim()) { toast.error(t("dash.errEnterName")); return; }

    if (quota && quota.quotaRemaining <= 0) {
      toast.error(t("verify.errQuotaExceeded"));
      router.push("/pricing");
      return;
    }

    const countryName = COUNTRIES.find((c) => c.code === country)?.name || country;
    const preMessage = countryName
      ? `Verify company "${q}" in ${countryName}. Run full background check and 8-pillar analysis.`
      : `Verify company "${q}". Run full background check and 8-pillar analysis.`;

    // Self-report deal fields — reference only, saved to Report.selfReport*,
    // never scored. contractId is the only thing that can actually move P7 —
    // it gets cross-checked against the new report right after it's created.
    const deal: {
      depositPercentage?: number; hasWrittenContract?: boolean;
      paymentMethodSafety?: "SAFE" | "MODERATE" | "RISKY"; dealValueUsd?: number;
      contractId?: string; website?: string;
    } = {};
    if (paymentSafety) deal.paymentMethodSafety = paymentSafety;
    if (depositSet) deal.depositPercentage = deposit;
    if (hasContract !== null) deal.hasWrittenContract = hasContract;
    if (dealValue.trim()) deal.dealValueUsd = Number(dealValue.trim());
    if (pickedContract) deal.contractId = pickedContract.id;
    if (website.trim()) deal.website = website.trim();

    // Run the verification IN PLACE (no chat detour) so the deal params reach the
    // pipeline directly and P7 is scored. Redirect to the report when it's ready.
    // confirmVerify:true — this dedicated form (with its own quota check above and
    // an explicit submit click) already IS the user's confirmation, so it skips
    // ChatService's chat-style "are you sure?" gate and runs immediately.
    setIsSearching(true);
    setVerifyStatus(t("verify.statusInitializing"));
    let navigated = false;

    streamPipelineMessage(
      { message: preMessage, sessionId: "", confirmVerify: true, ...deal },
      (chunk, status) => { if (status === "thinking" || !status) setVerifyStatus(chunk); },
      () => {
        // Finished with no report → ambiguous name / non-verify answer. Hand off to
        // chat (carrying deal params) so the user can clarify.
        if (navigated) return;
        const params = new URLSearchParams({ preMessage });
        if (deal.paymentMethodSafety) params.set("dealPayment", deal.paymentMethodSafety);
        if (deal.depositPercentage != null) params.set("dealDeposit", String(deal.depositPercentage));
        if (deal.hasWrittenContract != null) params.set("dealContract", String(deal.hasWrittenContract));
        if (deal.dealValueUsd != null) params.set("dealValue", String(deal.dealValueUsd));
        if (deal.website) params.set("dealWebsite", deal.website);
        router.push(`/chat?${params.toString()}`);
      },
      () => { setIsSearching(false); setVerifyStatus(""); toast.error(t("verify.errVerifyFailed")); },
      (meta) => {
        if (meta.reportId && !navigated) {
          navigated = true;
          router.push(`/reports/${meta.reportId}`);
        }
      }
    );
  };

  const userInitials = (user?.fullName || user?.email || "U").split(" ").map((n: string) => n[0]).slice(0, 2).join("").toUpperCase();

  return (
    <AuthGuard>
      {/* ── In-place verification progress overlay ── */}
      {isSearching && (
        <div className="fixed inset-0 z-50 bg-[#0b1120]/60 backdrop-blur-sm flex items-center justify-center p-6 animate-fade-in">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-8 text-center">
            <div className="w-16 h-16 mx-auto mb-5 relative">
              <div className="absolute inset-0 rounded-full border-4 border-[#059669]/15" />
              <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-[#059669] animate-spin" />
              <div className="absolute inset-0 flex items-center justify-center">
                <Shield className="w-6 h-6 text-[#059669]" />
              </div>
            </div>
            <h3 className="text-lg font-extrabold text-gray-900 mb-1.5">
              {t("verify.overlayTitle", { name: query.trim() || t("verify.overlayDefaultName") })}
            </h3>
            <p className="text-sm text-gray-500 min-h-[20px] mb-5">
              {verifyStatus || t("verify.overlayAnalyzing")}
            </p>
            <div className="flex items-center justify-center gap-1.5 mb-5">
              {[0, 150, 300].map((d) => (
                <span key={d} className="w-2 h-2 rounded-full bg-[#059669]"
                  style={{ animation: `bounce 1.2s ${d}ms ease-in-out infinite` }} />
              ))}
            </div>
            {pickedContract && (
              <div className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-[#7C3AED] bg-[#F3EEFF] px-3 py-1.5 rounded-full mb-4">
                <FileSignature className="w-3 h-3" /> {t("verify.overlayContractCheck")}
              </div>
            )}
            <p className="text-[11px] text-gray-400">{t("verify.overlayDurationNote")}</p>
          </div>
        </div>
      )}

      {showContractModal && (
        <ContractPickerModal
          onClose={() => setShowContractModal(false)}
          onSelected={(contractId, fileName) => {
            setPickedContract({ id: contractId, fileName });
            setHasContract(true);
            setShowContractModal(false);
          }}
        />
      )}

      <div className="flex h-screen overflow-hidden bg-[#faf9f6]">
        <Sidebar active="verify" />
        <div className="flex-1 overflow-y-auto scrollbar-thin">
          <div className="max-w-4xl mx-auto px-6 py-8">

            {/* ── Header ── */}
            <div className="mb-8 animate-fade-in-up">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <p className="text-xs font-bold text-[#059669] uppercase tracking-widest mb-1">{t("verify.eyebrow")}</p>
                  <h1 className="text-3xl font-extrabold text-gray-900 mb-1">{t("verify.pageTitle")}</h1>
                  <p className="text-sm text-gray-400">{t("verify.pageSubtitle")}</p>
                </div>
                {quota && (
                  <div className="flex flex-col items-end gap-1">
                    <div className={`flex items-center gap-2 px-4 py-2 rounded-2xl border text-sm font-bold ${
                      quota.quotaRemaining > 5 ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                        : quota.quotaRemaining > 0 ? "bg-amber-50 border-amber-200 text-amber-700"
                        : "bg-red-50 border-red-200 text-red-700"
                    }`}>
                      🔋 {t("profile.quotaRemaining", { n: quota.quotaRemaining })}
                    </div>
                    {quota.quotaRemaining <= 3 && (
                      <Link href="/pricing" className="text-xs text-[#059669] hover:underline font-semibold">
                        {t("nav.upgrade")} →
                      </Link>
                    )}
                  </div>
                )}
              </div>

              {/* ── Search Card ── */}
              <div className={`bg-white rounded-2xl border shadow-[0_2px_20px_rgba(16,22,43,0.03)] p-6 transition-all ${
                inputFocused ? "border-[#059669] ring-2 ring-[#059669]/15 shadow-md" : "border-[rgba(16,22,43,0.06)]"
              }`}>
                <form onSubmit={handleSearch} className="flex gap-3">
                  <div className="flex-1 relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
                    <input
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      onFocus={() => setInputFocused(true)}
                      onBlur={() => setInputFocused(false)}
                      placeholder={t("verify.searchPlaceholder")}
                      className="w-full pl-11 pr-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#059669] focus:bg-white transition-all font-medium"
                    />
                  </div>
                  <div className="relative w-52">
                    <Globe className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
                    <select value={country} onChange={(e) => setCountry(e.target.value)}
                      className="w-full pl-10 pr-4 py-3.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#059669] bg-gray-50 appearance-none font-medium">
                      <option value="">{t("country.all")}</option>
                      {COUNTRIES.map((c) => (
                        <option key={c.code} value={c.code}>{c.flag} {c.name}</option>
                      ))}
                    </select>
                  </div>
                  <button type="submit" disabled={isSearching}
                    className="px-7 py-3.5 gradient-brand text-white font-bold rounded-xl hover:opacity-90 transition-all disabled:opacity-60 flex items-center gap-2 shrink-0 shadow-[0_2px_20px_rgba(16,22,43,0.03)]">
                    {isSearching ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Zap className="w-4 h-4" />}
                    {isSearching ? `${t("status.processing")}...` : t("verify.submitBtn")}
                  </button>
                </form>

                {/* Website (optional) — lets P2 (Digital Footprint) check the real
                    domain instead of guessing one via search. */}
                <div className="mt-3 relative">
                  <Globe className="absolute left-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-300" />
                  <input
                    value={website}
                    onChange={(e) => setWebsite(e.target.value)}
                    placeholder={t("verify.websitePlaceholder")}
                    className="w-full pl-10 pr-4 py-2.5 bg-gray-50/60 border border-[rgba(16,22,43,0.06)] rounded-xl text-xs focus:outline-none focus:border-[#059669] focus:bg-white transition-all"
                  />
                </div>

                {/* Quick Examples */}
                <div className="mt-4 flex items-center gap-2 flex-wrap">
                  <span className="text-xs text-gray-400 font-medium">{t("verify.examplesLabel")}</span>
                  {EXAMPLE_QUERIES.map((q) => (
                    <button key={q} onClick={() => { setQuery(q.split(",")[0].trim()); setCountry(q.split(",")[1]?.trim() || ""); }}
                      className="text-xs px-3 py-1 bg-gray-50 border border-gray-200 text-gray-500 rounded-full hover:border-[#059669] hover:text-[#047857] hover:bg-[#E7F6EF] transition-all">
                      {q}
                    </button>
                  ))}
                </div>
              </div>

              {/* ── Deal Structure (P7) — optional ── */}
              <div className="mt-4 bg-white rounded-2xl border border-[rgba(16,22,43,0.06)] shadow-[0_2px_20px_rgba(16,22,43,0.03)] overflow-hidden">
                <button
                  type="button"
                  onClick={() => setShowDeal((v) => !v)}
                  className="w-full flex items-center gap-3 px-6 py-4 text-left hover:bg-gray-50/60 transition-colors"
                >
                  <div className="w-9 h-9 rounded-xl bg-[#F3EEFF] flex items-center justify-center shrink-0">
                    <FileSignature className="w-4.5 h-4.5 text-[#7C3AED]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-bold text-gray-900">{t("verify.dealInfoTitle")}</p>
                      <span className="text-[10px] font-bold text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-full uppercase tracking-wide">{t("verify.optionalBadge")}</span>
                      {dealFilledCount > 0 && (
                        <span className="text-[10px] font-bold text-[#7C3AED] bg-[#F3EEFF] px-1.5 py-0.5 rounded-full">
                          {t("verify.itemsCount", { n: dealFilledCount })}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {t("verify.dealInfoDescPrefix")} <span className="font-semibold text-gray-500">{t("verify.pillar7Label")}</span>
                    </p>
                  </div>
                  <ChevronDown className={`w-5 h-5 text-gray-300 shrink-0 transition-transform ${showDeal ? "rotate-180" : ""}`} />
                </button>

                {showDeal && (
                  <div className="px-6 pb-6 pt-1 space-y-6 border-t border-gray-50 animate-fade-in">
                    {/* Payment method safety */}
                    <div>
                      <label className="text-xs font-bold text-gray-700 mb-2.5 block">
                        {t("verify.paymentMethodLabel")}
                      </label>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                        {([
                          { v: "SAFE", label: t("verify.payment.safe"), sub: t("verify.payment.safeSub"), Icon: ShieldCheck, color: "#059669", bg: "#E7F6EF", ring: "#059669" },
                          { v: "MODERATE", label: t("verify.payment.moderate"), sub: t("verify.payment.moderateSub"), Icon: Shield, color: "#D97706", bg: "#FFF8E7", ring: "#F59E0B" },
                          { v: "RISKY", label: t("verify.payment.risky"), sub: t("verify.payment.riskySub"), Icon: ShieldAlert, color: "#DC2626", bg: "#FFF1F0", ring: "#EF4444" },
                        ] as const).map(({ v, label, sub, Icon, color, bg, ring }) => {
                          const active = paymentSafety === v;
                          return (
                            <button
                              key={v}
                              type="button"
                              onClick={() => setPaymentSafety(active ? "" : v)}
                              className={`text-left p-3.5 rounded-xl border-2 transition-all ${
                                active ? "shadow-[0_2px_20px_rgba(16,22,43,0.03)]" : "border-[rgba(16,22,43,0.06)] hover:border-gray-200"
                              }`}
                              style={active ? { borderColor: ring, backgroundColor: bg } : undefined}
                            >
                              <div className="flex items-center justify-between mb-1.5">
                                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: bg }}>
                                  <Icon className="w-4 h-4" style={{ color }} />
                                </div>
                                {active && <CheckCircle2 className="w-4 h-4" style={{ color: ring }} />}
                              </div>
                              <p className="text-sm font-bold text-gray-900">{label}</p>
                              <p className="text-[11px] text-gray-400 mt-0.5">{sub}</p>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Deposit slider */}
                      <div>
                        <div className="flex items-center justify-between mb-2.5">
                          <label className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
                            <Percent className="w-3.5 h-3.5 text-gray-400" /> {t("verify.depositLabel")}
                          </label>
                          <span className={`text-sm font-extrabold ${depositSet ? "text-[#047857]" : "text-gray-300"}`}>
                            {depositSet ? `${deposit}%` : "—"}
                          </span>
                        </div>
                        <input
                          type="range" min={0} max={100} step={5} value={deposit}
                          onChange={(e) => { setDeposit(Number(e.target.value)); setDepositSet(true); }}
                          className="w-full accent-[#059669] cursor-pointer"
                        />
                        <div className="flex justify-between text-[10px] text-gray-300 font-medium mt-1">
                          <span>0%</span><span>{t("verify.depositLowSafer")}</span><span>100%</span>
                        </div>
                      </div>

                      {/* Deal value */}
                      <div>
                        <label className="text-xs font-bold text-gray-700 mb-2.5 flex items-center gap-1.5">
                          <DollarSign className="w-3.5 h-3.5 text-gray-400" /> {t("verify.dealValueLabel")} <span className="text-gray-300 font-medium">(USD)</span>
                        </label>
                        <div className="relative">
                          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-semibold">$</span>
                          <input
                            type="number" min={0} inputMode="numeric" value={dealValue}
                            onChange={(e) => setDealValue(e.target.value)}
                            placeholder={t("verify.dealValuePlaceholder")}
                            className="w-full pl-8 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#059669] focus:bg-white transition-all font-medium"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Written contract — pick/upload a real contract, or self-report only */}
                    <div className="bg-gray-50 rounded-xl px-4 py-3">
                      {pickedContract ? (
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <FileText className="w-4 h-4 text-[#047857] shrink-0" />
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-gray-700 truncate">{pickedContract.fileName}</p>
                              <p className="text-[11px] text-emerald-600">
                                {t("verify.contractCrossCheckNote")}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <button type="button" onClick={() => setShowContractModal(true)}
                              className="text-xs font-semibold text-gray-500 hover:text-gray-700">
                              {t("verify.changeBtn")}
                            </button>
                            <button type="button" onClick={() => setPickedContract(null)}
                              className="text-gray-300 hover:text-gray-500">
                              <XIcon className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <FileSignature className="w-4 h-4 text-gray-400 shrink-0" />
                            <div>
                              <p className="text-xs font-bold text-gray-700">{t("verify.hasContractQuestion")}</p>
                              <p className="text-[11px] text-gray-400">{t("verify.hasContractHint")}</p>
                            </div>
                          </div>
                          <div className="flex gap-1.5 shrink-0">
                            <button
                              type="button"
                              onClick={() => setShowContractModal(true)}
                              className="px-4 py-1.5 rounded-lg text-xs font-bold transition-all border bg-white text-gray-400 border-gray-200 hover:border-[#059669] hover:text-[#047857]"
                            >
                              {t("verify.yesBtn")}
                            </button>
                            <button
                              type="button"
                              onClick={() => setHasContract(hasContract === false ? null : false)}
                              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                                hasContract === false
                                  ? "bg-amber-50 text-amber-700 border-amber-300"
                                  : "bg-white text-gray-400 border-gray-200 hover:border-gray-300"
                              }`}
                            >
                              {t("verify.noBtn")}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="flex items-start gap-2 text-[11px] text-gray-400 leading-relaxed">
                      <Sparkles className="w-3.5 h-3.5 text-[#7C3AED] shrink-0 mt-0.5" />
                      <span>
                        {t("verify.dealNotePart1")} <span className="font-semibold">{t("verify.dealNoteMatch")}</span> {t("verify.dealNotePart2")}{" "}
                        <span className="font-semibold">N/A</span> {t("verify.dealNotePart3")}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* ── Info Banner ── */}
              <div className="mt-4 bg-blue-50 border border-blue-200 rounded-2xl p-4 flex items-start gap-3">
                <Shield className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-blue-800 mb-0.5">{t("verify.aiProcessTitle")}</p>
                  <p className="text-xs text-blue-600 leading-relaxed">
                    {t("verify.aiProcessDesc")}
                  </p>
                </div>
              </div>
            </div>

            {/* ── Recent Reports ── */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-extrabold text-gray-900">{t("dash.recentReports")}</h2>
                <Link href="/reports" className="text-sm text-[#059669] hover:underline font-semibold flex items-center gap-1">
                  {t("dash.viewAll")} <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              {isLoadingReports ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="bg-white rounded-2xl border border-[rgba(16,22,43,0.06)] p-4 h-20 shimmer" />
                  ))}
                </div>
              ) : recentReports.length === 0 ? (
                <div className="bg-white rounded-2xl border border-[rgba(16,22,43,0.06)] p-8 text-center shadow-[0_2px_20px_rgba(16,22,43,0.03)]">
                  <Building2 className="w-10 h-10 text-gray-100 mx-auto mb-3" />
                  <p className="text-gray-400 text-sm font-semibold mb-1">{t("dash.noReports")}</p>
                  <p className="text-xs text-gray-300">{t("dash.noReportsSub")}</p>
                </div>
              ) : (
                <div className="space-y-3 stagger">
                  {recentReports.map((report) => {
                    const isProcessing = isProcessingStatus(report.status);
                    return (
                      <div key={report.id}
                        className="bg-white rounded-2xl border border-[rgba(16,22,43,0.06)] p-4 shadow-[0_2px_20px_rgba(16,22,43,0.03)] card-hover group flex items-center gap-4">
                        <ScoreRing score={report.overallScore} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <p className="text-sm font-bold text-gray-900">{report.entityName}</p>
                            {report.hardStop && (
                              <span className="text-[10px] font-bold text-red-700 bg-red-50 border border-red-200 px-1.5 py-0.5 rounded">
                                HARD STOP
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-3 text-xs text-gray-400">
                            {report.countryIso2 && <span className="flex items-center gap-1"><Globe className="w-3 h-3" /> {report.countryIso2}</span>}
                            <StatusBadge status={report.status} />
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Link href={`/reports/${report.id}`}
                            className="flex items-center gap-1.5 px-3 py-1.5 gradient-brand text-white text-xs font-bold rounded-xl hover:opacity-90">
                            {t("verify.viewReportBtn")} <ChevronRight className="w-3 h-3" />
                          </Link>
                          {report.status === "DONE" && (
                            <button onClick={() => {
                              const msg = encodeURIComponent(t("verify.analyzeReportPrompt", { name: report.entityName }));
                              router.push(`/chat?preMessage=${msg}`);
                            }} className="px-3 py-1.5 bg-gray-50 border border-gray-200 text-gray-600 text-xs font-semibold rounded-xl hover:bg-gray-100">
                              {t("dash.askAi")}
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* ── 8 Pillars Info ── */}
            <div className="mt-8 bg-white rounded-2xl border border-[rgba(16,22,43,0.06)] shadow-[0_2px_20px_rgba(16,22,43,0.03)] p-6">
              <h3 className="text-sm font-extrabold text-gray-900 mb-4 flex items-center gap-2">
                <Shield className="w-4 h-4 text-[#059669]" />
                {t("verify.pillarsTitle")}
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { no: 1, name: t("verify.pillar.p1"), icon: "🛡" },
                  { no: 2, name: t("verify.pillar.p2"), icon: "🌐" },
                  { no: 3, name: t("verify.pillar.p3"), icon: "📈" },
                  { no: 4, name: t("verify.pillar.p4"), icon: "🏢" },
                  { no: 5, name: t("verify.pillar.p5"), icon: "💰" },
                  { no: 6, name: t("verify.pillar.p6"), icon: "🏦" },
                  { no: 7, name: t("verify.pillar.p7"), icon: "📜" },
                  { no: 8, name: t("verify.pillar.p8"), icon: "✅" },
                ].map((p) => (
                  <div key={p.no} className="flex items-center gap-2.5 p-3 bg-gray-50 rounded-xl">
                    <span className="text-lg">{p.icon}</span>
                    <div>
                      <p className="text-[10px] text-gray-400 font-mono">P{p.no}</p>
                      <p className="text-xs font-semibold text-gray-700">{p.name}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>
      </div>
    </AuthGuard>
  );
}

export default function VerifyPage() {
  return (
    <Suspense fallback={
      <div className="h-screen flex items-center justify-center bg-[#faf9f6]">
        <div className="w-10 h-10 border-2 border-[#059669]/20 border-t-[#059669] rounded-full animate-spin" />
      </div>
    }>
      <VerifyContent />
    </Suspense>
  );
}

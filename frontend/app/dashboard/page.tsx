"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Search, Plus, Zap, ArrowRight, ChevronRight, ChevronDown, CheckCircle2,
  Clock, Building2, RefreshCw, FileText, BarChart3,
} from "lucide-react";
import { toast } from "sonner";
import { AuthGuard } from "@/components/shared/auth-guard";
import { Sidebar } from "@/components/layout/sidebar";
import { useAuth } from "@/providers/auth-provider";
import { useLanguage } from "@/providers/language-provider";
import { getReports } from "@/services/report.service";
import { getMyQuota } from "@/services/quota.service";
import { QuotaStatus } from "@/types/quota";
import { ReportListItem, isProcessingStatus, isHighRiskLevel } from "@/types/report";

// ── Design tokens (MarketScout dashboard system) ──────────────────────────────
const INK = "#10162b";
const MUTED = "#5b6474";
const FAINT = "#8b93a3";
const ACCENT = "#059669";
const AMBER = "#c98a2c";
const RED = "#c1483d";
const BORDER = "rgba(16,22,43,0.06)";

type RiskTone = { color: string; bg: string; labelKey: string };

/** Map the backend's Vietnamese risk level to a tone (color + tinted pill bg). */
function riskTone(level?: string | null): RiskTone {
  if (level === "Cao" || level === "Nghiêm trọng")
    return { color: RED, bg: "rgba(193,72,61,0.1)", labelKey: "risk.high" };
  if (level === "Trung bình")
    return { color: AMBER, bg: "rgba(201,138,44,0.13)", labelKey: "risk.medium" };
  return { color: ACCENT, bg: "rgba(5,150,105,0.1)", labelKey: "risk.low" };
}

/** Conic-gradient risk donut with the numeric score at its center. */
function RiskGauge({ score, color }: { score: number; color: string }) {
  const pct = Math.max(0, Math.min(100, score));
  return (
    <div
      className="relative w-9 h-9 rounded-full shrink-0"
      style={{ background: `conic-gradient(${color} ${pct}%, rgba(16,22,43,0.08) 0)` }}
    >
      <div className="absolute inset-[4px] rounded-full bg-white flex items-center justify-center text-[11px] font-bold" style={{ color: INK }}>
        {score}
      </div>
    </div>
  );
}

type Filter = "all" | "high" | "medium" | "completed";

export default function DashboardPage() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const router = useRouter();
  const [reports, setReports] = useState<ReportListItem[]>([]);
  const [quota, setQuota] = useState<QuotaStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [quickSearch, setQuickSearch] = useState("");
  const [quickCountry, setQuickCountry] = useState("");
  const [filter, setFilter] = useState<Filter>("all");

  useEffect(() => {
    getReports()
      .catch(() => [] as ReportListItem[])
      .then((r) => { setReports(r); setIsLoading(false); });
    getMyQuota().then(setQuota).catch(() => setQuota(null));
  }, []);

  // Payment success toast after redirect from /checkout.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("plan") === "success") {
      toast.success(t("dash.planActivated"));
      router.replace("/dashboard");
    } else if (params.get("topup") === "success") {
      toast.success(t("checkout.paidToast"));
      router.replace("/dashboard");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleQuickVerify = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickSearch.trim()) { toast.error(t("dash.errEnterName")); return; }
    router.push(`/verify?q=${encodeURIComponent(quickSearch)}&country=${quickCountry}`);
  };

  // ── Derived KPIs ──
  const totalReports = reports.length;
  const processing = reports.filter((r) => isProcessingStatus(r.status)).length;
  const highRisk = reports.filter((r) => isHighRiskLevel(r.riskLevel)).length;
  const countries = new Set(reports.map((r) => r.countryIso2).filter(Boolean)).size;

  // Plan usage — real quota if available, else fall back to all-time report count.
  const used = quota ? quota.quotaUsedThisCycle : totalReports;
  const limit = quota ? quota.monthlyQuota : null;
  const remaining = quota ? quota.quotaRemaining : null;
  const usagePct = limit && limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 0;

  const hour = new Date().getHours();
  const greeting = hour < 12 ? t("dash.greetingMorning") : hour < 18 ? t("dash.greetingAfternoon") : t("dash.greetingEvening");
  const firstName = user?.fullName?.split(" ").slice(-1)[0] || t("chat.you");

  const filtered = reports.filter((r) => {
    if (filter === "high") return isHighRiskLevel(r.riskLevel);
    if (filter === "medium") return r.riskLevel === "Trung bình";
    if (filter === "completed") return r.status === "DONE";
    return true;
  });

  const FILTERS: { id: Filter; labelKey: string }[] = [
    { id: "all", labelKey: "dash.filter.all" },
    { id: "high", labelKey: "dash.filter.high" },
    { id: "medium", labelKey: "dash.filter.medium" },
    { id: "completed", labelKey: "dash.filter.completed" },
  ];

  return (
    <AuthGuard>
      <div className="h-screen flex overflow-hidden" style={{ background: "#faf9f6" }}>
        <Sidebar active="dashboard" />
        <div className="flex-1 overflow-y-auto scrollbar-thin">
          <main className="max-w-[1400px] mx-auto px-6 md:px-12 py-10">

            {/* ── Header ── */}
            <div className="flex flex-wrap items-end justify-between gap-6 mb-7 animate-fade-in-up">
              <div>
                <h1 className="font-display font-extrabold text-3xl tracking-tight" style={{ color: INK }}>
                  {greeting}, {firstName}
                </h1>
                <p className="mt-1.5 text-[15px]" style={{ color: MUTED }}>{t("dash.overviewToday")}</p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => router.push("/chat")}
                  className="flex items-center gap-2 h-11 px-5 rounded-2xl text-sm font-semibold transition-colors"
                  style={{ color: INK, background: "rgba(16,22,43,0.02)", border: `1px solid ${BORDER}` }}
                >
                  <Zap className="w-4 h-4" style={{ color: ACCENT }} />
                  {t("dash.askAi")}
                </button>
                <button
                  onClick={() => router.push("/verify")}
                  className="flex items-center gap-2 h-11 px-5 rounded-2xl text-sm font-bold text-white transition-colors hover:brightness-95"
                  style={{ background: ACCENT }}
                >
                  <Plus className="w-4 h-4" />
                  {t("nav.newVerify")}
                </button>
              </div>
            </div>

            {/* ── Quick Verify hero ── */}
            <div
              className="relative overflow-hidden rounded-[32px] p-8 md:p-11 mb-6 animate-fade-in-up"
              style={{
                background: "linear-gradient(160deg, #ffffff 0%, #f1f7f4 100%)",
                border: `1px solid ${BORDER}`,
                boxShadow: "0 20px 44px -28px rgba(16,22,43,0.14)",
              }}
            >
              <div
                className="pointer-events-none absolute rounded-full"
                style={{ top: -160, right: -120, width: 420, height: 420, background: "radial-gradient(circle, rgba(5,150,105,0.14) 0%, rgba(5,150,105,0) 70%)" }}
              />
              <div className="relative z-10 max-w-2xl mb-7">
                <div className="inline-flex items-center gap-2.5 mb-3.5">
                  <span className="inline-block w-5 h-0.5 rounded" style={{ background: ACCENT }} />
                  <span className="text-[12.5px] font-bold uppercase tracking-[0.14em]" style={{ color: ACCENT }}>
                    {t("dash.quickVerify")}
                  </span>
                </div>
                <h2 className="font-display font-extrabold text-[28px] leading-tight tracking-tight" style={{ color: INK }}>
                  {t("dash.quickVerifyTitle")}
                </h2>
                <p className="mt-2.5 text-[15.5px] leading-relaxed" style={{ color: MUTED }}>
                  {t("dash.quickVerifyDesc")}
                </p>
              </div>

              <form onSubmit={handleQuickVerify} className="relative z-10 flex flex-wrap gap-3">
                <div
                  className="flex-1 min-w-[280px] flex items-center gap-3 h-[60px] px-5 rounded-2xl bg-white"
                  style={{ border: `1px solid rgba(16,22,43,0.08)` }}
                >
                  <Search className="w-[18px] h-[18px] shrink-0" style={{ color: MUTED }} />
                  <input
                    value={quickSearch}
                    onChange={(e) => setQuickSearch(e.target.value)}
                    placeholder={t("dash.quickPlaceholder")}
                    className="flex-1 bg-transparent outline-none text-[15px]"
                    style={{ color: INK }}
                  />
                </div>
                <div className="relative w-[180px] h-[60px]">
                  <select
                    value={quickCountry}
                    onChange={(e) => setQuickCountry(e.target.value)}
                    className="w-full h-full appearance-none rounded-2xl bg-white pl-[18px] pr-10 text-[15px] font-semibold outline-none"
                    style={{ border: `1px solid rgba(16,22,43,0.08)`, color: INK }}
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
                  <ChevronDown className="w-4 h-4 absolute right-[18px] top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: MUTED }} />
                </div>
                <button
                  type="submit"
                  className="flex items-center justify-center gap-2.5 h-[60px] px-8 rounded-2xl text-[15.5px] font-bold text-white whitespace-nowrap transition-transform hover:-translate-y-px hover:brightness-105"
                  style={{ background: ACCENT }}
                >
                  {t("dash.startVerify").replace(" →", "")}
                  <ArrowRight className="w-[18px] h-[18px]" />
                </button>
              </form>
            </div>

            {/* ── KPI strip ── */}
            <div
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 rounded-[28px] overflow-hidden mb-6 bg-white animate-fade-in-up"
              style={{ border: `1px solid ${BORDER}`, boxShadow: "0 2px 20px rgba(16,22,43,0.03)" }}
            >
              {/* 1 — Plan usage */}
              <div className="p-7 flex flex-col">
                <div className="text-[13px] font-bold uppercase tracking-wide mb-5" style={{ color: FAINT }}>{t("dash.stat.totalReports")}</div>
                <div className="flex items-baseline gap-1.5 mb-4">
                  <span className="font-display font-bold text-[46px] leading-none tracking-tight" style={{ color: INK }}>{used}</span>
                  {limit !== null && <span className="text-[15px] font-semibold" style={{ color: FAINT }}>/ {limit}</span>}
                </div>
                {limit !== null ? (
                  <>
                    <div className="h-1.5 rounded mb-2.5 overflow-hidden" style={{ background: "rgba(16,22,43,0.07)" }}>
                      <div className="h-full rounded transition-all duration-700" style={{ width: `${usagePct}%`, background: ACCENT }} />
                    </div>
                    <div className="text-[13px]" style={{ color: FAINT }}>{t("dash.stat.leftThisMonth", { n: remaining ?? 0 })}</div>
                  </>
                ) : (
                  <div className="text-[13px]" style={{ color: FAINT }}>{t("dash.stat.completedSuffix", { n: reports.filter((r) => r.status === "DONE").length })}</div>
                )}
              </div>

              {/* 2 — Processing */}
              <div className="p-7 flex flex-col" style={{ borderLeft: `1px solid ${BORDER}` }}>
                <div className="text-[13px] font-bold uppercase tracking-wide mb-5" style={{ color: FAINT }}>{t("dash.stat.processing")}</div>
                <div className="flex items-baseline gap-1.5 mb-4">
                  <span className="font-display font-bold text-[46px] leading-none tracking-tight" style={{ color: INK }}>{processing}</span>
                  <span className="text-[15px] font-semibold" style={{ color: FAINT }}>{t("dash.stat.active")}</span>
                </div>
                {processing > 0 ? (
                  <>
                    <div className="flex items-center gap-2 mb-2.5">
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ background: ACCENT, animation: "pulseDot 1.6s ease-in-out infinite" }} />
                      <span className="text-[13px]" style={{ color: MUTED }}>{t("dash.stat.scanningNow")}</span>
                    </div>
                    <div className="relative h-[5px] rounded overflow-hidden" style={{ background: "rgba(16,22,43,0.07)" }}>
                      <div className="absolute inset-y-0 w-[36%] rounded" style={{ background: ACCENT, animation: "indet 1.6s ease-in-out infinite" }} />
                    </div>
                  </>
                ) : (
                  <div className="text-[13px]" style={{ color: FAINT }}>{t("dash.stat.noActiveScans")}</div>
                )}
              </div>

              {/* 3 — High-risk alerts */}
              <div className="p-7 flex flex-col" style={{ borderLeft: `1px solid ${BORDER}`, background: highRisk > 0 ? "rgba(193,72,61,0.05)" : "transparent" }}>
                <div className="text-[13px] font-bold uppercase tracking-wide mb-5" style={{ color: highRisk > 0 ? RED : FAINT }}>{t("dash.stat.highRisk")}</div>
                <div className="flex items-baseline gap-1.5 mb-4">
                  <span className="font-display font-bold text-[46px] leading-none tracking-tight" style={{ color: highRisk > 0 ? RED : INK }}>{highRisk}</span>
                  <span className="text-[15px] font-semibold" style={{ color: FAINT }}>{t("dash.stat.flagged")}</span>
                </div>
                {highRisk > 0 ? (
                  <>
                    <div className="flex items-center gap-1 flex-wrap mb-3.5">
                      {Array.from({ length: Math.min(highRisk, 10) }).map((_, i) => (
                        <span key={i} className="w-1.5 h-1.5 rounded-full" style={{ background: RED }} />
                      ))}
                    </div>
                    <Link href="/reports" className="inline-flex items-center gap-1.5 text-[13.5px] font-bold hover:gap-2 transition-all" style={{ color: RED }}>
                      {t("dash.stat.reviewNow")} <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </>
                ) : (
                  <div className="text-[13px]" style={{ color: FAINT }}>{t("dash.stat.highRiskSub")}</div>
                )}
              </div>

              {/* 4 — Countries scanned */}
              <div className="p-7 flex flex-col justify-center" style={{ borderLeft: `1px solid ${BORDER}` }}>
                <div className="text-[13px] font-bold uppercase tracking-wide mb-5" style={{ color: FAINT }}>{t("dash.stat.countries")}</div>
                <div className="flex items-baseline gap-1.5 mb-4">
                  <span className="font-display font-bold text-[46px] leading-none tracking-tight" style={{ color: INK }}>{countries}</span>
                </div>
                <div className="flex items-center gap-1.5 flex-wrap mb-3">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <span key={i} className="w-[7px] h-[7px] rounded-full" style={{ background: i < Math.min(countries, 8) ? ACCENT : "rgba(16,22,43,0.1)" }} />
                  ))}
                </div>
                <div className="text-[13px]" style={{ color: FAINT }}>{t("dash.stat.activeMarkets")}</div>
              </div>
            </div>

            {/* ── Two-column content ── */}
            <div className="grid grid-cols-1 lg:grid-cols-[1.7fr_1fr] gap-6 items-start animate-fade-in-up">

              {/* Left — Recent reports */}
              <div className="bg-white rounded-3xl overflow-hidden" style={{ border: `1px solid ${BORDER}`, boxShadow: "0 2px 20px rgba(16,22,43,0.03)" }}>
                <div className="flex items-center justify-between px-7 py-5" style={{ borderBottom: `1px solid ${BORDER}` }}>
                  <div className="flex items-center gap-2.5">
                    <BarChart3 className="w-[17px] h-[17px]" style={{ color: INK }} />
                    <span className="font-display font-bold text-[16.5px]" style={{ color: INK }}>{t("dash.recentReports")}</span>
                  </div>
                  <Link href="/reports" className="flex items-center gap-1 text-[13.5px] font-bold" style={{ color: ACCENT }}>
                    {t("dash.viewAll")} <ChevronRight className="w-3.5 h-3.5" />
                  </Link>
                </div>

                {/* Filter tabs */}
                <div className="flex items-center gap-2 px-7 pt-4 pb-1 flex-wrap">
                  {FILTERS.map((f) => {
                    const active = filter === f.id;
                    return (
                      <button
                        key={f.id}
                        onClick={() => setFilter(f.id)}
                        className="text-[13px] font-semibold px-3.5 py-1.5 rounded-lg transition-colors"
                        style={active ? { background: "rgba(5,150,105,0.1)", color: ACCENT } : { color: MUTED }}
                      >
                        {t(f.labelKey)}
                      </button>
                    );
                  })}
                </div>

                {isLoading ? (
                  <div className="p-7 space-y-3">
                    {[...Array(4)].map((_, i) => <div key={i} className="h-12 shimmer rounded-xl" />)}
                  </div>
                ) : filtered.length === 0 ? (
                  <div className="p-12 text-center">
                    <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: "rgba(16,22,43,0.04)" }}>
                      <FileText className="w-8 h-8" style={{ color: "rgba(16,22,43,0.2)" }} />
                    </div>
                    <p className="text-sm font-semibold mb-1" style={{ color: MUTED }}>{t("dash.noReports")}</p>
                    <p className="text-xs mb-4" style={{ color: FAINT }}>{t("dash.noReportsSub")}</p>
                    <Link href="/verify" className="inline-flex items-center gap-2 h-10 px-4 rounded-xl text-white text-sm font-semibold" style={{ background: ACCENT }}>
                      <Plus className="w-4 h-4" /> {t("dash.createFirst")}
                    </Link>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    {/* Table header */}
                    <div className="grid items-center gap-4 px-7 py-3 min-w-[720px]" style={{ gridTemplateColumns: "1.6fr 0.7fr 1fr 0.9fr 1fr 1fr 20px", background: "rgba(16,22,43,0.015)" }}>
                      {["dash.col.company", "dash.col.country", "dash.col.riskScore", "dash.col.riskLevel", "dash.col.status", "dash.col.date"].map((k) => (
                        <span key={k} className="text-[11.5px] font-bold uppercase tracking-wide" style={{ color: FAINT }}>{t(k)}</span>
                      ))}
                      <span />
                    </div>
                    {/* Rows */}
                    {filtered.slice(0, 6).map((r) => {
                      const tone = riskTone(r.riskLevel);
                      const done = r.status === "DONE";
                      const proc = isProcessingStatus(r.status);
                      return (
                        <Link
                          key={r.id}
                          href={`/reports/${r.id}`}
                          className="group relative grid items-center gap-4 px-7 py-4 min-w-[720px] transition-all hover:translate-x-0.5"
                          style={{ gridTemplateColumns: "1.6fr 0.7fr 1fr 0.9fr 1fr 1fr 20px", borderTop: `1px solid rgba(16,22,43,0.05)` }}
                        >
                          <span className="absolute left-0 top-3.5 bottom-3.5 w-[3px] rounded-r" style={{ background: tone.color }} />
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-9 h-9 rounded-[10px] flex items-center justify-center shrink-0" style={{ background: "rgba(16,22,43,0.04)" }}>
                              <Building2 className="w-4 h-4" style={{ color: MUTED }} />
                            </div>
                            <span className="text-[14.5px] font-semibold truncate" style={{ color: INK }}>{r.entityName}</span>
                          </div>
                          <span className="text-[13.5px] font-semibold" style={{ color: MUTED }}>{r.countryIso2 || "—"}</span>
                          <div className="flex items-center gap-2.5">
                            <RiskGauge score={r.overallScore} color={tone.color} />
                          </div>
                          <span className="inline-flex justify-center text-[12.5px] font-bold px-3 py-1.5 rounded-lg w-fit" style={{ background: tone.bg, color: tone.color }}>
                            {t(tone.labelKey)}
                          </span>
                          <span className="flex items-center gap-1.5 text-[13.5px] font-semibold" style={{ color: done ? ACCENT : proc ? "#0EA5E9" : r.status === "FAILED" ? RED : FAINT }}>
                            {done && <CheckCircle2 className="w-3.5 h-3.5" />}
                            {proc && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                            {done ? t("status.completed") : proc ? t("status.processing") : r.status === "FAILED" ? t("status.failed") : r.status}
                          </span>
                          <span className="text-[13.5px]" style={{ color: FAINT }}>
                            {r.createdAt ? new Date(r.createdAt).toLocaleDateString("vi-VN") : "—"}
                          </span>
                          <ChevronRight className="w-3.5 h-3.5 opacity-30" style={{ color: INK }} />
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Right rail */}
              <div className="flex flex-col gap-6">
                {/* Recent activity */}
                <div className="bg-white rounded-3xl overflow-hidden" style={{ border: `1px solid ${BORDER}`, boxShadow: "0 2px 20px rgba(16,22,43,0.03)" }}>
                  <div className="flex items-center gap-2.5 px-6 py-5" style={{ borderBottom: `1px solid ${BORDER}` }}>
                    <Clock className="w-4 h-4" style={{ color: INK }} />
                    <span className="font-display font-bold text-[15.5px]" style={{ color: INK }}>{t("dash.recentActivity")}</span>
                  </div>
                  {reports.length === 0 ? (
                    <p className="text-sm text-center py-8" style={{ color: FAINT }}>{t("dash.noActivity")}</p>
                  ) : (
                    <div>
                      {reports.slice(0, 5).map((r) => (
                        <Link
                          key={r.id}
                          href={`/reports/${r.id}`}
                          className="flex items-center gap-3 px-6 py-3.5 transition-colors hover:bg-[rgba(16,22,43,0.02)]"
                          style={{ borderTop: `1px solid rgba(16,22,43,0.05)` }}
                        >
                          <div className="w-[30px] h-[30px] rounded-full flex items-center justify-center shrink-0" style={{ background: "rgba(5,150,105,0.1)" }}>
                            <CheckCircle2 className="w-3.5 h-3.5" style={{ color: ACCENT }} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-[13.5px] font-semibold truncate" style={{ color: INK }}>{r.entityName}</div>
                            <div className="text-[12px]" style={{ color: FAINT }}>{r.countryIso2 || "—"} · {r.createdAt ? new Date(r.createdAt).toLocaleDateString("vi-VN") : "—"}</div>
                          </div>
                          <ChevronRight className="w-3 h-3 opacity-30 shrink-0" style={{ color: INK }} />
                        </Link>
                      ))}
                    </div>
                  )}
                </div>

                {/* Upgrade card */}
                <div className="relative overflow-hidden rounded-3xl p-8" style={{ background: INK, boxShadow: "0 20px 40px -20px rgba(16,22,43,0.4)" }}>
                  <div className="pointer-events-none absolute rounded-full" style={{ top: -90, right: -70, width: 220, height: 220, background: "radial-gradient(circle, rgba(5,150,105,0.4) 0%, rgba(5,150,105,0) 70%)" }} />
                  <div className="relative z-10">
                    <span className="text-[11.5px] font-bold uppercase tracking-[0.12em]" style={{ color: "#6ee7b7" }}>{t("dash.upgrade")}</span>
                    <h3 className="font-display font-extrabold text-[21px] text-white mt-2.5 mb-2">{t("dash.unlockAll")}</h3>
                    <p className="text-sm leading-relaxed mb-5" style={{ color: "rgba(255,255,255,0.6)" }}>{t("dash.unlockDesc")}</p>
                    <Link href="/pricing" className="flex items-center justify-center gap-2 h-11 rounded-xl text-white text-sm font-bold transition-transform hover:-translate-y-px" style={{ background: ACCENT }}>
                      {t("dash.viewPlans")} <ArrowRight className="w-[15px] h-[15px]" />
                    </Link>
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

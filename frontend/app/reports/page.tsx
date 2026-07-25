"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  FileText, Search, Download, Clock, CheckCircle2, AlertTriangle,
  Globe, Calendar, ChevronRight, RefreshCw, Zap, Building2,
} from "lucide-react";
import { toast } from "sonner";
import { AuthGuard } from "@/components/shared/auth-guard";
import { Sidebar } from "@/components/layout/sidebar";
import { useLanguage } from "@/providers/language-provider";
import { getReports } from "@/services/report.service";
import { ReportListItem, isProcessingStatus, isHighRiskLevel } from "@/types/report";
import { INK, MUTED, FAINT, ACCENT, RED, BORDER, PAGE_BG, cardStyle, riskTone, RiskGauge } from "@/components/shared/ms-ui";

type StatusFilter = "all" | "DONE" | "PROCESSING" | "FAILED";

export default function ReportsPage() {
  const { t } = useLanguage();
  const [reports, setReports] = useState<ReportListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchReports = async () => {
    try {
      setReports(await getReports());
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

  const STAT_CARDS = [
    { label: t("dash.stat.totalReports"), value: stats.total, color: INK },
    { label: t("status.completed"), value: stats.completed, color: ACCENT },
    { label: t("status.processing"), value: stats.processing, color: "#0EA5E9" },
    { label: t("reports.stat.highRisk"), value: stats.highRisk, color: RED },
  ];

  return (
    <AuthGuard>
      <div className="flex h-screen overflow-hidden" style={{ background: PAGE_BG }}>
        <Sidebar active="reports" />
        <div className="flex-1 overflow-y-auto scrollbar-thin">
          <div className="max-w-[1200px] mx-auto px-6 md:px-10 py-10">

            {/* ── Header ── */}
            <div className="flex flex-wrap items-end justify-between gap-4 mb-7 animate-fade-in-up">
              <div>
                <h1 className="font-display font-extrabold text-3xl tracking-tight" style={{ color: INK }}>{t("reports.title")}</h1>
                <p className="mt-1.5 text-[15px]" style={{ color: MUTED }}>{t("reports.subtitle")}</p>
              </div>
              <div className="flex items-center gap-2.5">
                <button onClick={handleRefresh} disabled={isRefreshing}
                  className="flex items-center gap-2 h-11 px-4 rounded-2xl bg-white text-sm font-semibold transition-colors hover:brightness-95"
                  style={{ color: INK, ...cardStyle }}>
                  <RefreshCw className={`w-4 h-4 ${isRefreshing ? "animate-spin" : ""}`} style={{ color: ACCENT }} />
                  {t("reports.refresh")}
                </button>
                <button onClick={() => toast.info(t("profile.soon"))}
                  className="flex items-center gap-2 h-11 px-4 rounded-2xl bg-white text-sm font-semibold transition-colors hover:brightness-95"
                  style={{ color: INK, ...cardStyle }}>
                  <Download className="w-4 h-4" /> {t("reports.exportBtn")}
                </button>
                <Link href="/verify"
                  className="flex items-center gap-2 h-11 px-5 rounded-2xl text-white text-sm font-bold transition-colors hover:brightness-95" style={{ background: ACCENT }}>
                  <Zap className="w-4 h-4" /> {t("nav.newVerify")}
                </Link>
              </div>
            </div>

            {/* ── KPI strip ── */}
            <div className="grid grid-cols-2 lg:grid-cols-4 rounded-[28px] overflow-hidden mb-6 bg-white animate-fade-in-up" style={cardStyle}>
              {STAT_CARDS.map((s, i) => (
                <div key={s.label} className="p-7 flex flex-col" style={i > 0 ? { borderLeft: `1px solid ${BORDER}` } : undefined}>
                  <div className="text-[13px] font-bold uppercase tracking-wide mb-4" style={{ color: FAINT }}>{s.label}</div>
                  <span className="font-display font-bold text-[42px] leading-none tracking-tight" style={{ color: s.color }}>{s.value}</span>
                </div>
              ))}
            </div>

            {/* ── Filters ── */}
            <div className="bg-white rounded-3xl p-4 mb-5 flex flex-wrap items-center gap-3" style={cardStyle}>
              <div className="relative flex-1 min-w-[220px]">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: FAINT }} />
                <input value={search} onChange={(e) => setSearch(e.target.value)}
                  placeholder={t("reports.searchPlaceholder")}
                  className="w-full h-11 pl-11 pr-4 rounded-2xl text-sm outline-none"
                  style={{ border: `1px solid rgba(16,22,43,0.08)`, color: INK }} />
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {(["all", "DONE", "PROCESSING", "FAILED"] as StatusFilter[]).map((s) => {
                  const active = statusFilter === s;
                  return (
                    <button key={s} onClick={() => setStatusFilter(s)}
                      className="px-3.5 py-2 rounded-xl text-[13px] font-semibold transition-colors"
                      style={active ? { background: ACCENT, color: "#fff" } : { background: "rgba(16,22,43,0.03)", color: MUTED }}>
                      {s === "all" ? t("reports.filter.all") : s === "DONE" ? t("status.completed") : s === "PROCESSING" ? t("status.processing") : t("status.failed")}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* ── Table ── */}
            <div className="bg-white rounded-3xl overflow-hidden" style={cardStyle}>
              {isLoading ? (
                <div className="flex flex-col items-center py-20">
                  <div className="w-10 h-10 border-2 rounded-full animate-spin mb-3" style={{ borderColor: "rgba(5,150,105,0.2)", borderTopColor: ACCENT }} />
                  <p className="text-sm" style={{ color: FAINT }}>{t("reports.loading")}</p>
                </div>
              ) : filtered.length === 0 ? (
                <div className="flex flex-col items-center py-20 text-center px-6">
                  <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4" style={{ background: "rgba(16,22,43,0.04)" }}>
                    <FileText className="w-8 h-8" style={{ color: "rgba(16,22,43,0.2)" }} />
                  </div>
                  <p className="font-semibold mb-1" style={{ color: MUTED }}>
                    {reports.length === 0 ? t("dash.noReports") : t("reports.noResults")}
                  </p>
                  <p className="text-sm mb-4" style={{ color: FAINT }}>
                    {reports.length === 0 ? t("dash.noReportsSub") : t("reports.tryDifferentFilter")}
                  </p>
                  {reports.length === 0 && (
                    <Link href="/verify" className="flex items-center gap-2 h-10 px-5 rounded-xl text-white font-semibold text-sm" style={{ background: ACCENT }}>
                      <Zap className="w-4 h-4" /> {t("reports.verifyNow")}
                    </Link>
                  )}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  {/* Header */}
                  <div className="grid items-center gap-4 px-7 py-3 min-w-[760px]" style={{ gridTemplateColumns: "2fr 1fr 0.9fr 1.1fr 1fr 24px", background: "rgba(16,22,43,0.015)" }}>
                    {["dash.col.company", "dash.col.riskScore", "dash.col.riskLevel", "dash.col.status", "dash.col.date"].map((k) => (
                      <span key={k} className="text-[11.5px] font-bold uppercase tracking-wide" style={{ color: FAINT }}>{t(k)}</span>
                    ))}
                    <span />
                  </div>
                  {filtered.map((report) => {
                    const tone = riskTone(report.riskLevel);
                    const done = report.status === "DONE";
                    const proc = isProcessingStatus(report.status);
                    const failed = report.status === "FAILED" || report.status === "HARD_STOP";
                    return (
                      <Link key={report.id} href={`/reports/${report.id}`}
                        className="group relative grid items-center gap-4 px-7 py-4 min-w-[760px] transition-all hover:translate-x-0.5"
                        style={{ gridTemplateColumns: "2fr 1fr 0.9fr 1.1fr 1fr 24px", borderTop: `1px solid rgba(16,22,43,0.05)` }}>
                        <span className="absolute left-0 top-3.5 bottom-3.5 w-[3px] rounded-r" style={{ background: tone.color }} />
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-9 h-9 rounded-[10px] flex items-center justify-center shrink-0" style={{ background: "rgba(16,22,43,0.04)" }}>
                            <Building2 className="w-4 h-4" style={{ color: MUTED }} />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="text-[14.5px] font-semibold truncate" style={{ color: INK }}>{report.entityName}</p>
                              {report.hardStop && (
                                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ color: RED, background: "rgba(193,72,61,0.1)" }}>
                                  {t("reports.badge.hardStop")}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 text-xs mt-0.5" style={{ color: FAINT }}>
                              {report.countryIso2 && <span className="flex items-center gap-1"><Globe className="w-3 h-3" /> {report.countryIso2}</span>}
                              <span className="text-[10px] font-mono opacity-70">{report.id?.slice(0, 8).toUpperCase()}</span>
                            </div>
                          </div>
                        </div>
                        <RiskGauge score={report.overallScore} color={tone.color} />
                        <span className="inline-flex justify-center text-[12.5px] font-bold px-3 py-1.5 rounded-lg w-fit" style={{ background: tone.bg, color: tone.color }}>
                          {t(tone.labelKey)}
                        </span>
                        <span className="flex items-center gap-1.5 text-[13.5px] font-semibold" style={{ color: done ? ACCENT : proc ? "#0EA5E9" : failed ? RED : FAINT }}>
                          {done && <CheckCircle2 className="w-3.5 h-3.5" />}
                          {proc && <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />}
                          {failed && <AlertTriangle className="w-3.5 h-3.5" />}
                          {done ? t("status.completed") : proc ? t("status.processing") : report.status === "HARD_STOP" ? t("reports.status.hardStop") : report.status === "FAILED" ? t("status.failed") : report.status}
                        </span>
                        <span className="flex items-center gap-1.5 text-[13px]" style={{ color: FAINT }}>
                          <Calendar className="w-3 h-3" />
                          {report.createdAt ? new Date(report.createdAt as string).toLocaleDateString("vi-VN") : "—"}
                        </span>
                        <ChevronRight className="w-3.5 h-3.5 opacity-30" style={{ color: INK }} />
                      </Link>
                    );
                  })}
                  <div className="px-7 py-4 flex items-center justify-between" style={{ borderTop: `1px solid ${BORDER}`, background: "rgba(16,22,43,0.01)" }}>
                    <p className="text-xs" style={{ color: FAINT }}>
                      {t("reports.showingPrefix")} <span className="font-semibold" style={{ color: MUTED }}>{filtered.length}</span> / {reports.length} {t("reports.showingSuffix")}
                    </p>
                    {filtered.length !== reports.length && (
                      <button onClick={() => { setSearch(""); setStatusFilter("all"); }}
                        className="text-xs font-semibold hover:underline" style={{ color: ACCENT }}>
                        {t("reports.clearFilters")}
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>

          </div>
        </div>
      </div>
    </AuthGuard>
  );
}

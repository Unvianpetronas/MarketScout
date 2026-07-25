"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import {
  Search, Globe, Building2, LayoutGrid, List, Zap,
  CheckCircle2, AlertTriangle, MessageSquare, ArrowUpRight,
  ExternalLink, Loader2, ShieldAlert
} from "lucide-react";
import { Sidebar } from "@/components/layout/sidebar";
import { AuthGuard } from "@/components/shared/auth-guard";
import { searchPartners } from "@/services/partners.service";
import { LeadResult, PartnerRole } from "@/types/partner";
import { useLanguage } from "@/providers/language-provider";

const COUNTRY_OPTIONS = [
  { value: "", labelKey: "partners.allCountries", flag: "🌍" },
  { value: "US", labelKey: "partners.country.us", flag: "🇺🇸" },
  { value: "DE", labelKey: "partners.country.de", flag: "🇩🇪" },
  { value: "JP", labelKey: "partners.country.jp", flag: "🇯🇵" },
  { value: "CN", labelKey: "partners.country.cn", flag: "🇨🇳" },
];

function PartnerCard({ lead, country }: { lead: LeadResult; country: string }) {
  const { t } = useLanguage();
  return (
    <div className="bg-white rounded-2xl border border-[rgba(16,22,43,0.06)] p-5 shadow-[0_2px_20px_rgba(16,22,43,0.03)] card-hover group">
      <div className="flex items-start gap-4">
        <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 ${
          lead.sanctionHit ? "bg-red-50 text-red-500" : "bg-[#E7F6EF] text-[#059669]"
        }`}>
          {lead.sanctionHit ? <ShieldAlert className="w-5 h-5" /> : <Building2 className="w-5 h-5" />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            <h3 className="font-bold text-gray-900 text-base">{lead.companyName}</h3>
            {lead.sanctionHit ? (
              <span className="flex items-center gap-1 risk-high text-xs font-semibold px-2.5 py-0.5 rounded-full">
                <AlertTriangle className="w-3 h-3" /> {t("partners.sanctioned")}
              </span>
            ) : (
              <span className="flex items-center gap-1 text-[10px] font-bold text-gray-500 bg-gray-50 px-2 py-0.5 rounded-full border border-gray-200">
                {t("partners.notVerified")}
              </span>
            )}
            {lead.source && (
              <span className="text-[10px] font-semibold text-gray-400 bg-gray-50 px-2 py-0.5 rounded-full border border-gray-200">
                {lead.source}
              </span>
            )}
            {lead.country && (
              <span className="text-[10px] font-semibold text-gray-500 bg-gray-50 px-2 py-0.5 rounded-full border border-gray-200">
                {lead.country}
              </span>
            )}
            {lead.taxId && (
              <span className="text-[10px] font-bold text-[#047857] bg-[#E7F6EF] px-2 py-0.5 rounded-full border border-[#059669]/30">
                {t("partners.taxId")}: {lead.taxId}
              </span>
            )}
          </div>
          {lead.description && (
            <p className="text-sm text-gray-500 mb-2 leading-relaxed">{lead.description}</p>
          )}
          {lead.sanctionNote && (
            <p className="text-xs text-red-500 mb-2">{lead.sanctionNote}</p>
          )}
          {lead.website && (
            <a href={lead.website} target="_blank" rel="noopener noreferrer"
               className="inline-flex items-center gap-1 text-xs text-[#059669] hover:underline truncate max-w-full">
              <ExternalLink className="w-3 h-3 shrink-0" /> {lead.website}
            </a>
          )}
        </div>
        <div className="flex flex-col gap-2 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
          <Link
            href={`/verify?q=${encodeURIComponent(lead.companyName)}${country ? `&country=${country}` : ""}`}
            className="flex items-center gap-1.5 px-3 py-2 gradient-brand text-white text-xs font-bold rounded-xl hover:opacity-90"
          >
            <Zap className="w-3 h-3" /> {t("partners.verifyBtn")}
          </Link>
          <Link
            href={`/chat?preMessage=${encodeURIComponent(`${t("partners.askAboutPrefix")} ${lead.companyName}`)}`}
            className="flex items-center gap-1.5 px-3 py-2 bg-gray-50 border border-gray-200 text-gray-600 text-xs font-semibold rounded-xl hover:bg-gray-100"
          >
            <MessageSquare className="w-3 h-3" /> {t("partners.askAi")}
          </Link>
        </div>
      </div>
    </div>
  );
}

function PartnerCardGrid({ lead, country }: { lead: LeadResult; country: string }) {
  const { t } = useLanguage();
  return (
    <div className="bg-white rounded-2xl border border-[rgba(16,22,43,0.06)] p-5 shadow-[0_2px_20px_rgba(16,22,43,0.03)] card-hover">
      <div className="flex items-start justify-between mb-3">
        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
          lead.sanctionHit ? "bg-red-50 text-red-500" : "bg-[#E7F6EF] text-[#059669]"
        }`}>
          {lead.sanctionHit ? <ShieldAlert className="w-4 h-4" /> : <Building2 className="w-4 h-4" />}
        </div>
        {lead.sanctionHit ? (
          <span className="flex items-center gap-1 risk-high text-xs font-semibold px-2.5 py-0.5 rounded-full">
            <AlertTriangle className="w-3 h-3" /> {t("partners.sanctionedShort")}
          </span>
        ) : (
          <span className="flex items-center gap-1 text-emerald-700 bg-emerald-50 border border-emerald-200 text-xs font-semibold px-2.5 py-0.5 rounded-full">
            <CheckCircle2 className="w-3 h-3" /> {t("partners.safe")}
          </span>
        )}
      </div>
      <h3 className="font-bold text-gray-900 mb-1 text-sm">{lead.companyName}</h3>
      <div className="flex items-center gap-1.5 flex-wrap mb-2">
        {lead.country && (
          <span className="text-[10px] font-semibold text-gray-500 bg-gray-50 px-2 py-0.5 rounded-full border border-gray-200">
            {lead.country}
          </span>
        )}
        {lead.taxId && (
          <span className="text-[10px] font-bold text-[#047857] bg-[#E7F6EF] px-2 py-0.5 rounded-full border border-[#059669]/30">
            {t("partners.taxId")}: {lead.taxId}
          </span>
        )}
      </div>
      {lead.description && <p className="text-xs text-gray-400 mb-3 line-clamp-2">{lead.description}</p>}
      <div className="flex gap-2">
        <Link
          href={`/verify?q=${encodeURIComponent(lead.companyName)}${country ? `&country=${country}` : ""}`}
          className="flex-1 text-center text-xs py-1.5 gradient-brand text-white font-semibold rounded-lg"
        >
          {t("partners.verifyBtn")}
        </Link>
        {lead.website ? (
          <a href={lead.website} target="_blank" rel="noopener noreferrer"
             className="flex-1 text-center text-xs py-1.5 border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50">
            {t("partners.website")}
          </a>
        ) : (
          <Link
            href={`/chat?preMessage=${encodeURIComponent(`${t("partners.askAboutPrefix")} ${lead.companyName}`)}`}
            className="flex-1 text-center text-xs py-1.5 border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50">
            {t("partners.askAi")}
          </Link>
        )}
      </div>
    </div>
  );
}

export default function FindPartnersPage() {
  const { t } = useLanguage();
  const [query, setQuery] = useState("");
  const [country, setCountry] = useState("");
  const [role, setRole] = useState<PartnerRole>("buyer");
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");
  const [sortAlpha, setSortAlpha] = useState(false);
  const [groupByMarket, setGroupByMarket] = useState(false);

  const [leads, setLeads] = useState<LeadResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  const handleSearch = useCallback(async () => {
    // Search runs only on explicit user action — never auto-fired on mount — so we
    // don't burn Tavily / OpenSanctions tokens on a default query nobody asked for.
    if (!query.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const results = await searchPartners({ q: query, country: country || undefined, role });
      setLeads(results);
    } catch {
      setError(t("partners.errLoad"));
    } finally {
      setLoading(false);
      setHasSearched(true);
    }
  }, [query, country, role, t]);

  const sanctionedCount = leads.filter((l) => l.sanctionHit).length;
  const sorted = sortAlpha
    ? [...leads].sort((a, b) => a.companyName.localeCompare(b.companyName))
    : leads;
  const countryMeta = COUNTRY_OPTIONS.find((c) => c.value === country) ?? COUNTRY_OPTIONS[0];

  // Group by market (lead.country) — only meaningful once a search actually spans
  // more than one market; falls back to a single "Tất cả" group otherwise.
  const groupedByMarket: Array<[string, LeadResult[]]> = groupByMarket
    ? Array.from(
        sorted.reduce((map, lead) => {
          const marketKey = lead.country || t("partners.unknownMarket");
          if (!map.has(marketKey)) map.set(marketKey, []);
          map.get(marketKey)!.push(lead);
          return map;
        }, new Map<string, LeadResult[]>())
      )
    : [["", sorted]];

  return (
    <AuthGuard>
      <div className="flex h-screen bg-[#faf9f6] overflow-hidden">
        <Sidebar active="find-partners" />

        <div className="flex-1 overflow-y-auto scrollbar-thin">
          <div className="max-w-7xl mx-auto px-6 py-8">

            {/* Header */}
            <div className="mb-6 animate-fade-in-up">
              <h1 className="text-2xl font-extrabold text-gray-900 mb-1">{t("partners.title")}</h1>
              <p className="text-sm text-gray-400">{t("partners.subtitle")}</p>
            </div>

            {/* Search */}
            <div className="bg-white rounded-2xl border border-[rgba(16,22,43,0.06)] shadow-[0_2px_20px_rgba(16,22,43,0.03)] mb-5 p-4">
              <div className="flex flex-wrap gap-3">
                <div className="flex-1 min-w-[240px] relative">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                    placeholder={t("partners.searchPlaceholder")}
                    className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#059669] focus:bg-white transition-all"
                  />
                </div>
                <select
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm bg-white text-gray-700 focus:outline-none focus:border-[#059669]"
                >
                  {COUNTRY_OPTIONS.map((c) => (
                    <option key={c.value} value={c.value}>{c.flag} {t(c.labelKey)}</option>
                  ))}
                </select>
                <div className="flex bg-gray-50 border border-gray-200 rounded-xl overflow-hidden text-sm font-medium">
                  <button
                    onClick={() => setRole("buyer")}
                    className={`px-4 py-2.5 transition-colors ${role === "buyer" ? "bg-[#E7F6EF] text-[#047857]" : "text-gray-500 hover:text-gray-700"}`}
                  >
                    {t("partners.findBuyer")}
                  </button>
                  <button
                    onClick={() => setRole("seller")}
                    className={`px-4 py-2.5 transition-colors ${role === "seller" ? "bg-[#E7F6EF] text-[#047857]" : "text-gray-500 hover:text-gray-700"}`}
                  >
                    {t("partners.findSeller")}
                  </button>
                </div>
                <button
                  onClick={handleSearch}
                  disabled={loading || !query.trim()}
                  className="px-6 py-2.5 gradient-brand text-white font-semibold rounded-xl hover:opacity-90 transition-opacity text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                  {t("partners.search")}
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="mb-4 flex items-center justify-between bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">
                <span className="flex items-center gap-2"><AlertTriangle className="w-4 h-4" /> {error}</span>
                <button onClick={handleSearch} className="font-semibold underline">{t("partners.retry")}</button>
              </div>
            )}

            {/* Loading */}
            {loading && (
              <div className="flex flex-col items-center justify-center py-24 text-gray-400 gap-3">
                <Loader2 className="w-8 h-8 animate-spin text-[#059669]" />
                <p className="text-sm">{t("partners.searching")}</p>
              </div>
            )}

            {/* Initial prompt — nothing runs until the user searches */}
            {!loading && !hasSearched && !error && (
              <div className="flex flex-col items-center justify-center py-24 text-gray-400 gap-3 text-center">
                <div className="w-14 h-14 rounded-2xl bg-[#E7F6EF] flex items-center justify-center">
                  <Search className="w-7 h-7 text-[#059669]" />
                </div>
                <p className="text-sm max-w-md">{t("partners.initialPrompt")}</p>
              </div>
            )}

            {/* Empty */}
            {!loading && hasSearched && !error && leads.length === 0 && (
              <div className="flex flex-col items-center justify-center py-24 text-gray-400 gap-2">
                <Building2 className="w-10 h-10 text-gray-300" />
                <p className="text-sm">{t("partners.empty")}</p>
              </div>
            )}

            {/* Results */}
            {!loading && !error && leads.length > 0 && (
              <>
                {/* Controls row */}
                <div className="flex items-center justify-between mb-4">
                  <p className="text-sm text-gray-500">
                    {t("partners.foundPrefix")} <span className="font-bold text-gray-900">{leads.length}</span> {t("partners.foundSuffix")}
                    {country && <> {t("partners.inCountry")} {countryMeta.flag} {t(countryMeta.labelKey)}</>}
                  </p>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setGroupByMarket((g) => !g)}
                      className={`flex items-center gap-1.5 text-sm rounded-xl px-3 py-2 border transition-colors ${
                        groupByMarket
                          ? "bg-[#E7F6EF] text-[#047857] border-[#059669]/40"
                          : "bg-white text-gray-500 border-gray-200 hover:text-gray-700"
                      }`}
                    >
                      <Globe className="w-3.5 h-3.5" /> {t("partners.groupByMarket")}
                    </button>
                    <button
                      onClick={() => setSortAlpha((s) => !s)}
                      className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 bg-white border border-gray-200 rounded-xl px-3 py-2"
                    >
                      {t("partners.sortLabel")} {sortAlpha ? t("partners.sortAlpha") : t("partners.sortRelevant")}
                    </button>
                    <div className="flex bg-white border border-gray-200 rounded-xl overflow-hidden">
                      <button onClick={() => setViewMode("list")} className={`p-2 transition-colors ${viewMode === "list" ? "bg-[#E7F6EF] text-[#059669]" : "text-gray-400 hover:text-gray-600"}`}>
                        <List className="w-4 h-4" />
                      </button>
                      <button onClick={() => setViewMode("grid")} className={`p-2 transition-colors ${viewMode === "grid" ? "bg-[#E7F6EF] text-[#059669]" : "text-gray-400 hover:text-gray-600"}`}>
                        <LayoutGrid className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>

                <div className="flex gap-5">
                  <div className="flex-1 space-y-6">
                    {groupedByMarket.map(([marketKey, marketLeads]) => (
                      <div key={marketKey || "all"}>
                        {groupByMarket && (
                          <h3 className="flex items-center gap-2 text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">
                            <Globe className="w-3.5 h-3.5 text-[#059669]" />
                            {marketKey} <span className="text-gray-300 font-normal normal-case">({marketLeads.length})</span>
                          </h3>
                        )}
                        {viewMode === "list" ? (
                          <div className="space-y-3">
                            {marketLeads.map((lead, i) => (
                              <PartnerCard key={i} lead={lead} country={country} />
                            ))}
                          </div>
                        ) : (
                          <div className="grid grid-cols-2 gap-4">
                            {marketLeads.map((lead, i) => (
                              <PartnerCardGrid key={i} lead={lead} country={country} />
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Right Panel */}
                  <aside className="w-72 shrink-0 space-y-4">
                    <div className="bg-white rounded-2xl border border-[rgba(16,22,43,0.06)] shadow-[0_2px_20px_rgba(16,22,43,0.03)] p-4">
                      <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
                        <Globe className="w-4 h-4 text-[#059669]" />
                        {t("partners.overview")}
                      </h3>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-500">{t("partners.totalPartners")}</span>
                          <span className="font-bold text-gray-900">{leads.length}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-500">{t("partners.safeCount")}</span>
                          <span className="font-bold text-emerald-600">{leads.length - sanctionedCount}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-500">{t("partners.sanctionedCount")}</span>
                          <span className="font-bold text-red-500">{sanctionedCount}</span>
                        </div>
                      </div>
                    </div>

                    {/* AI Insight */}
                    <div className="bg-gradient-to-br from-[#0b1120] to-[#10162b] rounded-2xl p-4">
                      <h3 className="text-xs font-bold text-[#5FD48A] uppercase tracking-widest mb-2">{t("partners.aiInsights")}</h3>
                      <p className="text-xs text-[#7BAA8C] leading-relaxed mb-3">
                        {t("partners.aiInsightText")}
                      </p>
                      <Link
                        href={`/chat?preMessage=${encodeURIComponent(`${t("partners.analyzePrefix")} "${query}"`)}`}
                        className="flex items-center gap-1.5 text-xs text-[#059669] hover:underline font-semibold"
                      >
                        {t("partners.askAiMore")} <ArrowUpRight className="w-3 h-3" />
                      </Link>
                    </div>
                  </aside>
                </div>
              </>
            )}

          </div>
        </div>
      </div>
    </AuthGuard>
  );
}

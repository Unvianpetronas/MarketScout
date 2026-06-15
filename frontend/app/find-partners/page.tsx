"use client";

import { useState, useEffect, useCallback } from "react";
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

const COUNTRY_OPTIONS = [
  { value: "", label: "Tất cả quốc gia", flag: "🌍" },
  { value: "US", label: "Mỹ", flag: "🇺🇸" },
  { value: "DE", label: "Đức", flag: "🇩🇪" },
  { value: "JP", label: "Nhật", flag: "🇯🇵" },
  { value: "CN", label: "Trung Quốc", flag: "🇨🇳" },
];

function PartnerCard({ lead, country }: { lead: LeadResult; country: string }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm card-hover group">
      <div className="flex items-start gap-4">
        <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 ${
          lead.sanctionHit ? "bg-red-50 text-red-500" : "bg-[#E6F9F0] text-[#00D26A]"
        }`}>
          {lead.sanctionHit ? <ShieldAlert className="w-5 h-5" /> : <Building2 className="w-5 h-5" />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            <h3 className="font-bold text-gray-900 text-base">{lead.companyName}</h3>
            {lead.sanctionHit ? (
              <span className="flex items-center gap-1 risk-high text-xs font-semibold px-2.5 py-0.5 rounded-full">
                <AlertTriangle className="w-3 h-3" /> Trong danh sách trừng phạt
              </span>
            ) : (
              <span className="flex items-center gap-1 text-[10px] font-bold text-gray-500 bg-gray-50 px-2 py-0.5 rounded-full border border-gray-200">
                Chưa thẩm định
              </span>
            )}
            {lead.source && (
              <span className="text-[10px] font-semibold text-gray-400 bg-gray-50 px-2 py-0.5 rounded-full border border-gray-200">
                {lead.source}
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
               className="inline-flex items-center gap-1 text-xs text-[#00D26A] hover:underline truncate max-w-full">
              <ExternalLink className="w-3 h-3 shrink-0" /> {lead.website}
            </a>
          )}
        </div>
        <div className="flex flex-col gap-2 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
          <Link
            href={`/verify?q=${encodeURIComponent(lead.companyName)}${country ? `&country=${country}` : ""}`}
            className="flex items-center gap-1.5 px-3 py-2 gradient-brand text-white text-xs font-bold rounded-xl hover:opacity-90"
          >
            <Zap className="w-3 h-3" /> Thẩm định
          </Link>
          <Link
            href={`/chat?preMessage=${encodeURIComponent(`Cho tôi biết thêm về ${lead.companyName}`)}`}
            className="flex items-center gap-1.5 px-3 py-2 bg-gray-50 border border-gray-200 text-gray-600 text-xs font-semibold rounded-xl hover:bg-gray-100"
          >
            <MessageSquare className="w-3 h-3" /> Hỏi AI
          </Link>
        </div>
      </div>
    </div>
  );
}

function PartnerCardGrid({ lead, country }: { lead: LeadResult; country: string }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm card-hover">
      <div className="flex items-start justify-between mb-3">
        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
          lead.sanctionHit ? "bg-red-50 text-red-500" : "bg-[#E6F9F0] text-[#00D26A]"
        }`}>
          {lead.sanctionHit ? <ShieldAlert className="w-4 h-4" /> : <Building2 className="w-4 h-4" />}
        </div>
        {lead.sanctionHit ? (
          <span className="flex items-center gap-1 risk-high text-xs font-semibold px-2.5 py-0.5 rounded-full">
            <AlertTriangle className="w-3 h-3" /> Trừng phạt
          </span>
        ) : (
          <span className="flex items-center gap-1 text-emerald-700 bg-emerald-50 border border-emerald-200 text-xs font-semibold px-2.5 py-0.5 rounded-full">
            <CheckCircle2 className="w-3 h-3" /> An toàn
          </span>
        )}
      </div>
      <h3 className="font-bold text-gray-900 mb-1 text-sm">{lead.companyName}</h3>
      {lead.description && <p className="text-xs text-gray-400 mb-3 line-clamp-2">{lead.description}</p>}
      <div className="flex gap-2">
        <Link
          href={`/verify?q=${encodeURIComponent(lead.companyName)}${country ? `&country=${country}` : ""}`}
          className="flex-1 text-center text-xs py-1.5 gradient-brand text-white font-semibold rounded-lg"
        >
          Thẩm định
        </Link>
        {lead.website ? (
          <a href={lead.website} target="_blank" rel="noopener noreferrer"
             className="flex-1 text-center text-xs py-1.5 border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50">
            Website
          </a>
        ) : (
          <Link
            href={`/chat?preMessage=${encodeURIComponent(`Cho tôi biết thêm về ${lead.companyName}`)}`}
            className="flex-1 text-center text-xs py-1.5 border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50">
            Hỏi AI
          </Link>
        )}
      </div>
    </div>
  );
}

export default function FindPartnersPage() {
  const [query, setQuery] = useState("Nhà nhập khẩu nội thất gỗ tại Mỹ");
  const [country, setCountry] = useState("");
  const [role, setRole] = useState<PartnerRole>("buyer");
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");
  const [sortAlpha, setSortAlpha] = useState(false);

  const [leads, setLeads] = useState<LeadResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  const handleSearch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const results = await searchPartners({ q: query, country: country || undefined, role });
      setLeads(results);
    } catch {
      setError("Không thể tải kết quả tìm kiếm. Vui lòng thử lại.");
    } finally {
      setLoading(false);
      setHasSearched(true);
    }
  }, [query, country, role]);

  useEffect(() => {
    handleSearch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const sanctionedCount = leads.filter((l) => l.sanctionHit).length;
  const sorted = sortAlpha
    ? [...leads].sort((a, b) => a.companyName.localeCompare(b.companyName))
    : leads;
  const countryMeta = COUNTRY_OPTIONS.find((c) => c.value === country) ?? COUNTRY_OPTIONS[0];

  return (
    <AuthGuard>
      <div className="flex h-screen bg-[#FAFBFA] overflow-hidden">
        <Sidebar active="find-partners" />

        <div className="flex-1 overflow-y-auto scrollbar-thin">
          <div className="max-w-7xl mx-auto px-6 py-8">

            {/* Header */}
            <div className="mb-6 animate-fade-in-up">
              <h1 className="text-2xl font-extrabold text-gray-900 mb-1">Tìm đối tác thương mại</h1>
              <p className="text-sm text-gray-400">Khám phá đối tác B2B toàn cầu qua AI, đã lọc theo danh sách trừng phạt</p>
            </div>

            {/* Search */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm mb-5 p-4">
              <div className="flex flex-wrap gap-3">
                <div className="flex-1 min-w-[240px] relative">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                    placeholder="Ví dụ: Nhà nhập khẩu nội thất gỗ tại Mỹ..."
                    className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#00D26A] focus:bg-white transition-all"
                  />
                </div>
                <select
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm bg-white text-gray-700 focus:outline-none focus:border-[#00D26A]"
                >
                  {COUNTRY_OPTIONS.map((c) => (
                    <option key={c.value} value={c.value}>{c.flag} {c.label}</option>
                  ))}
                </select>
                <div className="flex bg-gray-50 border border-gray-200 rounded-xl overflow-hidden text-sm font-medium">
                  <button
                    onClick={() => setRole("buyer")}
                    className={`px-4 py-2.5 transition-colors ${role === "buyer" ? "bg-[#E6F9F0] text-[#00843F]" : "text-gray-500 hover:text-gray-700"}`}
                  >
                    Tìm người mua
                  </button>
                  <button
                    onClick={() => setRole("seller")}
                    className={`px-4 py-2.5 transition-colors ${role === "seller" ? "bg-[#E6F9F0] text-[#00843F]" : "text-gray-500 hover:text-gray-700"}`}
                  >
                    Tìm nhà cung cấp
                  </button>
                </div>
                <button
                  onClick={handleSearch}
                  disabled={loading}
                  className="px-6 py-2.5 gradient-brand text-white font-semibold rounded-xl hover:opacity-90 transition-opacity text-sm disabled:opacity-60 flex items-center gap-2"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                  Tìm kiếm
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="mb-4 flex items-center justify-between bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">
                <span className="flex items-center gap-2"><AlertTriangle className="w-4 h-4" /> {error}</span>
                <button onClick={handleSearch} className="font-semibold underline">Thử lại</button>
              </div>
            )}

            {/* Loading */}
            {loading && (
              <div className="flex flex-col items-center justify-center py-24 text-gray-400 gap-3">
                <Loader2 className="w-8 h-8 animate-spin text-[#00D26A]" />
                <p className="text-sm">Đang tìm kiếm đối tác qua AI...</p>
              </div>
            )}

            {/* Empty */}
            {!loading && hasSearched && !error && leads.length === 0 && (
              <div className="flex flex-col items-center justify-center py-24 text-gray-400 gap-2">
                <Building2 className="w-10 h-10 text-gray-300" />
                <p className="text-sm">Không tìm thấy đối tác phù hợp. Thử từ khóa hoặc quốc gia khác.</p>
              </div>
            )}

            {/* Results */}
            {!loading && !error && leads.length > 0 && (
              <>
                {/* Controls row */}
                <div className="flex items-center justify-between mb-4">
                  <p className="text-sm text-gray-500">
                    Tìm thấy <span className="font-bold text-gray-900">{leads.length} đối tác</span> phù hợp
                    {country && <> tại {countryMeta.flag} {countryMeta.label}</>}
                  </p>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setSortAlpha((s) => !s)}
                      className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 bg-white border border-gray-200 rounded-xl px-3 py-2"
                    >
                      Sắp xếp: {sortAlpha ? "Tên A-Z" : "Liên quan nhất"}
                    </button>
                    <div className="flex bg-white border border-gray-200 rounded-xl overflow-hidden">
                      <button onClick={() => setViewMode("list")} className={`p-2 transition-colors ${viewMode === "list" ? "bg-[#E6F9F0] text-[#00D26A]" : "text-gray-400 hover:text-gray-600"}`}>
                        <List className="w-4 h-4" />
                      </button>
                      <button onClick={() => setViewMode("grid")} className={`p-2 transition-colors ${viewMode === "grid" ? "bg-[#E6F9F0] text-[#00D26A]" : "text-gray-400 hover:text-gray-600"}`}>
                        <LayoutGrid className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>

                <div className="flex gap-5">
                  <div className="flex-1">
                    {viewMode === "list" ? (
                      <div className="space-y-3">
                        {sorted.map((lead, i) => (
                          <PartnerCard key={i} lead={lead} country={country} />
                        ))}
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-4">
                        {sorted.map((lead, i) => (
                          <PartnerCardGrid key={i} lead={lead} country={country} />
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Right Panel */}
                  <aside className="w-72 shrink-0 space-y-4">
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                      <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
                        <Globe className="w-4 h-4 text-[#00D26A]" />
                        Tổng quan kết quả
                      </h3>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-500">Tổng số đối tác</span>
                          <span className="font-bold text-gray-900">{leads.length}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-500">An toàn (chưa phát hiện)</span>
                          <span className="font-bold text-emerald-600">{leads.length - sanctionedCount}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-500">⚠️ Trong danh sách trừng phạt</span>
                          <span className="font-bold text-red-500">{sanctionedCount}</span>
                        </div>
                      </div>
                    </div>

                    {/* AI Insight */}
                    <div className="bg-gradient-to-br from-[#0A1A12] to-[#0D2218] rounded-2xl p-4">
                      <h3 className="text-xs font-bold text-[#5FD48A] uppercase tracking-widest mb-2">💡 AI Insights</h3>
                      <p className="text-xs text-[#7BAA8C] leading-relaxed mb-3">
                        Nhấn &quot;Thẩm định&quot; trên một đối tác để chạy đánh giá 8 trụ cột đầy đủ, hoặc hỏi AI để phân tích sâu hơn về danh sách này.
                      </p>
                      <Link
                        href={`/chat?preMessage=${encodeURIComponent(`Phân tích các đối tác tìm được cho "${query}"`)}`}
                        className="flex items-center gap-1.5 text-xs text-[#00D26A] hover:underline font-semibold"
                      >
                        Hỏi AI chi tiết hơn <ArrowUpRight className="w-3 h-3" />
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

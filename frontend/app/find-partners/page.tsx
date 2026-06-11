"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Search, Download, X, ChevronDown, Globe, Building2, TrendingUp,
  Star, Filter, LayoutGrid, List, MapPin, BarChart3, Zap,
  CheckCircle2, AlertTriangle, XCircle, MessageSquare, ArrowUpRight
} from "lucide-react";
import { Sidebar } from "@/components/layout/sidebar";

interface Partner {
  id: number;
  score: number;
  name: string;
  status: "Đáng tin cậy" | "Cần lưu ý" | "Rủi ro cao";
  description: string;
  location: string;
  country: string;
  countryFlag: string;
  volume: string;
  industry: string;
  founded: string;
  tags: string[];
  verified: boolean;
}

const MOCK_PARTNERS: Partner[] = [
  {
    id: 1, score: 87, name: "ABC Furniture Import LLC",
    status: "Đáng tin cậy",
    description: "Nhà nhập khẩu nội thất gỗ từ Đông Nam Á, chuyên phân phối cho thị trường bán lẻ Mỹ và Canada.",
    location: "Delaware, USA", country: "US", countryFlag: "🇺🇸",
    volume: "~120 container/năm", industry: "Nội thất & Gỗ", founded: "2008",
    tags: ["Nội thất", "Nhập khẩu", "B2B"], verified: true,
  },
  {
    id: 2, score: 79, name: "HomeStyle Distribution Inc.",
    status: "Đáng tin cậy",
    description: "Nhà phân phối đồ nội thất và trang trí gia đình tại thị trường Bắc Mỹ với mạng lưới 200+ cửa hàng.",
    location: "California, USA", country: "US", countryFlag: "🇺🇸",
    volume: "~85 container/năm", industry: "Phân phối bán lẻ", founded: "2014",
    tags: ["Nội thất", "Phân phối", "Retail"], verified: true,
  },
  {
    id: 3, score: 73, name: "Pacific Rim Furnishing Co.",
    status: "Đáng tin cậy",
    description: "Công ty thương mại chuyên nhập khẩu nội thất từ châu Á - Thái Bình Dương, nhiều kinh nghiệm.",
    location: "Oregon, USA", country: "US", countryFlag: "🇺🇸",
    volume: "~60 container/năm", industry: "Nội thất", founded: "2011",
    tags: ["Nội thất", "Nhập khẩu"], verified: true,
  },
  {
    id: 4, score: 48, name: "Global Home Trading Co.",
    status: "Cần lưu ý",
    description: "Công ty thương mại mới thành lập (8 tháng), hoạt động trong lĩnh vực nhập khẩu đồ gia dụng.",
    location: "Texas, USA", country: "US", countryFlag: "🇺🇸",
    volume: "~20 container/năm", industry: "Đồ gia dụng", founded: "2024",
    tags: ["Mới thành lập", "8 tháng"], verified: false,
  },
  {
    id: 5, score: 31, name: "XYZ International Group",
    status: "Rủi ro cao",
    description: "Tập đoàn thương mại quốc tế với lịch sử tranh chấp pháp lý phức tạp, đang điều tra.",
    location: "New York, USA", country: "US", countryFlag: "🇺🇸",
    volume: "N/A", industry: "Thương mại tổng hợp", founded: "2019",
    tags: ["Hard Stop", "Tranh chấp pháp lý"], verified: false,
  },
  {
    id: 6, score: 91, name: "EuroFlex Trading GmbH",
    status: "Đáng tin cậy",
    description: "Tập đoàn thương mại châu Âu uy tín với 20+ năm kinh nghiệm, đối tác chiến lược của 50+ nhà xuất khẩu Việt Nam.",
    location: "Hamburg, Germany", country: "DE", countryFlag: "🇩🇪",
    volume: "~200 container/năm", industry: "Thương mại đa ngành", founded: "2003",
    tags: ["EU", "Top Partner", "Certified"], verified: true,
  },
];

const FILTER_CHIPS = [
  { label: "🇺🇸 Mỹ", active: true },
  { label: "🇩🇪 Châu Âu", active: true },
  { label: "Điểm ≥ 70", active: true },
  { label: "Đã xác minh", active: true },
  { label: "5+ năm", active: false },
  { label: "100+ container", active: false },
];

function ScoreRing({ score }: { score: number }) {
  const color = score >= 70 ? "#00D26A" : score >= 40 ? "#F59E0B" : "#EF4444";
  const bg = score >= 70 ? "#E6F9F0" : score >= 40 ? "#FFF8E7" : "#FFF1F0";
  const r = 18; const circ = 2 * Math.PI * r;
  const offset = circ - (score / 100) * circ;
  return (
    <div className="relative w-12 h-12 shrink-0">
      <svg width="48" height="48" viewBox="0 0 48 48" className="-rotate-90">
        <circle cx="24" cy="24" r={r} fill={bg} stroke="transparent" strokeWidth="0" />
        <circle cx="24" cy="24" r={r} fill="none" stroke="#F0F0F0" strokeWidth="4" />
        <circle cx="24" cy="24" r={r} fill="none" stroke={color} strokeWidth="4"
          strokeDasharray={circ} strokeDashoffset={offset}
          strokeLinecap="round" style={{ transition: "stroke-dashoffset 0.8s ease" }} />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-xs font-extrabold" style={{ color }}>
        {score}
      </span>
    </div>
  );
}

function StatusBadge({ status }: { status: Partner["status"] }) {
  if (status === "Đáng tin cậy") return (
    <span className="flex items-center gap-1 risk-low text-xs font-semibold px-2.5 py-0.5 rounded-full">
      <CheckCircle2 className="w-3 h-3" /> {status}
    </span>
  );
  if (status === "Cần lưu ý") return (
    <span className="flex items-center gap-1 risk-medium text-xs font-semibold px-2.5 py-0.5 rounded-full">
      <AlertTriangle className="w-3 h-3" /> {status}
    </span>
  );
  return (
    <span className="flex items-center gap-1 risk-high text-xs font-semibold px-2.5 py-0.5 rounded-full">
      <XCircle className="w-3 h-3" /> {status}
    </span>
  );
}

export default function FindPartnersPage() {
  const [searchQuery, setSearchQuery] = useState("Nhà nhập khẩu nội thất gỗ tại Mỹ");
  const [chips, setChips] = useState(FILTER_CHIPS);
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");
  const [sortBy, setSortBy] = useState("score");
  const [searchFocused, setSearchFocused] = useState(false);

  const toggleChip = (i: number) => setChips((prev) => prev.map((c, idx) => idx === i ? { ...c, active: !c.active } : c));

  const sorted = [...MOCK_PARTNERS].sort((a, b) =>
    sortBy === "score" ? b.score - a.score : a.name.localeCompare(b.name)
  );

  return (
    <div className="flex h-screen bg-[#FAFBFA] overflow-hidden">
      <Sidebar active="find-partners" />

      <div className="flex-1 overflow-y-auto scrollbar-thin">
        <div className="max-w-7xl mx-auto px-6 py-8">

          {/* ── Header ── */}
          <div className="flex items-start justify-between mb-6 animate-fade-in-up">
            <div>
              <h1 className="text-2xl font-extrabold text-gray-900 mb-1">Tìm đối tác thương mại</h1>
              <p className="text-sm text-gray-400">Khám phá và xác minh đối tác B2B toàn cầu với AI thẩm định</p>
            </div>
            <div className="flex items-center gap-3">
              <button className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-sm font-medium text-gray-600 rounded-xl hover:bg-gray-50 shadow-sm">
                <Download className="w-4 h-4" />
                Xuất danh sách
              </button>
              <button className="flex items-center gap-2 px-4 py-2 gradient-brand text-white text-sm font-semibold rounded-xl hover:opacity-90 shadow-sm">
                <Filter className="w-4 h-4" />
                Bộ lọc nâng cao
              </button>
            </div>
          </div>

          {/* ── Search ── */}
          <div className={`bg-white rounded-2xl border shadow-sm mb-5 transition-all ${
            searchFocused ? "border-[#00D26A] ring-2 ring-[#00D26A]/15" : "border-gray-100"
          }`}>
            <div className="flex gap-3 p-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
                <input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => setSearchFocused(true)}
                  onBlur={() => setSearchFocused(false)}
                  placeholder="Ví dụ: Nhà nhập khẩu nội thất gỗ tại Mỹ..."
                  className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#00D26A] focus:bg-white transition-all"
                />
              </div>
              <select className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm bg-white text-gray-700 focus:outline-none focus:border-[#00D26A]">
                <option value="">Tất cả ngành</option>
                <option>Nội thất & Gỗ</option>
                <option>Dệt may</option>
                <option>Điện tử</option>
                <option>Thực phẩm & FMCG</option>
              </select>
              <select className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm bg-white text-gray-700 focus:outline-none focus:border-[#00D26A]">
                <option value="">Tất cả quốc gia</option>
                <option value="US">🇺🇸 Mỹ</option>
                <option value="DE">🇩🇪 Đức</option>
                <option value="JP">🇯🇵 Nhật</option>
                <option value="CN">🇨🇳 Trung Quốc</option>
              </select>
              <button className="px-6 py-2.5 gradient-brand text-white font-semibold rounded-xl hover:opacity-90 transition-opacity text-sm">
                Tìm kiếm
              </button>
            </div>

            {/* Chips */}
            <div className="flex flex-wrap gap-2 px-4 pb-4">
              {chips.map((chip, i) => (
                <button
                  key={i}
                  onClick={() => toggleChip(i)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border transition-all ${
                    chip.active
                      ? "bg-[#E6F9F0] text-[#00843F] border-[#00D26A]/30"
                      : "bg-gray-50 text-gray-500 border-gray-200 hover:border-gray-300"
                  }`}
                >
                  {chip.label}
                  {chip.active && <X className="w-2.5 h-2.5" />}
                </button>
              ))}
            </div>
          </div>

          {/* ── Controls row ── */}
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-gray-500">
              Tìm thấy <span className="font-bold text-gray-900">{MOCK_PARTNERS.length} đối tác</span> phù hợp
            </p>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSortBy(sortBy === "score" ? "name" : "score")}
                className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 bg-white border border-gray-200 rounded-xl px-3 py-2"
              >
                Sắp xếp: {sortBy === "score" ? "Điểm tin cậy" : "Tên"}
                <ChevronDown className="w-3.5 h-3.5" />
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

          {/* ── Main Layout ── */}
          <div className="flex gap-5">
            {/* Partner List/Grid */}
            <div className="flex-1">
              {viewMode === "list" ? (
                <div className="space-y-3">
                  {sorted.map((partner) => (
                    <div key={partner.id} className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm card-hover group">
                      <div className="flex items-start gap-4">
                        <ScoreRing score={partner.score} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                            <h3 className="font-bold text-gray-900 text-base">{partner.name}</h3>
                            {partner.verified && (
                              <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                                <CheckCircle2 className="w-2.5 h-2.5" /> Đã xác minh
                              </span>
                            )}
                            <StatusBadge status={partner.status} />
                          </div>
                          <p className="text-sm text-gray-500 mb-3 leading-relaxed">{partner.description}</p>
                          <div className="flex items-center gap-4 text-xs text-gray-400 mb-3">
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3 h-3" /> {partner.location}
                            </span>
                            <span className="flex items-center gap-1">
                              <Building2 className="w-3 h-3" /> {partner.industry}
                            </span>
                            <span className="flex items-center gap-1">
                              <BarChart3 className="w-3 h-3" /> {partner.volume}
                            </span>
                            <span className="flex items-center gap-1">
                              <TrendingUp className="w-3 h-3" /> {partner.founded}
                            </span>
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {partner.tags.map((tag) => (
                              <span key={tag} className={`text-xs px-2 py-0.5 rounded-full border ${
                                tag === "Hard Stop"
                                  ? "risk-high"
                                  : tag === "Top Partner"
                                  ? "bg-amber-50 text-amber-700 border-amber-200"
                                  : "bg-gray-50 text-gray-500 border-gray-200"
                              }`}>
                                {tag}
                              </span>
                            ))}
                          </div>
                        </div>
                        <div className="flex flex-col gap-2 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Link
                            href={`/verify?q=${encodeURIComponent(partner.name)}&country=${partner.country}`}
                            className="flex items-center gap-1.5 px-3 py-2 gradient-brand text-white text-xs font-bold rounded-xl hover:opacity-90"
                          >
                            <Zap className="w-3 h-3" /> Thẩm định
                          </Link>
                          <Link
                            href={`/chat?preMessage=${encodeURIComponent(`Cho tôi biết thêm về ${partner.name}`)}`}
                            className="flex items-center gap-1.5 px-3 py-2 bg-gray-50 border border-gray-200 text-gray-600 text-xs font-semibold rounded-xl hover:bg-gray-100"
                          >
                            <MessageSquare className="w-3 h-3" /> Hỏi AI
                          </Link>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  {sorted.map((partner) => (
                    <div key={partner.id} className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm card-hover">
                      <div className="flex items-start justify-between mb-3">
                        <ScoreRing score={partner.score} />
                        <StatusBadge status={partner.status} />
                      </div>
                      <h3 className="font-bold text-gray-900 mb-1 text-sm">{partner.name}</h3>
                      <p className="text-xs text-gray-400 mb-3 line-clamp-2">{partner.description}</p>
                      <div className="flex items-center gap-2 text-[11px] text-gray-400 mb-3">
                        <span>{partner.countryFlag} {partner.country}</span>
                        <span>·</span>
                        <span>{partner.industry}</span>
                      </div>
                      <div className="flex gap-2">
                        <Link
                          href={`/verify?q=${encodeURIComponent(partner.name)}`}
                          className="flex-1 text-center text-xs py-1.5 gradient-brand text-white font-semibold rounded-lg"
                        >
                          Thẩm định
                        </Link>
                        <button className="flex-1 text-xs py-1.5 border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50">
                          Xem hồ sơ
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Right Panel */}
            <aside className="w-72 shrink-0 space-y-4">
              {/* Overview */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
                  <Globe className="w-4 h-4 text-[#00D26A]" />
                  Tổng quan kết quả
                </h3>
                <div className="space-y-2">
                  {[
                    { label: "Đáng tin cậy (≥70)", value: `${MOCK_PARTNERS.filter(p => p.score >= 70).length}`, color: "text-emerald-600" },
                    { label: "Cần lưu ý (40-70)", value: `${MOCK_PARTNERS.filter(p => p.score >= 40 && p.score < 70).length}`, color: "text-amber-600" },
                    { label: "Rủi ro cao (<40)", value: `${MOCK_PARTNERS.filter(p => p.score < 40).length}`, color: "text-red-500" },
                    { label: "Đã xác minh", value: `${MOCK_PARTNERS.filter(p => p.verified).length}`, color: "text-blue-600" },
                  ].map(({ label, value, color }) => (
                    <div key={label} className="flex items-center justify-between text-sm">
                      <span className="text-gray-500">{label}</span>
                      <span className={`font-bold ${color}`}>{value} đối tác</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Country breakdown */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                <h3 className="text-sm font-bold text-gray-900 mb-3">🌍 Phân bổ quốc gia</h3>
                <div className="space-y-2">
                  {[
                    { flag: "🇺🇸", country: "Mỹ", count: 5 },
                    { flag: "🇩🇪", country: "Đức", count: 1 },
                  ].map(({ flag, country, count }) => (
                    <div key={country} className="flex items-center justify-between">
                      <span className="text-sm text-gray-700">{flag} {country}</span>
                      <div className="flex items-center gap-2">
                        <div className="w-20 bg-gray-100 rounded-full h-1.5">
                          <div className="bg-[#00D26A] h-1.5 rounded-full" style={{ width: `${(count / 6) * 100}%` }} />
                        </div>
                        <span className="text-xs text-gray-500">{count}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* AI Insight */}
              <div className="bg-gradient-to-br from-[#0A1A12] to-[#0D2218] rounded-2xl p-4">
                <h3 className="text-xs font-bold text-[#5FD48A] uppercase tracking-widest mb-2">💡 AI Insights</h3>
                <p className="text-xs text-[#7BAA8C] leading-relaxed mb-3">
                  Thị trường nội thất nhập khẩu Mỹ tăng trưởng mạnh. Đối tác tin cậy tập trung ở Delaware & California. Ưu tiên đối tác 5+ năm hoạt động.
                </p>
                <Link href="/chat?preMessage=Ph%C3%A2n%20t%C3%ADch%20th%E1%BB%8B%20tr%C6%B0%E1%BB%9Dng%20n%E1%BB%99i%20th%E1%BA%A5t%20nh%E1%BA%ADp%20kh%E1%BA%A9u%20M%E1%BB%B9" className="flex items-center gap-1.5 text-xs text-[#00D26A] hover:underline font-semibold">
                  Hỏi AI chi tiết hơn <ArrowUpRight className="w-3 h-3" />
                </Link>
              </div>

              {/* Top pick */}
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Star className="w-4 h-4 text-amber-500" />
                  <h3 className="text-sm font-bold text-amber-800">Đề xuất hàng đầu</h3>
                </div>
                <p className="text-xs text-amber-700 font-semibold mb-0.5">EuroFlex Trading GmbH</p>
                <p className="text-xs text-amber-600">Điểm 91 · Đức · 20+ năm kinh nghiệm</p>
              </div>
            </aside>
          </div>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Search, MessageSquare, CheckCircle2, Users, Settings,
  Building2, Plus, Download, X, ChevronDown
} from "lucide-react";

interface Partner {
  id: number;
  score: number;
  name: string;
  status: "An toàn" | "Cần lưu ý" | "Rủi ro cao";
  description: string;
  location: string;
  volume: string;
  tags: string[];
}

const MOCK_PARTNERS: Partner[] = [
  {
    id: 1,
    score: 78,
    name: "ABC Furniture Import LLC",
    status: "An toàn",
    description: "Nhà nhập khẩu nội thất gỗ từ Đông Nam Á, chuyên phân phối cho thị trường bán lẻ Mỹ.",
    location: "Delaware, USA",
    volume: "~120 container/năm",
    tags: ["Nội thất & Gỗ", "Nhập khẩu", "B2B", "Verified"],
  },
  {
    id: 2,
    score: 74,
    name: "HomeStyle Distribution Inc.",
    status: "An toàn",
    description: "Nhà phân phối đồ nội thất và trang trí gia đình tại thị trường Bắc Mỹ.",
    location: "California, USA",
    volume: "~85 container/năm",
    tags: ["Nội thất", "Phân phối", "B2B"],
  },
  {
    id: 3,
    score: 70,
    name: "Pacific Rim Furnishing Co.",
    status: "An toàn",
    description: "Công ty thương mại chuyên nhập khẩu nội thất từ châu Á - Thái Bình Dương.",
    location: "Oregon, USA",
    volume: "~60 container/năm",
    tags: ["Nội thất", "Nhập khẩu", "Verified"],
  },
  {
    id: 4,
    score: 48,
    name: "Global Home Trading Co.",
    status: "Cần lưu ý",
    description: "Công ty thương mại mới thành lập, hoạt động trong lĩnh vực nhập khẩu đồ gia dụng.",
    location: "Texas, USA",
    volume: "~20 container/năm",
    tags: ["Mới thành lập", "8 tháng giao dịch"],
  },
  {
    id: 5,
    score: 32,
    name: "XYZ International Group",
    status: "Rủi ro cao",
    description: "Tập đoàn thương mại quốc tế với lịch sử tranh chấp pháp lý phức tạp.",
    location: "New York, USA",
    volume: "N/A",
    tags: ["⚠ Hard Stop", "Tranh chấp pháp lý"],
  },
];

const NAV_ITEMS = [
  { label: "AI Assistant", icon: MessageSquare, active: false },
  { label: "Tìm đối tác", icon: Search, active: true },
  { label: "Xác minh nhanh", icon: CheckCircle2, active: false },
  { label: "Deal Safety", icon: CheckCircle2, active: false },
  { label: "Quản lý Thành viên", icon: Users, active: false },
  { label: "Hồ sơ Doanh nghiệp", icon: Building2, active: false },
];

const FILTER_CHIPS = [
  { label: "Tất cả", active: false, removable: false },
  { label: "🇺🇸 Mỹ", active: true, removable: true },
  { label: "Châu Âu", active: true, removable: true },
  { label: "Nhật Bản", active: true, removable: true },
  { label: "Hàn Quốc A", active: true, removable: true },
  { label: "Điểm ≥ 70", active: true, removable: true },
  { label: "Hoạt động 5+ năm", active: false, removable: false },
  { label: "100+ container/năm", active: false, removable: false },
];

function ScoreCircle({ score }: { score: number }) {
  const color = score >= 70 ? "#00D26A" : score >= 40 ? "#F59E0B" : "#EF4444";
  return (
    <div
      className="w-12 h-12 rounded-full flex items-center justify-center font-bold text-white text-sm shrink-0"
      style={{ backgroundColor: color }}
    >
      {score}
    </div>
  );
}

function StatusBadge({ status }: { status: Partner["status"] }) {
  const styles = {
    "An toàn": "bg-green-100 text-green-700",
    "Cần lưu ý": "bg-yellow-100 text-yellow-700",
    "Rủi ro cao": "bg-red-100 text-red-700",
  };
  return (
    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${styles[status]}`}>
      {status}
    </span>
  );
}

export default function FindPartnersPage() {
  const [searchQuery, setSearchQuery] = useState("Nhà nhập khẩu nội thất gỗ tại Mỹ");
  const [chips, setChips] = useState(FILTER_CHIPS);

  const removeChip = (index: number) => {
    setChips((prev) => prev.map((c, i) => i === index ? { ...c, active: false } : c));
  };

  return (
    <div className="flex h-screen bg-white overflow-hidden">
      {/* LEFT SIDEBAR */}
      <aside className="w-56 shrink-0 bg-white border-r border-gray-100 flex flex-col">
        {/* Logo */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-[#00D26A] rounded-lg flex items-center justify-center">
              <Search className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-gray-900 text-sm">MarketScout</span>
          </div>
          <button className="w-6 h-6 border border-gray-200 rounded flex items-center justify-center hover:bg-gray-50">
            <Plus className="w-3.5 h-3.5 text-gray-500" />
          </button>
        </div>

        {/* Nav label */}
        <div className="px-4 pt-5 pb-1">
          <p className="text-[10px] text-gray-400 uppercase tracking-widest font-semibold">Menu Chính</p>
        </div>

        {/* Nav items */}
        <nav className="px-2 flex-1 space-y-0.5">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.label}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors text-left ${
                item.active
                  ? "bg-green-50 text-[#00D26A] font-semibold"
                  : "text-gray-600 hover:bg-gray-50"
              }`}
            >
              <item.icon className="w-4 h-4 shrink-0" />
              {item.label}
            </button>
          ))}
        </nav>

        {/* Bottom */}
        <div className="border-t border-gray-100 p-3 space-y-2">
          <button className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-50">
            <Settings className="w-4 h-4" />
            Cài đặt
          </button>
          <div className="flex items-center gap-2 px-3">
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white text-xs font-bold">N</div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-gray-800 truncate">Nguyễn Văn An</p>
              <p className="text-[10px] text-gray-400 truncate">Growth Plan</p>
            </div>
          </div>
        </div>
      </aside>

      {/* MAIN AREA */}
      <main className="flex-1 overflow-y-auto p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Tìm đối tác thương mại</h1>
          <div className="flex items-center gap-3">
            <button className="text-sm text-gray-500 hover:text-gray-700">Lưu workspace</button>
            <button className="flex items-center gap-2 px-4 py-2 bg-[#00D26A] text-white text-sm font-semibold rounded-lg hover:bg-[#00b85d] transition-colors">
              <Download className="w-4 h-4" />
              Xuất danh sách
            </button>
          </div>
        </div>

        {/* Search subsection */}
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Tìm đối tác toàn cầu</h2>

        {/* Search bar */}
        <div className="flex gap-3 mb-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Nhà nhập khẩu nội thất gỗ tại Mỹ"
              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#00D26A] focus:ring-2 focus:ring-[#00D26A]/20"
            />
          </div>
          <button className="px-5 py-2.5 bg-[#00D26A] text-white font-semibold text-sm rounded-lg hover:bg-[#00b85d] transition-colors">
            Tìm kiếm
          </button>
        </div>

        {/* Filter chips */}
        <div className="flex flex-wrap gap-2 mb-4">
          {chips.map((chip, i) => (
            <span
              key={i}
              className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                chip.active
                  ? "bg-green-50 text-green-700 border-green-200"
                  : "bg-gray-100 text-gray-600 border-gray-200"
              }`}
            >
              {chip.label}
              {chip.removable && chip.active && (
                <button onClick={() => removeChip(i)} className="hover:text-red-500">
                  <X className="w-3 h-3" />
                </button>
              )}
            </span>
          ))}
        </div>

        {/* Results count */}
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm text-gray-500">
            Tìm thấy: <span className="font-semibold text-gray-800">47 kết quả</span>
          </p>
          <button className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
            Sắp xếp theo: Trust Score
            <ChevronDown className="w-4 h-4" />
          </button>
        </div>

        {/* Partner cards */}
        <div className="space-y-3">
          {MOCK_PARTNERS.map((partner) => (
            <div
              key={partner.id}
              className="bg-white border border-gray-100 rounded-xl p-5 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start gap-4">
                <ScoreCircle score={partner.score} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-bold text-gray-900">{partner.name}</h3>
                    <StatusBadge status={partner.status} />
                  </div>
                  <p className="text-sm text-gray-500 mb-2">{partner.description}</p>
                  <p className="text-xs text-gray-400 mb-2">
                    {partner.location} &bull; {partner.volume}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {partner.tags.map((tag) => (
                      <span
                        key={tag}
                        className={`text-xs px-2 py-0.5 rounded-full border ${
                          tag.startsWith("⚠")
                            ? "bg-red-50 text-red-600 border-red-200"
                            : "bg-gray-50 text-gray-500 border-gray-200"
                        }`}
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button className="px-3 py-1.5 text-xs font-semibold border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors">
                    Xem hồ sơ
                  </button>
                  <Link
                    href={`/verify?q=${encodeURIComponent(partner.name)}`}
                    className="px-3 py-1.5 text-xs font-semibold bg-[#00D26A] text-white rounded-lg hover:bg-[#00b85d] transition-colors"
                  >
                    Xác minh
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>

      {/* RIGHT SIDEBAR */}
      <aside className="w-72 shrink-0 bg-gray-50 border-l border-gray-100 p-5 overflow-y-auto">
        {/* Overview */}
        <div className="bg-white rounded-xl border border-gray-100 p-4 mb-4">
          <h3 className="text-sm font-semibold text-gray-800 mb-3">🌐 Tổng quan tìm kiếm</h3>
          <div className="space-y-2">
            {[
              { label: "Tổng kết quả", value: "67 công ty", color: "text-gray-600" },
              { label: "An toàn (≥70)", value: "28 công ty", color: "text-green-600" },
              { label: "Cần lưu ý", value: "12 công ty", color: "text-yellow-600" },
              { label: "Rủi ro cao", value: "7 công ty", color: "text-red-600" },
            ].map((row) => (
              <div key={row.label} className="flex items-center justify-between text-sm">
                <span className="text-gray-500">{row.label}</span>
                <span className={`font-semibold ${row.color}`}>{row.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Country distribution */}
        <div className="bg-white rounded-xl border border-gray-100 p-4 mb-4">
          <h3 className="text-sm font-semibold text-gray-800 mb-3">Phân bổ theo quốc gia</h3>
          <div className="space-y-2">
            {[
              { flag: "🇺🇸", country: "Mỹ", count: 31 },
              { flag: "🇨🇦", country: "Canada", count: 8 },
              { flag: "🇬🇧", country: "UK", count: 5 },
              { flag: "🇦🇺", country: "Australia", count: 3 },
            ].map((row) => (
              <div key={row.country} className="flex items-center justify-between text-sm">
                <span className="text-gray-700">
                  {row.flag} {row.country}
                </span>
                <span className="text-gray-500">{row.count} công ty</span>
              </div>
            ))}
          </div>
        </div>

        {/* AI Insights */}
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <h3 className="text-sm font-semibold text-amber-800 mb-2">💡 AI Insights</h3>
          <p className="text-xs text-amber-700 leading-relaxed">
            Thị trường nội thất nhập khẩu Mỹ đang tăng trưởng mạnh. Các đối tác có điểm tin cậy ≥70
            tập trung chủ yếu ở bang Delaware và California. Cân nhắc ưu tiên các đối tác có trên 5 năm hoạt động
            và lịch sử giao dịch rõ ràng.
          </p>
        </div>
      </aside>
    </div>
  );
}

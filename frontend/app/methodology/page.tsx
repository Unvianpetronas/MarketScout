"use client";

import {
  Shield, Globe, TrendingUp, Building2, Star, AlertTriangle,
  FileText, CheckCircle2, BookOpen, Database, Search, Scale,
} from "lucide-react";
import { AuthGuard } from "@/components/shared/auth-guard";
import { Sidebar } from "@/components/layout/sidebar";

interface PillarDoc {
  no: number;
  name: string;
  icon: React.ElementType;
  weight: number;          // % contribution to the overall score
  checks: string;          // what this pillar verifies
  method: string;          // how MarketScout analyzes it
  sources: string[];       // data sources used
  pass: string;            // what PASS means
  warn: string;            // what WARN means
  fail: string;            // what FAIL means
}

const PILLARS: PillarDoc[] = [
  {
    no: 1, name: "Entity Validation — Pháp lý", icon: Shield, weight: 18,
    checks: "Pháp nhân có tồn tại và đang hoạt động hợp pháp hay không: đăng ký kinh doanh, mã LEI, tình trạng hoạt động.",
    method: "Đối chiếu tên doanh nghiệp với cơ quan đăng ký quốc tế và sổ đăng ký pháp nhân toàn cầu; kiểm tra trạng thái ACTIVE/INACTIVE.",
    sources: ["GLEIF (mã LEI)", "Sổ đăng ký doanh nghiệp", "VietQR / cơ quan thuế"],
    pass: "Doanh nghiệp tồn tại, đang hoạt động và khớp hồ sơ pháp lý.",
    warn: "Tồn tại nhưng thiếu một số thông tin pháp lý hoặc chưa khớp hoàn toàn.",
    fail: "Không tìm thấy pháp nhân hoặc đã ngừng hoạt động.",
  },
  {
    no: 2, name: "Digital Footprint — Số hóa", icon: Globe, weight: 10,
    checks: "Sự hiện diện số: website chính thức, tên miền, email tên miền riêng và hiện diện mạng xã hội.",
    method: "Phân tích thông tin tên miền (tuổi đời, đăng ký) và quét hiện diện web/mạng xã hội của doanh nghiệp.",
    sources: ["RDAP (thông tin tên miền)", "Tavily (web search)"],
    pass: "Có website chính thức và hiện diện số rõ ràng, nhất quán.",
    warn: "Có hiện diện số nhưng yếu hoặc thiếu website chính thức.",
    fail: "Không có dấu vết số đáng tin cậy.",
  },
  {
    no: 3, name: "Trade Activity — Thương mại", icon: TrendingUp, weight: 15,
    checks: "Lịch sử giao thương quốc tế: có xuất nhập khẩu thực tế hay không, quy mô lô hàng.",
    method: "Tìm kiếm bằng chứng giao dịch thương mại (vận đơn, lịch sử lô hàng, đối tác) trên các nguồn công khai.",
    sources: ["Dữ liệu thương mại công khai", "Tavily"],
    pass: "Có lịch sử giao thương quốc tế ổn định, quy mô phù hợp.",
    warn: "Có giao dịch nhưng ít, không đều hoặc quy mô nhỏ.",
    fail: "Không tìm thấy bằng chứng giao thương.",
  },
  {
    no: 4, name: "Identity Consistency — Nhận dạng", icon: Building2, weight: 12,
    checks: "Tính nhất quán của danh tính: tên, địa chỉ, thông tin liên hệ có khớp giữa các nguồn không.",
    method: "So khớp địa chỉ và thông tin định danh giữa nhiều nguồn; xác minh địa chỉ vật lý qua bản đồ.",
    sources: ["Google Places", "Nominatim (OpenStreetMap)"],
    pass: "Thông tin định danh khớp và địa chỉ được xác minh.",
    warn: "Có sai lệch nhỏ giữa các nguồn.",
    fail: "Thông tin mâu thuẫn hoặc không xác minh được địa chỉ.",
  },
  {
    no: 5, name: "Financial & Tax — Tài chính", icon: Star, weight: 12,
    checks: "Sức khỏe tài chính và tuân thủ thuế: có báo cáo tài chính, tình trạng thuế bình thường.",
    method: "Kiểm tra mã số thuế, tình trạng tuân thủ thuế và sự tồn tại của báo cáo tài chính.",
    sources: ["Cơ quan thuế", "Hồ sơ tài chính công khai"],
    pass: "Tuân thủ thuế bình thường, có báo cáo tài chính.",
    warn: "Thiếu một phần dữ liệu tài chính/thuế.",
    fail: "Phát hiện vấn đề về thuế hoặc không có dữ liệu tài chính.",
  },
  {
    no: 6, name: "Payment & Bank / Sanctions — Trừng phạt", icon: AlertTriangle, weight: 18,
    checks: "Rủi ro tuân thủ: doanh nghiệp/cá nhân liên quan có nằm trong danh sách trừng phạt hoặc PEP không.",
    method: "Rà soát tên (và bí danh) với các danh sách trừng phạt quốc tế. Đây là trụ cột có thể gây HARD STOP.",
    sources: ["OpenSanctions", "Danh sách PEP/cấm vận quốc tế"],
    pass: "Không nằm trong danh sách trừng phạt.",
    warn: "Có kết quả gần khớp cần rà soát thủ công.",
    fail: "Trùng khớp danh sách trừng phạt — cảnh báo nghiêm trọng (Hard Stop).",
  },
  {
    no: 7, name: "Deal Structure Risk — Giao dịch", icon: FileText, weight: 8,
    checks: "Rủi ro cấu trúc giao dịch: có hợp đồng thành văn, điều khoản thanh toán và Incoterm an toàn không.",
    method: "AI phân tích thông tin giao dịch để đánh giá mức an toàn của phương thức thanh toán và điều khoản hợp đồng.",
    sources: ["MarketScout AI (Gemini)"],
    pass: "Cấu trúc giao dịch an toàn, có hợp đồng thành văn.",
    warn: "Một số điều khoản tiềm ẩn rủi ro cần thương lượng lại.",
    fail: "Chưa có hợp đồng thành văn hoặc cấu trúc rủi ro cao.",
  },
  {
    no: 8, name: "Operational Proof — Vật lý", icon: CheckCircle2, weight: 7,
    checks: "Bằng chứng vận hành thực tế: nhà máy/văn phòng có thật, ảnh thực (không phải ảnh stock), quy mô nhân sự.",
    method: "Xác minh địa điểm vật lý, đối chiếu ngược ảnh để phát hiện ảnh stock và ước lượng quy mô nhân sự.",
    sources: ["TinEye (đối chiếu ảnh)", "Tavily", "Bản đồ"],
    pass: "Có bằng chứng vật lý rõ ràng, ảnh thực, quy mô hợp lý.",
    warn: "Bằng chứng vận hành hạn chế.",
    fail: "Không có bằng chứng hoạt động thực tế.",
  },
];

function StatusLine({ label, text, color, bg }: { label: string; text: string; color: string; bg: string }) {
  return (
    <div className="flex items-start gap-2">
      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 mt-0.5"
        style={{ color, backgroundColor: bg }}>{label}</span>
      <span className="text-xs text-gray-600">{text}</span>
    </div>
  );
}

function PillarDocCard({ p }: { p: PillarDoc }) {
  const Icon = p.icon;
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm card-hover">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#E6F9F0] flex items-center justify-center shrink-0">
            <Icon className="w-5 h-5 text-[#00843F]" />
          </div>
          <div>
            <p className="text-[10px] text-gray-400 font-mono uppercase">Trụ cột {p.no}</p>
            <h3 className="text-base font-bold text-gray-900 mt-0.5">{p.name}</h3>
          </div>
        </div>
        <span className="text-xs font-bold text-[#00843F] bg-[#E6F9F0] px-2.5 py-1 rounded-full shrink-0">
          {p.weight}% điểm
        </span>
      </div>

      <div className="space-y-4">
        <div>
          <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1 flex items-center gap-1.5">
            <Search className="w-3.5 h-3.5" /> Kiểm tra điều gì
          </p>
          <p className="text-sm text-gray-600">{p.checks}</p>
        </div>
        <div>
          <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1 flex items-center gap-1.5">
            <Scale className="w-3.5 h-3.5" /> Phân tích như thế nào
          </p>
          <p className="text-sm text-gray-600">{p.method}</p>
        </div>
        <div>
          <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <Database className="w-3.5 h-3.5" /> Nguồn dữ liệu
          </p>
          <div className="flex flex-wrap gap-1.5">
            {p.sources.map((s, i) => (
              <span key={i} className="text-[11px] text-gray-600 bg-gray-50 border border-gray-100 px-2 py-1 rounded-lg">
                {s}
              </span>
            ))}
          </div>
        </div>
        <div className="border-t border-gray-50 pt-3 space-y-2">
          <StatusLine label="PASS" text={p.pass} color="#047857" bg="#E6F9F0" />
          <StatusLine label="WARN" text={p.warn} color="#B45309" bg="#FFF8E7" />
          <StatusLine label="FAIL" text={p.fail} color="#B91C1C" bg="#FFF1F0" />
        </div>
      </div>
    </div>
  );
}

export default function MethodologyPage() {
  return (
    <AuthGuard>
      <div className="flex h-screen overflow-hidden bg-[#FAFBFA]">
        <Sidebar active="methodology" />
        <div className="flex-1 overflow-y-auto scrollbar-thin">
          <main className="max-w-6xl mx-auto px-6 py-8">

            {/* ── Header ── */}
            <div className="mb-8 animate-fade-in">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-11 h-11 rounded-2xl gradient-brand flex items-center justify-center shadow-sm">
                  <BookOpen className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-extrabold text-gray-900">Cách phân tích 8 Trụ cột</h1>
                  <p className="text-sm text-gray-400">
                    Hiểu rõ mỗi trụ cột kiểm tra điều gì, phân tích ra sao và dùng nguồn dữ liệu nào.
                  </p>
                </div>
              </div>
            </div>

            {/* ── How scoring works ── */}
            <div className="bg-gradient-to-r from-[#0A1A12] to-[#0D2218] rounded-2xl p-6 mb-8">
              <p className="text-[#5FD48A] text-xs font-bold uppercase tracking-widest mb-2">Cách tính điểm</p>
              <p className="text-white/90 text-sm leading-relaxed mb-3">
                Mỗi đối tác được thẩm định qua 8 trụ cột độc lập. Mỗi trụ cột nhận điểm 0–100 và một
                trạng thái <span className="font-bold text-emerald-300">PASS</span> /
                <span className="font-bold text-amber-300"> WARN</span> /
                <span className="font-bold text-red-300"> FAIL</span>. Điểm tin cậy tổng là trung bình
                có trọng số của các trụ cột — những trụ cột không đủ dữ liệu (N/A) được loại khỏi phép
                tính nên không kéo điểm xuống oan.
              </p>
              <p className="text-white/70 text-sm leading-relaxed">
                Trụ cột <span className="font-bold text-white">Trừng phạt</span> đặc biệt: nếu trùng khớp
                danh sách cấm vận, hệ thống kích hoạt <span className="font-bold text-red-300">Hard Stop</span> —
                đề xuất tạm dừng giao dịch bất kể điểm tổng.
              </p>
            </div>

            {/* ── Pillar docs ── */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {PILLARS.map((p) => <PillarDocCard key={p.no} p={p} />)}
            </div>

            {/* ── Confidence note ── */}
            <div className="mt-8 bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
              <h3 className="text-sm font-bold text-gray-900 mb-2">Về "Độ tin cậy" của mỗi trụ cột</h3>
              <p className="text-sm text-gray-600">
                Mỗi trụ cột kèm chỉ số độ tin cậy (HIGH / MEDIUM / LOW) phản ánh chất lượng và số lượng
                nguồn dữ liệu tìm được. Độ tin cậy thấp không có nghĩa đối tác xấu — mà là cần bổ sung
                thêm thông tin để kết luận chắc chắn hơn.
              </p>
            </div>

          </main>
        </div>
      </div>
    </AuthGuard>
  );
}

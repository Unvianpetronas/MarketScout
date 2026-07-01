"use client";

import { useState } from "react";
import Link from "next/link";
import { BarChart2, ArrowLeft, MessageSquare, Mail, ChevronDown, ChevronUp, BookOpen, Zap, Shield, AlertTriangle, CreditCard, User } from "lucide-react";

const FAQS = [
  {
    category: "Tài khoản & Đăng nhập",
    icon: User,
    color: "#0EA5E9",
    items: [
      {
        q: "Tôi quên mật khẩu, phải làm sao?",
        a: "Truy cập trang đăng nhập và nhấn 'Quên mật khẩu'. Nhập email đăng ký, chúng tôi sẽ gửi liên kết đặt lại mật khẩu trong vòng vài phút. Kiểm tra cả hộp thư Spam nếu không thấy email.",
      },
      {
        q: "Tại sao tôi bị đăng xuất tự động?",
        a: "Phiên đăng nhập có thời hạn bảo mật. Nếu không chọn 'Ghi nhớ đăng nhập', phiên sẽ kết thúc khi đóng trình duyệt. Nếu bị đăng xuất giữa chừng, thường do token bảo mật hết hạn — chỉ cần đăng nhập lại.",
      },
      {
        q: "Tôi có thể thay đổi email đăng ký không?",
        a: "Hiện tại email đăng ký không thể thay đổi trực tiếp. Vui lòng liên hệ support để được hỗ trợ nếu cần cập nhật email.",
      },
    ],
  },
  {
    category: "Thẩm định & Báo cáo",
    icon: Shield,
    color: "#00D26A",
    items: [
      {
        q: "Thẩm định mất bao lâu?",
        a: "Thẩm định nhanh (Quick Scan) thường mất 5–15 giây. Thẩm định đầy đủ 8 trụ cột (Deep Verify) mất 30–60 giây tùy vào số nguồn dữ liệu cần truy vấn. Đối với công ty quốc tế lớn, thời gian có thể dài hơn.",
      },
      {
        q: "Điểm rủi ro được tính như thế nào?",
        a: "Điểm tổng là trung bình có trọng số của 8 trụ cột (0–100). Mỗi trụ cột có trọng số khác nhau (từ 7% đến 18%). Trụ cột không có dữ liệu (N/A) được loại khỏi phép tính để tránh kéo điểm oan. Xem trang Methodology để biết chi tiết.",
      },
      {
        q: "'Hard Stop' nghĩa là gì?",
        a: "Hard Stop là cảnh báo nghiêm trọng khi tên doanh nghiệp hoặc cá nhân liên quan trùng khớp với danh sách trừng phạt quốc tế (OFAC, EU, OpenSanctions). Kết quả này kích hoạt bất kể điểm tổng và khuyến nghị tạm dừng giao dịch ngay lập tức để xem xét pháp lý.",
      },
      {
        q: "Tôi có thể thẩm định công ty Việt Nam không?",
        a: "Có. MarketScout hỗ trợ tra cứu công ty Việt Nam qua mã số thuế (MST), tích hợp với hệ thống đăng ký doanh nghiệp và cơ sở dữ liệu VCCI. Nhập tên công ty hoặc mã số thuế vào ô tìm kiếm.",
      },
      {
        q: "Kết quả thẩm định có bị sai không?",
        a: "Kết quả dựa trên dữ liệu công khai và AI — có độ chính xác cao nhưng không tuyệt đối 100%. Một số thông tin trên nguồn công khai có thể chưa được cập nhật. Luôn bổ sung bằng xác minh thực địa cho các giao dịch quan trọng.",
      },
    ],
  },
  {
    category: "Thanh toán & Hạn ngạch",
    icon: CreditCard,
    color: "#8B5CF6",
    items: [
      {
        q: "Hạn ngạch là gì và khi nào bị trừ?",
        a: "Mỗi lần thực hiện thẩm định đầy đủ (Deep Verify) hoặc So sánh đối tác trừ 1–2 quota. Tra cứu nhanh (Quick Scan) và chat AI thông thường không trừ quota. Quota được hiển thị trên thanh sidebar bên trái.",
      },
      {
        q: "Tôi có thể mua thêm quota không?",
        a: "Có. Truy cập /pricing để nạp thêm quota hoặc nâng cấp gói dịch vụ. Chúng tôi hỗ trợ thanh toán qua VietQR, chuyển khoản ngân hàng và các phương thức phổ biến khác.",
      },
      {
        q: "Quota có hết hạn không?",
        a: "Quota trong gói đăng ký có hiệu lực trong chu kỳ thanh toán (tháng hoặc năm). Quota nạp thêm (top-up) có thời hạn 12 tháng kể từ ngày mua.",
      },
      {
        q: "Tôi có thể hoàn tiền không?",
        a: "Chúng tôi không hoàn tiền cho quota đã sử dụng hoặc gói dịch vụ đã kích hoạt. Nếu có lỗi kỹ thuật nghiêm trọng từ hệ thống chúng tôi khiến thẩm định thất bại và quota bị trừ sai, vui lòng liên hệ support kèm ID báo cáo để được xem xét hoàn quota.",
      },
    ],
  },
  {
    category: "AI Chat",
    icon: Zap,
    color: "#F59E0B",
    items: [
      {
        q: "AI Chat có thể làm gì?",
        a: "MarketScout AI có thể: thẩm định đối tác theo yêu cầu chat (ví dụ: 'Thẩm định Apple Inc tại Mỹ'), tra cứu thông tin doanh nghiệp nhanh, tìm kiếm đối tác tiềm năng, giải thích báo cáo đã có, và trả lời câu hỏi về thương mại quốc tế.",
      },
      {
        q: "Tại sao AI không trả lời tin nhắn của tôi?",
        a: "Thẩm định đầy đủ mất 30–60 giây. Nếu kết nối mạng không ổn định, có thể bị ngắt giữa chừng. Thử gửi lại tin nhắn. Nếu lỗi liên tục, kiểm tra kết nối mạng và thử lại sau vài phút.",
      },
      {
        q: "Lịch sử chat có được lưu không?",
        a: "Có, lịch sử cuộc hội thoại được lưu theo phiên (session). Bạn có thể xem lại lịch sử ở thanh sidebar trái trong trang Chat. Mỗi phiên lưu trữ tối đa 100 tin nhắn.",
      },
    ],
  },
  {
    category: "Bảo mật & Dữ liệu",
    icon: AlertTriangle,
    color: "#EF4444",
    items: [
      {
        q: "Dữ liệu công ty tôi tra cứu có bị lưu không?",
        a: "Có, kết quả thẩm định được lưu trong tài khoản của bạn để xem lại. Dữ liệu này không được chia sẻ với người dùng khác. Bạn có thể xóa báo cáo bất cứ lúc nào.",
      },
      {
        q: "MarketScout có tuân thủ PDPA/GDPR không?",
        a: "Có. Chúng tôi tuân thủ Nghị định 13/2023/NĐ-CP về bảo vệ dữ liệu cá nhân tại Việt Nam và các tiêu chuẩn bảo vệ dữ liệu quốc tế. Xem Chính sách quyền riêng tư để biết thêm chi tiết.",
      },
    ],
  },
];

function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-gray-100 last:border-0">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between py-4 text-left gap-3"
      >
        <span className="text-sm font-semibold text-gray-800">{q}</span>
        {open ? (
          <ChevronUp className="w-4 h-4 text-gray-400 shrink-0" />
        ) : (
          <ChevronDown className="w-4 h-4 text-gray-400 shrink-0" />
        )}
      </button>
      {open && (
        <p className="text-sm text-gray-600 leading-relaxed pb-4">{a}</p>
      )}
    </div>
  );
}

export default function SupportDeskPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white/95 backdrop-blur z-50">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-[#00D26A] flex items-center justify-center">
            <BarChart2 className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-gray-900 text-lg">MarketScout</span>
        </Link>
        <Link
          href="/"
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Quay lại
        </Link>
      </nav>

      {/* Header */}
      <div className="bg-gradient-to-br from-[#0A1A12] to-[#0D2218] py-16">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <div className="w-12 h-12 rounded-2xl bg-[#00D26A]/15 flex items-center justify-center mx-auto mb-4">
            <MessageSquare className="w-6 h-6 text-[#00D26A]" />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-3">Trung tâm hỗ trợ</h1>
          <p className="text-gray-400 text-base max-w-xl mx-auto">
            Tìm câu trả lời nhanh trong phần FAQ hoặc liên hệ trực tiếp với đội ngũ của chúng tôi.
          </p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-12 space-y-10">

        {/* Contact channels */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <a
            href="mailto:compliance@marketscout.aram.vn"
            className="flex items-start gap-4 bg-white border border-gray-100 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow group"
          >
            <div className="w-10 h-10 rounded-xl bg-[#E6F9F0] flex items-center justify-center shrink-0 group-hover:bg-[#00D26A] transition-colors">
              <Mail className="w-5 h-5 text-[#00A859] group-hover:text-white transition-colors" />
            </div>
            <div>
              <p className="font-bold text-gray-900 text-sm mb-1">Gửi email cho chúng tôi</p>
              <p className="text-xs text-gray-500">compliance@marketscout.aram.vn</p>
              <p className="text-xs text-gray-400 mt-1">Phản hồi trong 1–2 ngày làm việc</p>
            </div>
          </a>

          <Link
            href="/chat"
            className="flex items-start gap-4 bg-[#0D2218] border border-[#00D26A]/20 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow group"
          >
            <div className="w-10 h-10 rounded-xl bg-[#00D26A]/15 flex items-center justify-center shrink-0 group-hover:bg-[#00D26A] transition-colors">
              <MessageSquare className="w-5 h-5 text-[#00D26A] group-hover:text-white transition-colors" />
            </div>
            <div>
              <p className="font-bold text-white text-sm mb-1">Chat với MarketScout AI</p>
              <p className="text-xs text-gray-400">Hỏi AI về cách sử dụng và tính năng</p>
              <p className="text-xs text-[#5FD48A] mt-1">Trả lời ngay lập tức</p>
            </div>
          </Link>
        </div>

        {/* Quick links */}
        <div className="bg-gray-50 rounded-2xl p-6">
          <h2 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-[#00A859]" />
            Tài liệu hữu ích
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Link href="/methodology" className="flex items-center gap-2.5 bg-white rounded-xl p-3.5 border border-gray-100 hover:border-[#00D26A] hover:bg-[#E6F9F0] transition-all text-sm font-medium text-gray-700 hover:text-[#00843F]">
              <Shield className="w-4 h-4 text-[#00A859] shrink-0" />
              Phương pháp 8 trụ cột
            </Link>
            <Link href="/pricing" className="flex items-center gap-2.5 bg-white rounded-xl p-3.5 border border-gray-100 hover:border-[#00D26A] hover:bg-[#E6F9F0] transition-all text-sm font-medium text-gray-700 hover:text-[#00843F]">
              <CreditCard className="w-4 h-4 text-[#00A859] shrink-0" />
              Bảng giá dịch vụ
            </Link>
            <Link href="/privacy-policy" className="flex items-center gap-2.5 bg-white rounded-xl p-3.5 border border-gray-100 hover:border-[#00D26A] hover:bg-[#E6F9F0] transition-all text-sm font-medium text-gray-700 hover:text-[#00843F]">
              <AlertTriangle className="w-4 h-4 text-[#00A859] shrink-0" />
              Quyền riêng tư
            </Link>
          </div>
        </div>

        {/* FAQ */}
        <div>
          <h2 className="text-xl font-bold text-gray-900 mb-6">Câu hỏi thường gặp</h2>
          <div className="space-y-4">
            {FAQS.map((category) => {
              const Icon = category.icon;
              return (
                <div key={category.category} className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
                  <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-50"
                    style={{ backgroundColor: `${category.color}08` }}>
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                      style={{ backgroundColor: `${category.color}15` }}>
                      <Icon className="w-4 h-4" style={{ color: category.color }} />
                    </div>
                    <h3 className="text-sm font-bold text-gray-900">{category.category}</h3>
                  </div>
                  <div className="px-5">
                    {category.items.map((item) => (
                      <FAQItem key={item.q} q={item.q} a={item.a} />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Bottom CTA */}
        <div className="bg-gradient-to-br from-[#0A1A12] to-[#0D2218] rounded-2xl p-8 text-center">
          <h3 className="text-white font-bold text-lg mb-2">Vẫn cần hỗ trợ?</h3>
          <p className="text-gray-400 text-sm mb-6 max-w-md mx-auto">
            Đội ngũ Team ARAM luôn sẵn sàng hỗ trợ bạn. Gửi email mô tả vấn đề kèm ID tài khoản hoặc ID báo cáo để được xử lý nhanh nhất.
          </p>
          <a
            href="mailto:compliance@marketscout.aram.vn"
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-[#00D26A] text-white font-semibold rounded-xl hover:bg-[#00B85D] transition-colors text-sm"
          >
            <Mail className="w-4 h-4" />
            Gửi email hỗ trợ
          </a>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-gray-100 py-8 text-center text-sm text-gray-400">
        <p>&copy; {new Date().getFullYear()} MarketScout. Phát triển bởi Team ARAM #278.</p>
        <div className="flex items-center justify-center gap-4 mt-3 text-xs">
          <Link href="/terms-of-service" className="hover:text-gray-600 transition-colors">Terms of Service</Link>
          <span>·</span>
          <Link href="/privacy-policy" className="hover:text-gray-600 transition-colors">Privacy Policy</Link>
          <span>·</span>
          <Link href="/support-desk" className="text-[#00A859]">Support Desk</Link>
        </div>
      </footer>
    </div>
  );
}

"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, X, Zap, Shield, Star, ArrowRight, ChevronDown, ChevronUp } from "lucide-react";

const PLANS = [
  {
    id: "free",
    name: "Free",
    tagline: "Khám phá nền tảng",
    priceVnd: 0,
    priceUsd: 0,
    isFree: true,
    isPopular: false,
    quotaLabel: "3 thẩm định/tháng",
    cta: "Bắt đầu miễn phí",
    href: "/register",
    cardStyle: "border-gray-200 bg-white",
    ctaStyle: "border border-gray-300 text-gray-700 hover:bg-gray-50",
    accentColor: "#9CA3AF",
    features: [
      "3 thẩm định/tháng",
      "Tìm kiếm doanh nghiệp cơ bản",
      "Quick Scan only",
      "Hỗ trợ Email",
    ],
    noFeatures: [
      "Deep Verify 8 trụ cột",
      "API Access",
      "Báo cáo PDF export",
      "Hỗ trợ ưu tiên",
    ],
  },
  {
    id: "starter",
    name: "Starter",
    tagline: "Doanh nghiệp nhỏ & vừa",
    priceVnd: 2000000,
    priceUsd: 80,
    isFree: false,
    isPopular: false,
    quotaLabel: "15 thẩm định/tháng",
    cta: "Chọn Starter",
    href: "/checkout?plan=starter",
    cardStyle: "border-blue-200 bg-white",
    ctaStyle: "border border-blue-500 text-blue-700 hover:bg-blue-50",
    accentColor: "#3B82F6",
    features: [
      "15 thẩm định/tháng",
      "Deep Verify 8 trụ cột",
      "AI Chat Copilot",
      "Báo cáo PDF export",
      "Hỗ trợ Email",
    ],
    noFeatures: [
      "API Access",
      "Hỗ trợ 24/7 ưu tiên",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    tagline: "Nhà xuất nhập khẩu chuyên nghiệp",
    priceVnd: 5800000,
    priceUsd: 230,
    isFree: false,
    isPopular: true,
    quotaLabel: "50 thẩm định/tháng",
    cta: "Chọn Pro",
    href: "/checkout?plan=pro",
    cardStyle: "border-[#00D26A] bg-white ring-2 ring-[#00D26A]/20",
    ctaStyle: "gradient-brand text-white hover:opacity-90",
    accentColor: "#00D26A",
    features: [
      "50 thẩm định/tháng",
      "Deep Verify 8 trụ cột",
      "AI Chat Copilot nâng cao",
      "Báo cáo PDF export",
      "API Access (1 key)",
      "Find Partners AI",
      "Hỗ trợ ưu tiên",
    ],
    noFeatures: [
      "Custom SLA",
    ],
  },
  {
    id: "enterprise",
    name: "Enterprise",
    tagline: "Doanh nghiệp & Tập đoàn lớn",
    priceVnd: 0, // Custom
    priceUsd: 0,
    isFree: false,
    isPopular: false,
    isCustom: true,
    quotaLabel: "Không giới hạn",
    cta: "Liên hệ Sales",
    href: "mailto:sales@marketscout.vn",
    cardStyle: "border-gray-800 bg-[#0A1A12]",
    ctaStyle: "gradient-brand text-white hover:opacity-90",
    accentColor: "#00D26A",
    features: [
      "Unlimited thẩm định",
      "Deep Verify 8 trụ cột",
      "AI Copilot tùy chỉnh",
      "API Access (nhiều key)",
      "Tích hợp ERP/CRM",
      "Dedicated Account Manager",
      "Custom SLA & 99.9% uptime",
      "On-premise deployment",
    ],
    noFeatures: [],
    isDark: true,
  },
];

const FAQS = [
  {
    q: "Quota có hết hạn không?",
    a: "Quota mua thêm không hết hạn và được chuyển sang tháng sau. Quota gói hàng tháng reset vào đầu mỗi chu kỳ billing.",
  },
  {
    q: "Tôi có thể nâng/hạ gói không?",
    a: "Có thể nâng cấp bất cứ lúc nào. Hạ gói sẽ có hiệu lực từ chu kỳ billing tiếp theo.",
  },
  {
    q: "Có thể dùng thử trước khi mua không?",
    a: "Gói Free cho bạn 3 thẩm định miễn phí mỗi tháng để trải nghiệm đầy đủ tính năng cơ bản.",
  },
  {
    q: "Dữ liệu thẩm định đến từ đâu?",
    a: "MarketScout tổng hợp dữ liệu từ 50+ nguồn: đăng ký kinh doanh nhà nước, cơ sở dữ liệu thương mại, news, và các tổ chức quốc tế.",
  },
  {
    q: "API Access hoạt động như thế nào?",
    a: "Bạn nhận được API key để tích hợp vào hệ thống của mình. Tài liệu API đầy đủ và môi trường sandbox được cung cấp.",
  },
];

function PriceDisplay({ vnd, usd, isFree, isCustom, isDark }: { vnd: number; usd: number; isFree: boolean; isCustom?: boolean; isDark?: boolean }) {
  const textColor = isDark ? "text-white" : "text-gray-900";
  const subColor = isDark ? "text-gray-400" : "text-gray-400";
  if (isFree) return <div className={`text-4xl font-extrabold ${textColor}`}>Miễn phí</div>;
  if (isCustom) return <div className={`text-3xl font-extrabold ${textColor}`}>Tùy chỉnh</div>;
  return (
    <div>
      <div className="flex items-end gap-1">
        <span className={`text-4xl font-extrabold ${textColor}`}>{(vnd / 1000000).toFixed(1)}M</span>
        <span className={`text-sm font-medium ${subColor} mb-1.5`}>VND</span>
      </div>
      <p className={`text-xs ${subColor}`}>(~${usd} USD) / tháng</p>
    </div>
  );
}

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-gray-100 rounded-2xl overflow-hidden">
      <button onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-gray-50">
        <p className="text-sm font-semibold text-gray-900">{q}</p>
        {open ? <ChevronUp className="w-4 h-4 text-gray-400 shrink-0" /> : <ChevronDown className="w-4 h-4 text-gray-400 shrink-0" />}
      </button>
      {open && (
        <div className="px-5 pb-5 pt-0">
          <p className="text-sm text-gray-500 leading-relaxed">{a}</p>
        </div>
      )}
    </div>
  );
}

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-[#FAFBFA]">
      {/* ── Navbar ── */}
      <nav className="sticky top-0 z-30 bg-white/90 backdrop-blur border-b border-gray-100 px-6 py-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl gradient-brand flex items-center justify-center">
            <Shield className="w-4 h-4 text-white" />
          </div>
          <div>
            <span className="font-extrabold text-gray-900 text-sm">MarketScout</span>
            <span className="text-[#00D26A] text-xs font-semibold ml-1.5">B2B INTELLIGENCE</span>
          </div>
        </Link>
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="text-sm text-gray-500 hover:text-gray-800 font-medium">Bảng điều khiển</Link>
          <Link href="/login" className="px-4 py-2 border border-gray-200 text-gray-700 text-sm font-semibold rounded-xl hover:bg-gray-50">
            Đăng nhập
          </Link>
          <Link href="/register" className="px-4 py-2 gradient-brand text-white text-sm font-semibold rounded-xl hover:opacity-90">
            Dùng thử miễn phí
          </Link>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-6 py-16">

        {/* ── Header ── */}
        <div className="text-center mb-14 animate-fade-in-up">
          <span className="text-xs font-bold text-[#00D26A] bg-[#E6F9F0] border border-[#00D26A]/30 px-4 py-1.5 rounded-full uppercase tracking-widest">
            Bảng giá minh bạch
          </span>
          <h1 className="text-5xl font-extrabold text-gray-900 mt-5 mb-4 leading-tight">
            Chọn gói phù hợp với<br />
            <span className="gradient-text">quy mô doanh nghiệp</span>
          </h1>
          <p className="text-lg text-gray-500 max-w-xl mx-auto">
            Từ startup đến tập đoàn, MarketScout có gói dịch vụ phù hợp với mọi nhu cầu thẩm định thương mại quốc tế.
          </p>
        </div>

        {/* ── Plans Grid ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-16 stagger">
          {PLANS.map((plan) => (
            <div key={plan.id}
              className={`relative flex flex-col rounded-2xl border p-6 shadow-sm transition-all hover:shadow-md ${plan.cardStyle}`}>

              {plan.isPopular && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                  <span className="gradient-brand text-white text-[10px] font-extrabold uppercase tracking-widest px-4 py-1.5 rounded-full shadow-lg flex items-center gap-1">
                    <Star className="w-3 h-3" /> Phổ biến nhất
                  </span>
                </div>
              )}

              <div className="mb-5">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-bold uppercase tracking-widest" style={{ color: plan.accentColor }}>{plan.name}</p>
                </div>
                <p className={`text-xs mb-4 ${(plan as { isDark?: boolean }).isDark ? "text-gray-400" : "text-gray-400"}`}>{plan.tagline}</p>
                <PriceDisplay vnd={plan.priceVnd} usd={plan.priceUsd} isFree={plan.isFree} isCustom={(plan as { isCustom?: boolean }).isCustom} isDark={(plan as { isDark?: boolean }).isDark} />
                <p className="text-xs mt-2 font-semibold" style={{ color: plan.accentColor }}>{plan.quotaLabel}</p>
              </div>

              <Link href={plan.href}
                className={`block w-full py-3 rounded-xl text-sm font-bold text-center transition-all mb-5 ${plan.ctaStyle}`}>
                {plan.cta} →
              </Link>

              <div className="flex-1 space-y-2">
                {plan.features.map((f) => (
                  <div key={f} className="flex items-start gap-2">
                    <Check className="w-4 h-4 shrink-0 mt-0.5" style={{ color: plan.accentColor }} />
                    <span className={`text-xs ${(plan as { isDark?: boolean }).isDark ? "text-gray-300" : "text-gray-600"}`}>{f}</span>
                  </div>
                ))}
                {plan.noFeatures?.map((f) => (
                  <div key={f} className="flex items-start gap-2 opacity-40">
                    <X className={`w-4 h-4 shrink-0 mt-0.5 ${(plan as { isDark?: boolean }).isDark ? "text-gray-500" : "text-gray-300"}`} />
                    <span className={`text-xs ${(plan as { isDark?: boolean }).isDark ? "text-gray-500" : "text-gray-400"}`}>{f}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* ── Add-on Quota ── */}
        <div className="bg-[#0A1A12] rounded-2xl p-8 mb-16 flex items-center justify-between gap-6">
          <div>
            <span className="text-[10px] font-bold text-[#00D26A] uppercase tracking-widest border border-[#00D26A]/30 rounded px-2 py-0.5">
              Nạp thêm linh hoạt
            </span>
            <h2 className="text-2xl font-extrabold text-white mt-3 mb-2">Quota Add-on</h2>
            <p className="text-sm text-gray-400 max-w-md">
              Hết quota trước cuối tháng? Mua thêm quota bất kỳ lúc nào. Quota add-on không hết hạn và được cộng dồn.
            </p>
          </div>
          <div className="shrink-0 text-right">
            <p className="text-3xl font-extrabold text-white mb-1">200.000 <span className="text-lg text-gray-400">VND</span></p>
            <p className="text-sm text-gray-400 mb-4">/ 1 thẩm định</p>
            <Link href="/checkout?plan=topup"
              className="inline-flex items-center gap-2 px-6 py-3 gradient-brand text-white font-bold rounded-xl hover:opacity-90 text-sm">
              <Zap className="w-4 h-4" /> Nạp thêm Quota
            </Link>
          </div>
        </div>

        {/* ── Trust Signals ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-16">
          {[
            { icon: "🔒", title: "ISO 27001 & SOC 2", desc: "Tiêu chuẩn bảo mật dữ liệu quốc tế" },
            { icon: "💯", title: "Hoàn tiền 24h", desc: "Nếu quota chưa được sử dụng" },
            { icon: "🌏", title: "190+ Quốc gia", desc: "Phủ sóng toàn cầu" },
            { icon: "⚡", title: "99.9% Uptime", desc: "SLA đảm bảo dịch vụ liên tục" },
          ].map(({ icon, title, desc }) => (
            <div key={title} className="bg-white border border-gray-100 rounded-2xl p-5 text-center shadow-sm">
              <p className="text-3xl mb-2">{icon}</p>
              <p className="text-sm font-bold text-gray-900 mb-0.5">{title}</p>
              <p className="text-xs text-gray-400">{desc}</p>
            </div>
          ))}
        </div>

        {/* ── FAQ ── */}
        <div className="max-w-2xl mx-auto">
          <h2 className="text-2xl font-extrabold text-gray-900 text-center mb-8">Câu hỏi thường gặp</h2>
          <div className="space-y-3">
            {FAQS.map((faq) => <FaqItem key={faq.q} {...faq} />)}
          </div>
        </div>

        {/* ── Bottom CTA ── */}
        <div className="mt-16 text-center animate-fade-in-up">
          <h2 className="text-3xl font-extrabold text-gray-900 mb-3">Vẫn còn phân vân?</h2>
          <p className="text-gray-500 mb-6">Đội ngũ sales của chúng tôi sẵn sàng tư vấn gói phù hợp nhất cho doanh nghiệp.</p>
          <div className="flex items-center justify-center gap-3">
            <Link href="/register"
              className="flex items-center gap-2 px-6 py-3 gradient-brand text-white font-bold rounded-xl hover:opacity-90 text-sm">
              <Zap className="w-4 h-4" /> Thử miễn phí 3 thẩm định
            </Link>
            <a href="mailto:sales@marketscout.vn"
              className="flex items-center gap-2 px-6 py-3 border border-gray-200 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 text-sm">
              Liên hệ Sales <ArrowRight className="w-4 h-4" />
            </a>
          </div>
        </div>

      </main>

      {/* Footer */}
      <footer className="mt-16 border-t border-gray-100 py-8 px-6">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <p className="text-xs text-gray-400">© 2025 MarketScout Inc. Bảo lưu mọi quyền.</p>
          <div className="flex items-center gap-4">
            {["Điều khoản", "Riêng tư", "Enterprise SLA"].map((link) => (
              <a key={link} href="#" className="text-xs text-gray-400 hover:text-gray-600 transition-colors">{link}</a>
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
}

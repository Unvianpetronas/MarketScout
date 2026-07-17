"use client";

import { useState } from "react";
import Link from "next/link";
import { BarChart2, ArrowLeft, MessageSquare, Mail, ChevronDown, ChevronUp, BookOpen, Zap, Shield, AlertTriangle, CreditCard, User } from "lucide-react";
import { useLanguage } from "@/providers/language-provider";

const FAQS = [
  {
    categoryKey: "support.faq.0.category",
    icon: User,
    color: "#0EA5E9",
    items: [
      { qKey: "support.faq.0.0.q", aKey: "support.faq.0.0.a" },
      { qKey: "support.faq.0.1.q", aKey: "support.faq.0.1.a" },
      { qKey: "support.faq.0.2.q", aKey: "support.faq.0.2.a" },
    ],
  },
  {
    categoryKey: "support.faq.1.category",
    icon: Shield,
    color: "#00D26A",
    items: [
      { qKey: "support.faq.1.0.q", aKey: "support.faq.1.0.a" },
      { qKey: "support.faq.1.1.q", aKey: "support.faq.1.1.a" },
      { qKey: "support.faq.1.2.q", aKey: "support.faq.1.2.a" },
      { qKey: "support.faq.1.3.q", aKey: "support.faq.1.3.a" },
      { qKey: "support.faq.1.4.q", aKey: "support.faq.1.4.a" },
    ],
  },
  {
    categoryKey: "support.faq.2.category",
    icon: CreditCard,
    color: "#8B5CF6",
    items: [
      { qKey: "support.faq.2.0.q", aKey: "support.faq.2.0.a" },
      { qKey: "support.faq.2.1.q", aKey: "support.faq.2.1.a" },
      { qKey: "support.faq.2.2.q", aKey: "support.faq.2.2.a" },
      { qKey: "support.faq.2.3.q", aKey: "support.faq.2.3.a" },
    ],
  },
  {
    categoryKey: "support.faq.3.category",
    icon: Zap,
    color: "#F59E0B",
    items: [
      { qKey: "support.faq.3.0.q", aKey: "support.faq.3.0.a" },
      { qKey: "support.faq.3.1.q", aKey: "support.faq.3.1.a" },
      { qKey: "support.faq.3.2.q", aKey: "support.faq.3.2.a" },
    ],
  },
  {
    categoryKey: "support.faq.4.category",
    icon: AlertTriangle,
    color: "#EF4444",
    items: [
      { qKey: "support.faq.4.0.q", aKey: "support.faq.4.0.a" },
      { qKey: "support.faq.4.1.q", aKey: "support.faq.4.1.a" },
    ],
  },
];

function FAQItem({ qKey, aKey }: { qKey: string; aKey: string }) {
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-gray-100 last:border-0">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between py-4 text-left gap-3"
      >
        <span className="text-sm font-semibold text-gray-800">{t(qKey)}</span>
        {open ? (
          <ChevronUp className="w-4 h-4 text-gray-400 shrink-0" />
        ) : (
          <ChevronDown className="w-4 h-4 text-gray-400 shrink-0" />
        )}
      </button>
      {open && (
        <p className="text-sm text-gray-600 leading-relaxed pb-4">{t(aKey)}</p>
      )}
    </div>
  );
}

export default function SupportDeskPage() {
  const { t } = useLanguage();
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
          {t("support.backLink")}
        </Link>
      </nav>

      {/* Header */}
      <div className="bg-gradient-to-br from-[#0A1A12] to-[#0D2218] py-16">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <div className="w-12 h-12 rounded-2xl bg-[#00D26A]/15 flex items-center justify-center mx-auto mb-4">
            <MessageSquare className="w-6 h-6 text-[#00D26A]" />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-3">{t("support.heroTitle")}</h1>
          <p className="text-gray-400 text-base max-w-xl mx-auto">
            {t("support.heroSubtitle")}
          </p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-12 space-y-10">

        {/* Contact channels */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <a
            href="mailto:unviantruong26@gmail.com"
            className="flex items-start gap-4 bg-white border border-gray-100 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow group"
          >
            <div className="w-10 h-10 rounded-xl bg-[#E6F9F0] flex items-center justify-center shrink-0 group-hover:bg-[#00D26A] transition-colors">
              <Mail className="w-5 h-5 text-[#00A859] group-hover:text-white transition-colors" />
            </div>
            <div>
              <p className="font-bold text-gray-900 text-sm mb-1">{t("support.emailUsLabel")}</p>
              <p className="text-xs text-gray-500">unviantruong26@gmail.com</p>
              <p className="text-xs text-gray-400 mt-1">{t("support.emailResponseTime")}</p>
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
              <p className="font-bold text-white text-sm mb-1">{t("support.chatWithAiLabel")}</p>
              <p className="text-xs text-gray-400">{t("support.chatWithAiDesc")}</p>
              <p className="text-xs text-[#5FD48A] mt-1">{t("support.chatWithAiInstant")}</p>
            </div>
          </Link>
        </div>

        {/* Quick links */}
        <div className="bg-gray-50 rounded-2xl p-6">
          <h2 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-[#00A859]" />
            {t("support.usefulDocsTitle")}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Link href="/methodology" className="flex items-center gap-2.5 bg-white rounded-xl p-3.5 border border-gray-100 hover:border-[#00D26A] hover:bg-[#E6F9F0] transition-all text-sm font-medium text-gray-700 hover:text-[#00843F]">
              <Shield className="w-4 h-4 text-[#00A859] shrink-0" />
              {t("support.linkMethodology")}
            </Link>
            <Link href="/pricing" className="flex items-center gap-2.5 bg-white rounded-xl p-3.5 border border-gray-100 hover:border-[#00D26A] hover:bg-[#E6F9F0] transition-all text-sm font-medium text-gray-700 hover:text-[#00843F]">
              <CreditCard className="w-4 h-4 text-[#00A859] shrink-0" />
              {t("support.linkPricing")}
            </Link>
            <Link href="/privacy-policy" className="flex items-center gap-2.5 bg-white rounded-xl p-3.5 border border-gray-100 hover:border-[#00D26A] hover:bg-[#E6F9F0] transition-all text-sm font-medium text-gray-700 hover:text-[#00843F]">
              <AlertTriangle className="w-4 h-4 text-[#00A859] shrink-0" />
              {t("support.linkPrivacy")}
            </Link>
          </div>
        </div>

        {/* FAQ */}
        <div>
          <h2 className="text-xl font-bold text-gray-900 mb-6">{t("support.faqTitle")}</h2>
          <div className="space-y-4">
            {FAQS.map((category) => {
              const Icon = category.icon;
              return (
                <div key={category.categoryKey} className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
                  <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-50"
                    style={{ backgroundColor: `${category.color}08` }}>
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                      style={{ backgroundColor: `${category.color}15` }}>
                      <Icon className="w-4 h-4" style={{ color: category.color }} />
                    </div>
                    <h3 className="text-sm font-bold text-gray-900">{t(category.categoryKey)}</h3>
                  </div>
                  <div className="px-5">
                    {category.items.map((item) => (
                      <FAQItem key={item.qKey} qKey={item.qKey} aKey={item.aKey} />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Bottom CTA */}
        <div className="bg-gradient-to-br from-[#0A1A12] to-[#0D2218] rounded-2xl p-8 text-center">
          <h3 className="text-white font-bold text-lg mb-2">{t("support.stillNeedHelpTitle")}</h3>
          <p className="text-gray-400 text-sm mb-6 max-w-md mx-auto">
            {t("support.stillNeedHelpDesc")}
          </p>
          <a
            href="mailto:unviantruong26@gmail.com"
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-[#00D26A] text-white font-semibold rounded-xl hover:bg-[#00B85D] transition-colors text-sm"
          >
            <Mail className="w-4 h-4" />
            {t("support.sendSupportEmail")}
          </a>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-gray-100 py-8 text-center text-sm text-gray-400">
        <p>&copy; {new Date().getFullYear()} {t("support.footerCredit")}</p>
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

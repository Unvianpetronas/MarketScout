"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDown, ChevronUp, Check, X } from "lucide-react";

const plans = [
  {
    id: "free",
    name: "Free",
    tagline: "Get started with basic intelligence.",
    monthly: null as number | null,
    yearly: null as number | null,
    isFree: true,
    isRecommended: false,
    queries: "3 Deep Verify/month",
    cta: "Get Started Free",
    href: "/register",
    cardBg: "bg-[#111827] border-white/10",
    ctaStyle: "border border-white/20 text-white hover:bg-white/5",
    features: [
      { label: "3 verifications/month", included: true },
      { label: "Basic entity search", included: true },
      { label: "Quick scan only", included: true },
      { label: "Email support", included: true },
      { label: "Deep verification", included: false },
      { label: "API access", included: false },
    ],
  },
  {
    id: "starter",
    name: "Starter",
    tagline: "For small businesses with regular needs.",
    monthly: 2000000,
    yearly: 1600000,
    isFree: false,
    isRecommended: false,
    queries: "15 Verify/month",
    cta: "Choose Starter",
    href: "/checkout?plan=starter",
    cardBg: "bg-[#111827] border-white/10",
    ctaStyle: "border border-yellow-600/50 text-yellow-500 hover:bg-yellow-900/20",
    features: [
      { label: "15 verifications/month", included: true },
      { label: "Deep verification", included: true },
      { label: "8-pillar analysis", included: true },
      { label: "AI chat copilot", included: true },
      { label: "PDF reports", included: true },
      { label: "API access", included: false },
    ],
  },
  {
    id: "pro",
    name: "Pro",
    tagline: "For growing businesses requiring full intelligence.",
    monthly: 5000000,
    yearly: 4000000,
    isFree: false,
    isRecommended: true,
    queries: "50 Verify/month",
    cta: "Upgrade to Pro",
    href: "/checkout?plan=pro",
    cardBg: "bg-[#0D1F14] border-[#00D26A]",
    ctaStyle: "bg-[#00D26A] text-black hover:bg-[#00b85d] font-bold",
    features: [
      { label: "50 verifications/month", included: true },
      { label: "All Starter features", included: true },
      { label: "Real-time monitoring", included: true },
      { label: "Bulk verification", included: true },
      { label: "API access", included: true },
      { label: "Dedicated account manager", included: true },
    ],
  },
  {
    id: "enterprise",
    name: "Enterprise",
    tagline: "Custom solutions for large organizations.",
    monthly: null,
    yearly: null,
    isFree: false,
    isRecommended: false,
    isCustom: true,
    queries: "Unlimited",
    cta: "Contact Sales",
    href: "mailto:sales@marketscout.vn",
    cardBg: "bg-[#111827] border-white/10",
    ctaStyle: "border border-white/20 text-white hover:bg-white/5",
    features: [
      { label: "Unlimited verifications", included: true },
      { label: "All Pro features", included: true },
      { label: "Custom SLA", included: true },
      { label: "On-premise option", included: true },
      { label: "White-label reports", included: true },
      { label: "SSO integration", included: true },
    ],
  },
];

const compareRows = [
  { feature: "Monthly Verifications", free: "3", starter: "15", pro: "50", enterprise: "Unlimited" },
  { feature: "Deep Verification", free: false, starter: true, pro: true, enterprise: true },
  { feature: "8-Pillar Analysis", free: false, starter: true, pro: true, enterprise: true },
  { feature: "AI Chat Copilot", free: false, starter: true, pro: true, enterprise: true },
  { feature: "API Access", free: false, starter: false, pro: true, enterprise: true },
  { feature: "Bulk Verification", free: false, starter: false, pro: true, enterprise: true },
  { feature: "Custom Integrations", free: false, starter: false, pro: false, enterprise: true },
];

const faqs = [
  {
    q: "How does the query quota work?",
    a: "Each verification request counts as one query. Quota resets at the beginning of each billing cycle. Unused quota purchased via top-up never expires.",
  },
  {
    q: "Can I upgrade or downgrade my plan?",
    a: "Yes. Upgrades take effect immediately, downgrades at the next billing cycle. You can manage your plan from your account dashboard.",
  },
  {
    q: "Is there a refund policy?",
    a: "We offer a 100% refund within 7 days of purchase if you are not satisfied with our service.",
  },
];

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-white/10">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center justify-between w-full py-5 text-left"
      >
        <span className="text-sm font-semibold text-white">{q}</span>
        {open ? <ChevronUp className="w-4 h-4 text-gray-400 shrink-0" /> : <ChevronDown className="w-4 h-4 text-gray-400 shrink-0" />}
      </button>
      {open && <p className="text-sm text-gray-400 pb-5 leading-relaxed">{a}</p>}
    </div>
  );
}

export default function PricingPage() {
  const [billing, setBilling] = useState<"monthly" | "yearly">("monthly");

  const formatPrice = (price: number | null | undefined) => {
    if (price === null || price === undefined) return null;
    return price.toLocaleString("vi-VN");
  };

  return (
    <div className="min-h-screen bg-[#0A0E1A]">
      {/* NAV */}
      <nav className="bg-[#0A0E1A] border-b border-white/10 flex items-center justify-between px-8 py-4">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded bg-yellow-500/90 flex items-center justify-center">
            <span className="text-black font-bold text-sm">M</span>
          </div>
          <span className="font-bold text-white">MarketScout</span>
        </Link>

        <div className="hidden md:flex items-center gap-8">
          {["Features", "Pricing", "Quota Policy", "FAQ"].map((item) => (
            <a
              key={item}
              href="#"
              className={`text-sm transition-colors ${
                item === "Pricing"
                  ? "text-[#00D26A] border-b border-[#00D26A] pb-0.5 font-medium"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              {item}
            </a>
          ))}
        </div>

        <Link
          href="/login"
          className="px-4 py-2 border border-white/20 text-white text-sm font-medium rounded-lg hover:bg-white/5 transition-colors"
        >
          Sign In
        </Link>
      </nav>

      <main className="max-w-6xl mx-auto px-4 sm:px-6">
        {/* HERO */}
        <div className="text-center py-16">
          <div className="inline-block mb-6">
            <span className="text-xs font-semibold tracking-widest text-[#00D26A] uppercase border border-[#2A5A3A] rounded-full px-3 py-1">
              Flexible Plans for Modern Intel
            </span>
          </div>
          <h1 className="text-5xl font-bold text-white mb-2">Predictable pricing,</h1>
          <h1 className="text-5xl font-bold mb-6">
            <span className="bg-gradient-to-r from-[#00D26A] to-[#00A854] bg-clip-text text-transparent">
              unrivaled intelligence.
            </span>
          </h1>
          <p className="text-gray-400 max-w-lg mx-auto text-base">
            Choose a plan that fits your verification needs. All plans include our core 8-pillar intelligence framework.
          </p>

          {/* Billing toggle */}
          <div className="flex items-center justify-center gap-3 mt-8">
            <span className={`text-sm ${billing === "monthly" ? "text-white font-medium" : "text-gray-500"}`}>Monthly Billing</span>
            <button
              onClick={() => setBilling(billing === "monthly" ? "yearly" : "monthly")}
              className={`relative w-12 h-6 rounded-full transition-colors ${billing === "yearly" ? "bg-[#00D26A]" : "bg-white/20"}`}
            >
              <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${billing === "yearly" ? "translate-x-7" : "translate-x-1"}`} />
            </button>
            <span className={`text-sm ${billing === "yearly" ? "text-white font-medium" : "text-gray-500"}`}>
              Yearly Billing
              <span className="ml-1.5 text-xs text-[#00D26A] font-semibold bg-[#00D26A]/10 px-1.5 py-0.5 rounded">Save 20%</span>
            </span>
          </div>
        </div>

        {/* PLAN CARDS */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-16">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className={`relative rounded-2xl border p-6 flex flex-col ${plan.cardBg}`}
            >
              {plan.isRecommended && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                  <span className="bg-[#00D26A] text-black text-xs font-bold px-3 py-1 rounded-full">
                    ★ RECOMMENDED
                  </span>
                </div>
              )}

              <div className="mb-4">
                <p className="text-xs uppercase tracking-wider text-gray-400 font-semibold mb-1">{plan.name}</p>
                <p className="text-xs text-gray-500 leading-relaxed">{plan.tagline}</p>
              </div>

              <div className="mb-5">
                {plan.isFree ? (
                  <div>
                    <span className="text-3xl font-bold text-white">$0</span>
                    <span className="text-gray-400 text-sm">/month</span>
                  </div>
                ) : (plan as { isCustom?: boolean }).isCustom ? (
                  <span className="text-2xl font-bold text-white">Custom / tailored pricing</span>
                ) : (
                  <div>
                    <span className="text-3xl font-bold text-white">
                      {formatPrice(plan[billing] as number | null)}
                    </span>
                    <span className="text-gray-400 text-sm ml-1">VND/mo</span>
                  </div>
                )}
                <p className="text-xs text-[#00D26A] font-medium mt-1">{plan.queries}</p>
              </div>

              <ul className="space-y-2.5 mb-6 flex-1">
                {plan.features.map((f) => (
                  <li key={f.label} className="flex items-start gap-2 text-sm">
                    {f.included ? (
                      <Check className="w-4 h-4 text-[#00D26A] shrink-0 mt-0.5" />
                    ) : (
                      <X className="w-4 h-4 text-gray-600 shrink-0 mt-0.5" />
                    )}
                    <span className={f.included ? "text-gray-300" : "text-gray-600"}>{f.label}</span>
                  </li>
                ))}
              </ul>

              <Link
                href={plan.href}
                className={`block text-center py-2.5 rounded-lg text-sm transition-colors ${plan.ctaStyle}`}
              >
                {plan.cta}
              </Link>
            </div>
          ))}
        </div>

        {/* COMPARE TABLE */}
        <div className="bg-[#111827] rounded-2xl border border-white/10 max-w-4xl mx-auto mb-16 overflow-hidden">
          <div className="p-6 border-b border-white/10">
            <h2 className="text-xl font-bold text-white text-center">Compare Deep-Checks</h2>
          </div>
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left px-6 py-4 text-sm text-gray-400 font-semibold">Core Target Criteria</th>
                {["Free", "Starter", "Pro (Recommended)", "Enterprise"].map((p, i) => (
                  <th key={p} className={`px-4 py-4 text-sm font-bold text-center ${i === 2 ? "text-[#00D26A]" : "text-white"}`}>
                    {p}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {compareRows.map((row, i) => (
                <tr key={row.feature} className={`border-b border-white/5 ${i % 2 === 0 ? "" : "bg-white/2"}`}>
                  <td className="px-6 py-3.5 text-sm text-gray-400">{row.feature}</td>
                  {[row.free, row.starter, row.pro, row.enterprise].map((val, j) => (
                    <td key={j} className={`px-4 py-3.5 text-sm text-center ${j === 2 ? "bg-[#00D26A]/5" : ""}`}>
                      {typeof val === "boolean" ? (
                        val ? (
                          <Check className="w-4 h-4 text-[#00D26A] mx-auto" />
                        ) : (
                          <X className="w-4 h-4 text-gray-600 mx-auto" />
                        )
                      ) : (
                        <span className="text-white font-medium">{val}</span>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* QUOTA MANAGEMENT */}
        <div className="bg-[#0D1F14] rounded-2xl border border-[#00D26A]/20 p-8 max-w-4xl mx-auto mb-16">
          <div className="mb-4">
            <span className="text-xs text-[#00D26A] font-semibold uppercase tracking-widest border border-[#2A5A3A] rounded-full px-3 py-1">
              Policy Transparency
            </span>
          </div>
          <h2 className="text-2xl font-bold text-white mb-6">Quota Management & Rolling Credits</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="bg-[#0A1A0F] rounded-xl border border-[#1A4A2A] p-5">
              <h3 className="text-[#00D26A] text-sm font-semibold mb-2">Unused Quota Rollover</h3>
              <p className="text-gray-400 text-sm leading-relaxed">
                Quota purchased via top-up packages never expires. Monthly plan quota resets at the start of each billing cycle, but additional purchased credits roll over indefinitely.
              </p>
            </div>
            <div className="bg-[#0A1A0F] rounded-xl border border-[#1A4A2A] p-5">
              <h3 className="text-[#00D26A] text-sm font-semibold mb-2">Pro-Rata Plan Upgrades</h3>
              <p className="text-gray-400 text-sm leading-relaxed">
                When you upgrade mid-cycle, you&apos;re charged a pro-rata amount for the remainder of the period and immediately unlock all features of the new plan.
              </p>
            </div>
          </div>
        </div>

        {/* FAQ */}
        <div className="max-w-2xl mx-auto mb-16">
          <h2 className="text-2xl font-bold text-white text-center mb-8">Got Questions? We&apos;ve Got Answers.</h2>
          <div>
            {faqs.map((faq, i) => (
              <FaqItem key={i} q={faq.q} a={faq.a} />
            ))}
          </div>
        </div>

        {/* FOOTER */}
        <div className="border-t border-white/10 pt-8 pb-16">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 bg-white/5 border border-white/10 rounded-lg px-3 py-1.5">
                <span className="text-green-400 text-xs">🔒</span>
                <span className="text-gray-400 text-xs">Encrypted Checkout</span>
              </div>
              <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-lg px-3 py-1.5">
                <span className="text-xs text-gray-400 font-mono">MoMo</span>
                <span className="text-xs text-blue-400 font-bold">VISA</span>
                <span className="text-xs text-gray-400">FastID</span>
              </div>
            </div>
            <p className="text-gray-500 text-sm">
              &copy; {new Date().getFullYear()} MarketScout Intelligence Suite. All rights reserved.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}

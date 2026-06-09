"use client";

import { use } from "react";
import Link from "next/link";
import { Navigation, Bell, ExternalLink, CheckCircle2, AlertCircle, Zap, Lock, ChevronRight } from "lucide-react";

interface IntelPageProps {
  params: Promise<{ id: string }>;
}

const MOCK_ENTITY = {
  id: "VSP-984021",
  initials: "VSP",
  name: "Vespera Synthetics Ltd.",
  description: "Specialty chemicals and biotech intermediates manufacturer registered in the EU. Active in B2B pharmaceutical supply chains across Europe and Southeast Asia.",
  taxId: "TX-984021-X9",
  lei: "549300VSP8Y7R2P10148",
  healthScore: 9.4,
  legalStructure: "Private Limited Company (Ltd.)",
  incorporation: "February 11, 2013",
  address: "14 Innovationsweg, Frankfurt am Main, Germany, 60313",
  ceo: "Dr. Maximilian Roth",
  shareCapital: "EUR 2,500,000",
  domain: "vesperasynthetics.eu",
  domainAge: "11 Years, 4m",
  domainAuthority: "68/100 High rep",
  webInfrastructure: "Secure, TLS 1.3",
  quotaRemaining: 42,
};

const REGULATORY_APPROVALS = [
  { name: "REACH Compliance Certificate", number: "REACH-EU-2024-0921", status: "Active", date: "Valid until 2026", pass: true },
  { name: "ISO 9001:2015 Quality Management", number: "ISO-9001-DE-2024", status: "Active", date: "Renewed Sep 2024", pass: true },
  { name: "EU Import/Export License", number: "EORI-DE9302841X", status: "Awaiting Renewal", date: "Expires Dec 2024", pass: false },
];

const AUDIT_HISTORY = [
  { date: "Oct 24, 2024 — 14:32 UTC", event: "Deep Verification Completed", note: "Full 8-pillar analysis passed" },
  { date: "Sep 18, 2024 — 09:15 UTC", event: "Registry Sync Updated", note: "EU trade registry synced" },
  { date: "Aug 02, 2024 — 17:01 UTC", event: "Initial Profile Created", note: "Entity added to MarketScout database" },
];

export default function IntelligencePage({ params }: IntelPageProps) {
  const { id } = use(params);

  return (
    <div className="min-h-screen bg-[#080F0A]">
      {/* NAV */}
      <nav className="bg-[#0A1A12] border-b border-white/10 flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#1A3A28] flex items-center justify-center">
              <Navigation className="w-4 h-4 text-[#00D26A]" />
            </div>
            <span className="text-[#00D26A] font-bold text-sm tracking-wider">MARKETSCOUT</span>
          </div>
          <div className="hidden md:flex items-center gap-6 ml-4">
            {[
              { label: "DASHBOARD", active: false },
              { label: "INTELLIGENCE HUB", active: true },
              { label: "PRICING", active: false },
            ].map((link) => (
              <a
                key={link.label}
                href="#"
                className={`text-xs font-semibold transition-colors ${
                  link.active
                    ? "text-white border-b border-[#00D26A] pb-0.5"
                    : "text-gray-500 hover:text-gray-300"
                }`}
              >
                {link.label}
              </a>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 bg-[#00D26A]/10 border border-[#00D26A]/20 rounded-full px-3 py-1 text-xs text-[#00D26A] font-semibold">
            ● Quota: {MOCK_ENTITY.quotaRemaining} Active
          </div>
          <button className="w-7 h-7 rounded-full hover:bg-white/5 flex items-center justify-center text-gray-400">
            <Bell className="w-4 h-4" />
          </button>
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#00D26A] to-[#009A50] flex items-center justify-center text-black text-xs font-bold">
            U
          </div>
        </div>
      </nav>

      {/* Breadcrumb */}
      <div className="px-6 py-3 border-b border-white/5">
        <p className="text-xs text-gray-500">
          Database{" "}
          <ChevronRight className="w-3 h-3 inline" />{" "}
          Chemicals &amp; Biotech{" "}
          <ChevronRight className="w-3 h-3 inline" />{" "}
          <span className="text-gray-300">Vespera Synthetics Ltd.</span>
        </p>
      </div>

      {/* Main 2-col layout */}
      <div className="grid grid-cols-3 gap-5 p-6 max-w-7xl mx-auto">
        {/* LEFT — col-span-2 */}
        <div className="col-span-2 space-y-4">
          {/* Header card */}
          <div className="bg-[#0D1A12] rounded-xl border border-[#1A3A28] p-6">
            <div className="flex items-start gap-5">
              {/* Avatar */}
              <div className="w-14 h-14 rounded-lg bg-[#1A3A28] flex items-center justify-center text-[#00D26A] font-bold text-xl shrink-0">
                {MOCK_ENTITY.initials}
              </div>

              {/* Details */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-1">
                  <h1 className="text-2xl font-bold text-white">{MOCK_ENTITY.name}</h1>
                  <span className="flex items-center gap-1 bg-[#00D26A]/10 border border-[#00D26A]/20 text-[#00D26A] text-xs font-semibold px-2 py-0.5 rounded-full">
                    ● VERIFIED PROFILE
                  </span>
                </div>
                <p className="text-[#7A9A86] text-sm mb-3 leading-relaxed">{MOCK_ENTITY.description}</p>
                <div className="flex flex-wrap gap-4 text-xs">
                  <div>
                    <span className="text-gray-500">Tax ID: </span>
                    <span className="text-[#00D26A] font-mono font-semibold">{MOCK_ENTITY.taxId}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">LEI: </span>
                    <span className="text-[#00D26A] font-mono font-semibold">{MOCK_ENTITY.lei}</span>
                  </div>
                </div>
              </div>

              {/* Data Health Score */}
              <div className="shrink-0 text-right">
                <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Data Health Score</p>
                <p className="text-3xl font-bold text-white">
                  {MOCK_ENTITY.healthScore} <span className="text-sm text-gray-500">/ 10</span>
                </p>
                <div className="flex gap-1 mt-1 justify-end">
                  {Array.from({ length: 10 }).map((_, i) => (
                    <div
                      key={i}
                      className={`w-2 h-3 rounded-sm ${i < Math.floor(MOCK_ENTITY.healthScore) ? "bg-[#00D26A]" : "bg-[#1A3A28]"}`}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Corporate Identity */}
          <div className="bg-[#0D1A12] rounded-xl border border-[#1A3A28] p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xs font-bold text-[#5FD48A] uppercase tracking-widest flex items-center gap-1.5">
                ⚙ Corporate Identity
              </h2>
              <span className="text-[10px] text-[#00D26A] bg-[#00D26A]/10 border border-[#00D26A]/20 rounded px-2 py-0.5 font-semibold">
                Registry Sync: Live
              </span>
            </div>

            <div className="grid grid-cols-2 gap-5">
              {[
                { label: "Legal Structure", value: MOCK_ENTITY.legalStructure },
                { label: "Date of Incorporation", value: MOCK_ENTITY.incorporation },
                { label: "Registered Address", value: MOCK_ENTITY.address },
                { label: "Legal Representative / CEO", value: MOCK_ENTITY.ceo },
                { label: "Share Capital", value: MOCK_ENTITY.shareCapital },
              ].map((row) => (
                <div key={row.label}>
                  <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-0.5">{row.label}</p>
                  <p className="text-sm text-white">{row.value}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Digital Footprint */}
          <div className="bg-[#0D1A12] rounded-xl border border-[#1A3A28] p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xs font-bold text-[#5FD48A] uppercase tracking-widest">🌐 Digital Footprint</h2>
              <span className="text-[10px] text-[#00D26A] bg-[#00D26A]/10 border border-[#00D26A]/20 rounded px-2 py-0.5 font-semibold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[#00D26A]" />
                Index Status: Active
              </span>
            </div>

            {/* 3 metrics */}
            <div className="grid grid-cols-3 gap-4 mb-4">
              {[
                { label: "Domain Age", value: MOCK_ENTITY.domainAge },
                { label: "Domain Authority", value: MOCK_ENTITY.domainAuthority },
                { label: "Web Infrastructure", value: MOCK_ENTITY.webInfrastructure },
              ].map((m) => (
                <div key={m.label} className="bg-[#0A1A0F] rounded-lg p-3 border border-[#1A3A28]">
                  <p className="text-[10px] text-gray-500 uppercase mb-1">{m.label}</p>
                  <p className="text-sm text-white font-semibold">{m.value}</p>
                </div>
              ))}
            </div>

            <p className="text-xs text-[#7A9A86] mb-3 leading-relaxed">
              Domain registered in 2013, with consistent uptime and a strong backlink profile. HTTPS enforced with HSTS headers enabled.
            </p>

            <div className="flex gap-3">
              <a
                href={`https://${MOCK_ENTITY.domain}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-xs text-[#00D26A] hover:underline font-medium"
              >
                {MOCK_ENTITY.domain}
                <ExternalLink className="w-3 h-3" />
              </a>
              <a href="#" className="flex items-center gap-1.5 text-xs text-blue-400 hover:underline font-medium">
                LinkedIn Profile
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>

          {/* Regulatory Approvals */}
          <div className="bg-[#0D1A12] rounded-xl border border-[#1A3A28] p-5">
            <h2 className="text-xs font-bold text-[#5FD48A] uppercase tracking-widest mb-4">📋 Regulatory Approvals</h2>

            <div className="space-y-3">
              {REGULATORY_APPROVALS.map((item) => (
                <div key={item.name} className="flex items-center justify-between py-3 border-b border-[#1A3A28] last:border-0">
                  <div className="flex items-start gap-3">
                    {item.pass ? (
                      <CheckCircle2 className="w-4 h-4 text-[#00D26A] mt-0.5 shrink-0" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-yellow-500 mt-0.5 shrink-0" />
                    )}
                    <div>
                      <p className="text-sm text-white font-medium">{item.name}</p>
                      <p className="text-xs text-gray-500 font-mono">{item.number}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded ${
                      item.pass
                        ? "bg-[#00D26A]/10 text-[#00D26A]"
                        : "bg-yellow-900/30 text-yellow-500"
                    }`}>
                      {item.status}
                    </span>
                    <p className="text-[10px] text-gray-500 mt-0.5">{item.date}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* RIGHT — col-span-1 */}
        <div className="space-y-4">
          {/* Premium Intelligence CTA */}
          <div className="bg-[#0D1A12] rounded-xl border border-[#1A3A28] p-5">
            <p className="text-[10px] font-bold text-[#5FD48A] uppercase tracking-widest mb-2">Premium Intelligence</p>
            <h3 className="text-lg font-bold text-white mb-2">Execute Deep Verification Audit</h3>
            <p className="text-gray-400 text-sm mb-4 leading-relaxed">
              Run a full 8-pillar intelligence audit including sanctions, legal disputes, financials, and executive background checks.
            </p>

            <div className="bg-[#0A1A0F] rounded-lg p-3 border border-[#1A3A28] mb-4">
              <div className="flex justify-between text-xs mb-1">
                <span className="text-gray-400">Resource Allocation</span>
                <span className="text-white font-semibold">1 Quota Unit</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-gray-400">Current Available</span>
                <span className="text-[#00D26A] font-semibold">{MOCK_ENTITY.quotaRemaining}</span>
              </div>
              <div className="flex justify-between text-xs mt-1">
                <span className="text-gray-400">Remaining After</span>
                <span className="text-gray-300">{MOCK_ENTITY.quotaRemaining - 1}</span>
              </div>
            </div>

            <button className="w-full py-3 bg-[#00D26A] text-black font-bold rounded-lg hover:bg-[#00b85d] transition-colors flex items-center justify-center gap-2 text-sm">
              <Zap className="w-4 h-4" />
              TRIGGER DEEP VERIFICATION
            </button>

            <p className="text-xs text-gray-500 text-center mt-3 flex items-center justify-center gap-1">
              <Lock className="w-3 h-3" />
              Encrypted via end-to-end TLS
            </p>
          </div>

          {/* Intelligence Radar */}
          <div className="bg-[#0D1A12] rounded-xl border border-[#1A3A28] p-5">
            <h3 className="text-xs font-bold text-[#5FD48A] uppercase tracking-widest mb-4">Intelligence Radar</h3>
            <div className="space-y-3">
              {[
                { label: "Legal Disputes", value: "0 Flagged", color: "text-[#00D26A]", icon: "✓" },
                { label: "PEP/Sanctions Check", value: "Clear", color: "text-[#00D26A]", icon: "+" },
                { label: "Subsidiaries", value: "3 Active", color: "text-blue-400", icon: "◆" },
                { label: "Credit Risk", value: "AA+ Rating", color: "text-[#00D26A]", icon: "★" },
              ].map((row) => (
                <div key={row.label} className="flex items-center justify-between py-2 border-b border-[#1A3A28]/50 last:border-0">
                  <span className="text-xs text-gray-400">{row.label}</span>
                  <span className={`text-xs font-semibold ${row.color}`}>
                    {row.icon} {row.value}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Audit History */}
          <div className="bg-[#0D1A12] rounded-xl border border-[#1A3A28] p-5">
            <h3 className="text-xs font-bold text-[#5FD48A] uppercase tracking-widest mb-4">Audit History</h3>
            <div className="space-y-3">
              {AUDIT_HISTORY.map((item) => (
                <div key={item.date} className="flex items-start gap-2">
                  <div className="w-5 h-5 rounded-full bg-[#00D26A]/10 border border-[#00D26A]/20 flex items-center justify-center shrink-0 mt-0.5">
                    <CheckCircle2 className="w-3 h-3 text-[#00D26A]" />
                  </div>
                  <div>
                    <p className="text-xs text-white font-medium">{item.event}</p>
                    <p className="text-[10px] text-gray-500">{item.date}</p>
                    <p className="text-[10px] text-[#7A9A86]">{item.note}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-white/5 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs text-gray-500">
          <span className="w-1.5 h-1.5 rounded-full bg-[#00D26A]" />
          MarketScout Technical Intelligence Engine | Entity ID: {id}
        </div>
        <div className="flex gap-4">
          {["Privacy Policy", "Terms of Service", "API Documentation"].map((link) => (
            <a key={link} href="#" className="text-xs text-gray-500 hover:text-gray-300 transition-colors">
              {link}
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}

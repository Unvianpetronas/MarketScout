"use client";

import { use } from "react";
import Link from "next/link";
import { ExternalLink, AlertTriangle, ChevronUp } from "lucide-react";

interface CompanyPageProps {
  params: Promise<{ id: string }>;
}

const MOCK_COMPANY = {
  name: "VIGOR GLOBAL TRADING CO., LTD.",
  taxCode: "0312847291",
  established: "March 14, 2018",
  headquarters: "Ho Chi Minh City, Vietnam",
  riskScore: 82,
  riskLabel: "LOW-MEDIUM RISK",
  status: "ACTIVE / ĐANG HOẠT ĐỘNG",
  domain: "vigorglobal.vn",
  domainAge: "6 years, 2 months",
  sslCertificate: "Valid (Let's Encrypt)",
  customsShipments: 342,
  primaryHsCode: "8517.13",
};

function RiskGauge({ score }: { score: number }) {
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const strokeDash = (score / 100) * circumference;
  const strokeColor = score >= 70 ? "#EAB308" : score >= 40 ? "#F97316" : "#EF4444";

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-28 h-28">
        <svg className="w-28 h-28 -rotate-90" viewBox="0 0 128 128">
          <circle cx="64" cy="64" r={radius} fill="none" stroke="#2A2A2A" strokeWidth="8" />
          <circle
            cx="64"
            cy="64"
            r={radius}
            fill="none"
            stroke={strokeColor}
            strokeWidth="8"
            strokeDasharray={`${strokeDash} ${circumference}`}
            strokeLinecap="round"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-bold text-white">{score}</span>
          <span className="text-[10px] text-gray-400">/100</span>
        </div>
      </div>
      <p className="text-xs text-yellow-400 font-semibold mt-2 uppercase tracking-wider">{MOCK_COMPANY.riskLabel}</p>
    </div>
  );
}

export default function CompanyPage({ params }: CompanyPageProps) {
  const { id } = use(params);

  return (
    <div className="min-h-screen bg-[#0D0D0D]">
      {/* NAV */}
      <nav className="bg-[#111] border-b border-white/5 flex items-center justify-between px-6 py-3">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded bg-yellow-500/90 flex items-center justify-center">
            <span className="text-black font-bold text-xs">M</span>
          </div>
          <div>
            <span className="text-white font-bold text-sm uppercase tracking-wider">MARKETSCOUT</span>
            <span className="text-gray-400 text-xs ml-2">ENTERPRISE INTELLIGENCE</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-gray-400 text-xs">FREE DEMO PLAN | 1/3 Queries Left</span>
          <div className="bg-[#1A2035] border border-white/10 rounded-lg px-2.5 py-1 text-xs text-yellow-400 font-semibold">
            🔋 Credits: 1/3
          </div>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto p-6">
        {/* Header card */}
        <div className="bg-[#1A1A1A] rounded-xl border border-white/10 p-6 mb-5">
          <div className="flex items-start justify-between gap-6">
            <div className="flex-1">
              {/* Status badges */}
              <div className="flex gap-2 mb-3">
                <span className="bg-emerald-950 text-emerald-400 border border-emerald-800 rounded-full text-xs px-3 py-1 font-semibold">
                  ● {MOCK_COMPANY.status}
                </span>
                <span className="bg-transparent text-blue-400 border border-blue-800 rounded-full text-xs px-3 py-1 font-semibold">
                  FOREIGN TRADE ENTITY
                </span>
              </div>

              <p className="text-xs text-gray-500 uppercase tracking-widest mb-1 font-semibold">Legal Entity Name</p>
              <h1 className="text-3xl font-bold text-white uppercase mb-4">{MOCK_COMPANY.name}</h1>

              {/* Grid */}
              <div className="grid grid-cols-3 gap-4">
                {[
                  { label: "Tax Code", value: MOCK_COMPANY.taxCode },
                  { label: "Established Date", value: MOCK_COMPANY.established },
                  { label: "Headquarters", value: MOCK_COMPANY.headquarters },
                ].map((item) => (
                  <div key={item.label}>
                    <p className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold mb-0.5">{item.label}</p>
                    <p className="text-sm text-white font-medium">{item.value}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="shrink-0">
              <RiskGauge score={MOCK_COMPANY.riskScore} />
            </div>
          </div>
        </div>

        {/* 3-column grid */}
        <div className="grid grid-cols-3 gap-4 mb-5">
          {/* Compliance Audit */}
          <div className="bg-[#1A1A1A] rounded-xl border border-white/10 p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-white flex items-center gap-1.5">
                🛡 Compliance Audit
              </h3>
              <span className="bg-blue-950 text-blue-400 text-[10px] font-bold px-1.5 py-0.5 rounded">P6 Verification</span>
            </div>

            <div className="space-y-3">
              {[
                { label: "Bank Accounts Verification", status: "VERIFIED", pass: true },
                { label: "AML Sanctions Check", status: "PASSED", pass: true },
                { label: "Regulatory Blacklists", status: "FLAG DETECTED", pass: false },
              ].map((row) => (
                <div key={row.label} className="flex items-center justify-between">
                  <span className="text-xs text-gray-400">{row.label}</span>
                  <span className={`text-xs font-bold ${row.pass ? "text-emerald-400" : "text-red-400"}`}>
                    {row.pass ? "✓ " : "⊗ "}{row.status}
                  </span>
                </div>
              ))}
            </div>

            {/* HARD STOP alert */}
            <div className="bg-red-950 border border-red-800 rounded-lg p-3 mt-4">
              <p className="text-red-400 font-bold text-sm flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4" />
                HARD STOP DETECTED
              </p>
              <p className="text-red-300 text-xs mt-1 leading-relaxed">
                This entity appears on a Tier-2 sanctions watchlist. Manual review required before engagement.
              </p>
              <button className="text-red-400 text-xs hover:underline mt-2 font-medium">
                Inspect Sanction Match →
              </button>
            </div>
          </div>

          {/* Trade Activity */}
          <div className="bg-[#1A1A1A] rounded-xl border border-white/10 p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-white">🚢 Trade Activity</h3>
              <span className="bg-teal-950 text-teal-400 text-[10px] font-bold px-1.5 py-0.5 rounded">Import/Export</span>
            </div>

            <p className="text-xs text-gray-400 mb-4 leading-relaxed">
              Active export/import entity with consistent shipment records across Southeast Asian trade corridors.
            </p>

            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="bg-[#111] rounded-lg p-3">
                <p className="text-[10px] text-gray-500 uppercase mb-0.5">Customs Shipments</p>
                <p className="text-2xl font-bold text-white">{MOCK_COMPANY.customsShipments}</p>
              </div>
              <div className="bg-[#111] rounded-lg p-3">
                <p className="text-[10px] text-gray-500 uppercase mb-0.5">Primary HS Code</p>
                <p className="text-2xl font-bold text-white font-mono">{MOCK_COMPANY.primaryHsCode}</p>
              </div>
            </div>

            <div>
              <p className="text-[10px] text-gray-500 uppercase font-semibold mb-2">Global Trading Distribution</p>
              {[
                { region: "Southeast Asia", pct: 62 },
                { region: "East Asia", pct: 24 },
                { region: "Other", pct: 14 },
              ].map((row) => (
                <div key={row.region} className="mb-2">
                  <div className="flex justify-between text-xs text-gray-400 mb-0.5">
                    <span>{row.region}</span>
                    <span>{row.pct}%</span>
                  </div>
                  <div className="w-full bg-[#2A2A2A] rounded-full h-1.5">
                    <div className="h-1.5 bg-teal-500 rounded-full" style={{ width: `${row.pct}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Digital Footprint */}
          <div className="bg-[#1A1A1A] rounded-xl border border-white/10 p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-white">🌐 Digital Footprint</h3>
              <span className="bg-purple-950 text-purple-400 text-[10px] font-bold px-1.5 py-0.5 rounded">Domain Check</span>
            </div>

            <div className="mb-4">
              <a
                href={`https://${MOCK_COMPANY.domain}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-blue-400 hover:underline text-sm font-medium"
              >
                {MOCK_COMPANY.domain}
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>

            <div className="space-y-3 mb-4">
              {[
                { label: "Domain Age", value: MOCK_COMPANY.domainAge },
                { label: "SSL Certificate", value: MOCK_COMPANY.sslCertificate },
              ].map((row) => (
                <div key={row.label}>
                  <p className="text-[10px] text-gray-500 uppercase">{row.label}</p>
                  <p className="text-sm text-white">{row.value}</p>
                </div>
              ))}
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs bg-blue-950/50 border border-blue-900/30 rounded px-2 py-1.5">
                <span className="w-2 h-2 rounded-full bg-blue-500" />
                <span className="text-blue-300 font-medium">LinkedIn Connected</span>
              </div>
              <div className="flex items-center gap-2 text-xs bg-blue-950/50 border border-blue-900/30 rounded px-2 py-1.5">
                <span className="w-2 h-2 rounded-full bg-blue-600" />
                <span className="text-blue-300 font-medium">Facebook Connected</span>
              </div>
            </div>
          </div>
        </div>

        {/* Deep Verify CTA */}
        <div className="bg-gradient-to-r from-[#1A1A0A] to-[#1A1500] rounded-xl border border-yellow-900/30 p-6 flex items-center justify-between gap-6 mb-6">
          <div className="flex-1">
            <div className="mb-2">
              <span className="text-xs font-bold text-yellow-500 uppercase tracking-wider border border-yellow-800/50 rounded px-2 py-0.5">
                ⚡ PREMIUM INTEGRATION
              </span>
            </div>
            <h2 className="text-xl font-bold text-white mb-1">Unlock Deep Verify Intelligence Report</h2>
            <p className="text-gray-400 text-sm">
              Get full 8-pillar analysis including legal status, financial health, sanctions screening,
              trade history, and executive background checks.
            </p>
            <p className="text-xs text-gray-500 mt-2">
              Your Quota: 1/3 remaining | <Link href="/pricing" className="text-[#00D26A] hover:underline">Upgrade Plan</Link>
            </p>
          </div>
          <div className="shrink-0">
            <button className="px-6 py-3 bg-yellow-500 hover:bg-yellow-400 text-black font-bold rounded-lg transition-colors text-sm">
              Run Deep Verify | Requires 1 Quota
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between text-xs text-gray-600 border-t border-white/5 pt-4">
          <span>MARKETSCOUT &copy; 2024 | Entity ID: {id}</span>
          <span className="text-gray-600 max-w-lg text-right leading-relaxed">
            This report is for informational purposes only and does not constitute legal or financial advice.
          </span>
        </div>
      </main>
    </div>
  );
}

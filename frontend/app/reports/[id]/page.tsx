"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import {
  ArrowLeft, AlertTriangle, Shield, RefreshCw, Globe, ExternalLink,
  CheckCircle2, XCircle, Clock, ChevronRight
} from "lucide-react";
import { toast } from "sonner";
import { AuthGuard } from "@/components/shared/auth-guard";
import { AppNav } from "@/components/layout/nav";
import { getReport } from "@/services/report.service";
import { VerificationReport, PillarResult } from "@/types/report";

interface Props {
  params: Promise<{ id: string }>;
}

function ScoreGauge({ score }: { score: number }) {
  const color = score < 40 ? "#00D26A" : score < 70 ? "#F59E0B" : "#EF4444";
  const label = score < 40 ? "Low Risk" : score < 70 ? "Moderate-High Risk" : "High Risk";
  const circumference = 2 * Math.PI * 54;
  const dashOffset = circumference - (circumference * score) / 100;

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-36 h-36">
        <svg className="w-36 h-36 -rotate-90" viewBox="0 0 120 120">
          <circle cx="60" cy="60" r="54" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="10" />
          <circle
            cx="60" cy="60" r="54"
            fill="none"
            stroke={color}
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            style={{ transition: "stroke-dashoffset 1s ease" }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-bold text-white">{score}</span>
          <span className="text-xs text-gray-400">/100</span>
        </div>
      </div>
      <p className="text-sm font-semibold mt-2" style={{ color }}>{label}</p>
    </div>
  );
}

// Backend stores findings as a JSON-encoded string — parse it or display as-is
function parseFindings(raw: string | undefined): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed.map(String);
    if (typeof parsed === "string") return [parsed];
    return [raw];
  } catch {
    return [raw];
  }
}

function PillarCard({ pillar }: { pillar: PillarResult }) {
  const score = pillar.score ?? 0;
  const color = score < 40 ? "#00D26A" : score < 70 ? "#F59E0B" : "#EF4444";
  const statusBg = score < 40 ? "bg-emerald-900/30 text-emerald-400" :
    score < 70 ? "bg-yellow-900/30 text-yellow-400" : "bg-red-900/30 text-red-400";
  const findings = parseFindings(pillar.findings);

  return (
    <div className="bg-[#1A2035] rounded-xl border border-white/10 p-5">
      <div className="flex items-start justify-between mb-3">
        <div>
          <span className="text-xs text-gray-500 font-mono">PILLAR {pillar.pillarNo}</span>
          <h3 className="text-sm font-semibold text-white mt-0.5">{pillar.pillarName}</h3>
        </div>
        <div className="text-right">
          <div className="text-xl font-bold" style={{ color }}>{score}</div>
          <div className="text-xs text-gray-500">score</div>
        </div>
      </div>

      <div className="w-full bg-white/10 rounded-full h-1.5 mb-3">
        <div
          className="h-1.5 rounded-full transition-all"
          style={{ width: `${score}%`, backgroundColor: color }}
        />
      </div>

      <div className="flex items-center justify-between">
        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${statusBg}`}>
          {pillar.status || (score >= 70 ? "Pass" : score >= 40 ? "Review" : "Alert")}
        </span>
        {pillar.confidence && (
          <span className="text-xs text-gray-500">Confidence: {pillar.confidence}</span>
        )}
      </div>

      {findings.length > 0 && (
        <ul className="mt-3 space-y-1">
          {findings.slice(0, 2).map((finding, i) => (
            <li key={i} className="text-xs text-gray-400 flex items-start gap-1.5">
              <ChevronRight className="w-3 h-3 shrink-0 mt-0.5 text-gray-600" />
              {finding}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function ReportDetailPage({ params }: Props) {
  const { id } = use(params);
  const [report, setReport] = useState<VerificationReport | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRescan, setIsRescan] = useState(false);

  useEffect(() => {
    getReport(id)
      .then(setReport)
      .catch(() => toast.error("Failed to load report."))
      .finally(() => setIsLoading(false));
  }, [id]);

  const handleRescan = async () => {
    setIsRescan(true);
    toast.info("Rescan initiated...");
    setTimeout(() => setIsRescan(false), 2000);
  };

  const pillars = report?.pillars ?? [];

  // dealSafetyAnalysis arrives as a raw JSON string from the backend
  interface DealSafety { warningLabel?: string; recommendation?: string; requiredProtocols?: string[] }
  let dealSafety: DealSafety | null = null;
  if (report?.dealSafetyAnalysis) {
    try {
      dealSafety = JSON.parse(report.dealSafetyAnalysis) as DealSafety;
    } catch {
      dealSafety = { recommendation: report.dealSafetyAnalysis };
    }
  }

  return (
    <AuthGuard>
      <div className="min-h-screen" style={{ backgroundColor: "#0A0E1A" }}>
        <AppNav />

        <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
          {/* Back + header controls */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <Link
                href="/dashboard"
                className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-white transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Dashboard
              </Link>
              <span className="text-gray-600">|</span>
              <span className="text-xs font-mono bg-white/5 text-gray-400 px-2 py-1 rounded">
                Client ID: {id.slice(0, 8).toUpperCase()}
              </span>
              {report?.status === "PROCESSING" && (
                <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-400 bg-emerald-400/10 px-2.5 py-1 rounded-full">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Live Active Scan
                </span>
              )}
            </div>
            <button
              onClick={handleRescan}
              disabled={isRescan}
              className="flex items-center gap-2 px-4 py-2 border border-white/20 text-sm font-medium text-gray-300 rounded-lg hover:bg-white/5 transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${isRescan ? "animate-spin" : ""}`} />
              Force Rescan
            </button>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-24">
              <div className="w-10 h-10 border-2 border-[#00D26A]/30 border-t-[#00D26A] rounded-full animate-spin" />
            </div>
          ) : !report ? (
            <div className="text-center py-24 text-gray-400">Report not found.</div>
          ) : (
            <>
              {/* Company header */}
              <div className="mb-8">
                <h1 className="text-4xl font-bold text-white mb-2">{report.entityName}</h1>
                <div className="flex items-center gap-4 flex-wrap">
                  {report.countryIso2 && (
                    <div className="flex items-center gap-1.5 text-sm text-gray-400">
                      <Globe className="w-4 h-4" />
                      {report.countryIso2}
                    </div>
                  )}
                  {report.taxId && (
                    <span className="text-xs font-mono text-gray-500 bg-white/5 px-2 py-1 rounded">
                      Tax: {report.taxId}
                    </span>
                  )}
                  {report.website && (
                    <a
                      href={report.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-xs text-[#00D26A] hover:underline"
                    >
                      <ExternalLink className="w-3 h-3" />
                      {report.website}
                    </a>
                  )}
                </div>
              </div>

              {/* Score + Deal Safety grid */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                {/* Overall Risk Score */}
                <div className="bg-[#1A2035] rounded-xl border border-white/10 p-6 flex flex-col items-center">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-4">
                    Overall Risk Score
                  </p>
                  <ScoreGauge score={report.overallScore} />
                  <div className="mt-4 flex items-center gap-2">
                    {report.hardStop ? (
                      <span className="flex items-center gap-1.5 text-xs font-bold text-red-400 bg-red-400/10 px-2.5 py-1 rounded-full">
                        <XCircle className="w-3.5 h-3.5" /> Hard Stop
                      </span>
                    ) : (
                      <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-400 bg-emerald-400/10 px-2.5 py-1 rounded-full">
                        <CheckCircle2 className="w-3.5 h-3.5" /> No Hard Stop
                      </span>
                    )}
                  </div>
                </div>

                {/* Deal Safety */}
                <div className="lg:col-span-2 bg-[#1E1B3A] rounded-xl border border-purple-500/30 p-6">
                  <p className="text-xs font-semibold text-purple-400 uppercase tracking-widest mb-3">
                    Deal Safety Recommendation
                  </p>
                  {dealSafety ? (
                    <>
                      <div className="flex items-start gap-3 mb-4">
                        <AlertTriangle className="w-5 h-5 text-yellow-400 shrink-0 mt-0.5" />
                        <div>
                          <p className="text-sm font-bold text-yellow-300 mb-1">
                            {dealSafety.warningLabel || "CẨN THẬN (Action Required / High Risk)"}
                          </p>
                          <p className="text-sm text-gray-300">{dealSafety.recommendation}</p>
                        </div>
                      </div>
                      {dealSafety.requiredProtocols && dealSafety.requiredProtocols.length > 0 && (
                        <div>
                          <p className="text-xs text-gray-500 font-semibold mb-2">Required Protocols:</p>
                          <ul className="space-y-1.5">
                            {dealSafety.requiredProtocols.map((p, i) => (
                              <li key={i} className="flex items-start gap-2 text-sm text-gray-300">
                                <Shield className="w-3.5 h-3.5 shrink-0 mt-0.5 text-purple-400" />
                                {p}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </>
                  ) : (
                    <p className="text-sm text-gray-400">No deal safety analysis available.</p>
                  )}
                </div>
              </div>

              {/* Hard Stop Alert */}
              {report.hardStop && (
                <div className="bg-red-950/50 border border-red-500/50 rounded-xl p-5 mb-8 flex items-start gap-4">
                  <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center shrink-0">
                    <XCircle className="w-5 h-5 text-red-400" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-bold text-red-400 mb-1">HARD STOP TRIGGERED</p>
                    <p className="text-sm text-red-300/70">
                      Critical compliance issues detected. This entity has triggered automatic verification halt
                      due to high-risk indicators. Immediate review required before proceeding.
                    </p>
                  </div>
                  <button className="px-4 py-2 border border-red-500/50 text-red-400 text-xs font-medium rounded-lg hover:bg-red-500/10 transition-colors">
                    View Conflict Logs
                  </button>
                </div>
              )}

              {/* 8-Pillar Breakdown */}
              <div className="mb-6">
                <h2 className="text-lg font-bold text-white mb-1">8-Pillar Intelligence Breakdown</h2>
                <p className="text-sm text-gray-500">Comprehensive analysis across all verification dimensions</p>
              </div>

              {pillars.length === 0 ? (
                <div className="bg-[#1A2035] rounded-xl border border-white/10 p-10 text-center">
                  <Clock className="w-8 h-8 text-gray-600 mx-auto mb-3" />
                  <p className="text-gray-500 text-sm">Pillar analysis is being processed...</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {pillars.map((pillar) => (
                    <PillarCard key={pillar.pillarNo} pillar={pillar} />
                  ))}
                </div>
              )}

              {/* Chat with AI */}
              <div className="mt-8 bg-[#1A2035] rounded-xl border border-white/10 p-6 text-center">
                <p className="text-sm text-gray-400 mb-3">
                  Have questions about this report? Ask our AI Intelligence Copilot.
                </p>
                <Link
                  href={`/chat?reportId=${id}`}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#00D26A] text-white font-semibold rounded-lg hover:bg-[#00b85d] transition-colors text-sm"
                >
                  Chat with AI about this report →
                </Link>
              </div>
            </>
          )}
        </main>
      </div>
    </AuthGuard>
  );
}

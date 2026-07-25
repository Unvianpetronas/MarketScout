"use client";

import {
  Shield, Globe, TrendingUp, Building2, Star, AlertTriangle,
  FileText, CheckCircle2, BookOpen, Database, Search, Scale,
} from "lucide-react";
import { AuthGuard } from "@/components/shared/auth-guard";
import { Sidebar } from "@/components/layout/sidebar";
import { useLanguage } from "@/providers/language-provider";
import { Reveal } from "@/components/shared/reveal";

interface PillarDoc {
  no: number;
  icon: React.ElementType;
  weight: number;          // % contribution to the overall score
  sourceCount: number;     // number of data-source badges to render
}

const PILLARS: PillarDoc[] = [
  { no: 1, icon: Shield, weight: 18, sourceCount: 3 },
  { no: 2, icon: Globe, weight: 10, sourceCount: 2 },
  { no: 3, icon: TrendingUp, weight: 15, sourceCount: 2 },
  { no: 4, icon: Building2, weight: 12, sourceCount: 2 },
  { no: 5, icon: Star, weight: 12, sourceCount: 2 },
  { no: 6, icon: AlertTriangle, weight: 18, sourceCount: 2 },
  { no: 7, icon: FileText, weight: 8, sourceCount: 1 },
  { no: 8, icon: CheckCircle2, weight: 7, sourceCount: 3 },
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
  const { t } = useLanguage();
  const sources = Array.from({ length: p.sourceCount }, (_, i) =>
    t(`methodology.pillar.p${p.no}.source${i + 1}`)
  );
  return (
    <div className="bg-white rounded-2xl border border-[rgba(16,22,43,0.06)] p-6 shadow-[0_2px_20px_rgba(16,22,43,0.03)] card-hover">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#E7F6EF] flex items-center justify-center shrink-0">
            <Icon className="w-5 h-5 text-[#047857]" />
          </div>
          <div>
            <p className="text-[10px] text-gray-400 font-mono uppercase">{t("methodology.pillarLabel", { no: p.no })}</p>
            <h3 className="text-base font-bold text-gray-900 mt-0.5">{t(`methodology.pillar.p${p.no}.name`)}</h3>
          </div>
        </div>
        <span className="text-xs font-bold text-[#047857] bg-[#E7F6EF] px-2.5 py-1 rounded-full shrink-0">
          {t("methodology.weightLabel", { weight: p.weight })}
        </span>
      </div>

      <div className="space-y-4">
        <div>
          <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1 flex items-center gap-1.5">
            <Search className="w-3.5 h-3.5" /> {t("methodology.checksLabel")}
          </p>
          <p className="text-sm text-gray-600">{t(`methodology.pillar.p${p.no}.checks`)}</p>
        </div>
        <div>
          <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1 flex items-center gap-1.5">
            <Scale className="w-3.5 h-3.5" /> {t("methodology.methodLabel")}
          </p>
          <p className="text-sm text-gray-600">{t(`methodology.pillar.p${p.no}.method`)}</p>
        </div>
        <div>
          <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <Database className="w-3.5 h-3.5" /> {t("methodology.sourcesLabel")}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {sources.map((s, i) => (
              <span key={i} className="text-[11px] text-gray-600 bg-gray-50 border border-[rgba(16,22,43,0.06)] px-2 py-1 rounded-lg">
                {s}
              </span>
            ))}
          </div>
        </div>
        <div className="border-t border-gray-50 pt-3 space-y-2">
          <StatusLine label="PASS" text={t(`methodology.pillar.p${p.no}.pass`)} color="#047857" bg="#E7F6EF" />
          <StatusLine label="WARN" text={t(`methodology.pillar.p${p.no}.warn`)} color="#B45309" bg="#FFF8E7" />
          <StatusLine label="FAIL" text={t(`methodology.pillar.p${p.no}.fail`)} color="#B91C1C" bg="#FFF1F0" />
        </div>
      </div>
    </div>
  );
}

export default function MethodologyPage() {
  const { t } = useLanguage();
  return (
    <AuthGuard>
      <div className="flex h-screen overflow-hidden bg-[#faf9f6]">
        <Sidebar active="methodology" />
        <div className="flex-1 overflow-y-auto scrollbar-thin">
          <main className="max-w-6xl mx-auto px-6 py-8">

            {/* ── Header ── */}
            <div className="mb-8 animate-fade-in">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-11 h-11 rounded-2xl gradient-brand flex items-center justify-center shadow-[0_2px_20px_rgba(16,22,43,0.03)]">
                  <BookOpen className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-extrabold text-gray-900">{t("methodology.title")}</h1>
                  <p className="text-sm text-gray-400">
                    {t("methodology.subtitle")}
                  </p>
                </div>
              </div>
            </div>

            {/* ── How scoring works ── */}
            <Reveal className="bg-gradient-to-r from-[#0b1120] to-[#10162b] rounded-2xl p-6 mb-8">
              <p className="text-[#5FD48A] text-xs font-bold uppercase tracking-widest mb-2">{t("methodology.scoringLabel")}</p>
              <p className="text-white/90 text-sm leading-relaxed mb-3">
                {t("methodology.scoringIntro")}{" "}
                <span className="font-bold text-emerald-300">PASS</span> /
                <span className="font-bold text-amber-300"> WARN</span> /
                <span className="font-bold text-red-300"> FAIL</span>{t("methodology.scoringOutro")}
              </p>
              <p className="text-white/70 text-sm leading-relaxed">
                {t("methodology.sanctionsIntro")}{" "}
                <span className="font-bold text-white">{t("methodology.sanctionsPillarName")}</span>
                {t("methodology.sanctionsMid")}{" "}
                <span className="font-bold text-red-300">Hard Stop</span>
                {t("methodology.sanctionsOutro")}
              </p>
            </Reveal>

            {/* ── Pillar docs ── */}
            <Reveal className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {PILLARS.map((p) => <PillarDocCard key={p.no} p={p} />)}
            </Reveal>

            {/* ── Confidence note ── */}
            <Reveal className="mt-8 bg-white rounded-2xl border border-[rgba(16,22,43,0.06)] p-6 shadow-[0_2px_20px_rgba(16,22,43,0.03)]">
              <h3 className="text-sm font-bold text-gray-900 mb-2">{t("methodology.confidenceTitle")}</h3>
              <p className="text-sm text-gray-600">
                {t("methodology.confidenceDesc")}
              </p>
            </Reveal>

          </main>
        </div>
      </div>
    </AuthGuard>
  );
}

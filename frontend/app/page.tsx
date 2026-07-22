"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Search,
  CheckCircle2,
  Shield,
  Globe,
  Zap,
  Mail,
  MapPin,
  Bot,
  Boxes,
  Network,
  Scale,
  Globe2,
  Ship,
  Fingerprint,
  Receipt,
  ShieldAlert,
  FileSignature,
  Building2,
} from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { LinkedinIcon, FacebookIcon, GithubIcon } from "@/components/icons/social-icons";
import { useLanguage } from "@/providers/language-provider";
import { Reveal } from "@/components/shared/reveal";
import { CountUp } from "@/components/shared/count-up";

const TEAM = [
  {
    name: "Trương Quốc Tuấn",
    roleKey: "landing.team.tuan.role",
    bioKey: "landing.team.tuan.bio",
    initials: "TQT",
    gradient: "from-emerald-400 to-teal-500",
    avatar: "/team/tuan.jpg",
  },
  {
    name: "Lê Vương Định",
    roleKey: "landing.team.dinh.role",
    bioKey: "landing.team.dinh.bio",
    initials: "LVD",
    gradient: "from-blue-400 to-indigo-500",
    avatar: "/team/dinh.jpg",
  },
  {
    name: "Nguyễn Đăng Mạnh",
    roleKey: "landing.team.manh.role",
    bioKey: "landing.team.manh.bio",
    initials: "NDM",
    gradient: "from-violet-400 to-purple-500",
    avatar: "/team/manh.jpg",
  },
  {
    name: "Nguyễn Trường Huy",
    roleKey: "landing.team.huy.role",
    bioKey: "landing.team.huy.bio",
    initials: "NTH",
    gradient: "from-amber-400 to-orange-500",
    avatar: "/team/huy.jpg",
  },
  {
    name: "Nguyễn Anh Minh",
    roleKey: "landing.team.minh.role",
    bioKey: "landing.team.minh.bio",
    initials: "NAM",
    gradient: "from-rose-400 to-pink-500",
    avatar: "/team/minh.jpg",
  },
];

function TeamAvatar({ avatar, initials, gradient, name }: { avatar: string; initials: string; gradient: string; name: string }) {
  const [errored, setErrored] = useState(false);
  if (errored) {
    return (
      <div className={`w-full aspect-square rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center text-white text-3xl font-bold mb-4`}>
        {initials}
      </div>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element -- fixed team headshots with a gradient/initials fallback on load error
    <img
      src={avatar}
      alt={name}
      onError={() => setErrored(true)}
      className="w-full aspect-square rounded-xl object-cover mb-4"
    />
  );
}

const FEATURES = [
  {
    icon: Shield,
    titleKey: "landing.feature.pillars.title",
    descKey: "landing.feature.pillars.desc",
  },
  {
    icon: Globe,
    titleKey: "landing.feature.countries.title",
    descKey: "landing.feature.countries.desc",
  },
  {
    icon: Zap,
    titleKey: "landing.feature.instant.title",
    descKey: "landing.feature.instant.desc",
  },
];

const PILLARS = [
  {
    code: "P1",
    icon: Scale,
    titleKey: "landing.pillar.p1.title",
    descKey: "landing.pillar.p1.desc",
    metaLabelKey: "landing.pillar.p1.metaLabel",
    metaValueKey: "landing.pillar.p1.metaValue",
  },
  {
    code: "P2",
    icon: Globe2,
    titleKey: "landing.pillar.p2.title",
    descKey: "landing.pillar.p2.desc",
    metaLabelKey: "landing.pillar.p2.metaLabel",
    metaValueKey: "landing.pillar.p2.metaValue",
  },
  {
    code: "P3",
    icon: Ship,
    titleKey: "landing.pillar.p3.title",
    descKey: "landing.pillar.p3.desc",
    metaLabelKey: "landing.pillar.p3.metaLabel",
    metaValueKey: "landing.pillar.p3.metaValue",
  },
  {
    code: "P4",
    icon: Fingerprint,
    titleKey: "landing.pillar.p4.title",
    descKey: "landing.pillar.p4.desc",
    metaLabelKey: "landing.pillar.p4.metaLabel",
    metaValueKey: "landing.pillar.p4.metaValue",
  },
  {
    code: "P5",
    icon: Receipt,
    titleKey: "landing.pillar.p5.title",
    descKey: "landing.pillar.p5.desc",
    metaLabelKey: "landing.pillar.p5.metaLabel",
    metaValueKey: "landing.pillar.p5.metaValue",
  },
  {
    code: "P6",
    icon: ShieldAlert,
    titleKey: "landing.pillar.p6.title",
    descKey: "landing.pillar.p6.desc",
    metaLabelKey: "landing.pillar.p6.metaLabel",
    metaValueKey: "landing.pillar.p6.metaValue",
  },
  {
    code: "P7",
    icon: FileSignature,
    titleKey: "landing.pillar.p7.title",
    descKey: "landing.pillar.p7.desc",
    metaLabelKey: "landing.pillar.p7.metaLabel",
    metaValueKey: "landing.pillar.p7.metaValue",
  },
  {
    code: "P8",
    icon: Building2,
    titleKey: "landing.pillar.p8.title",
    descKey: "landing.pillar.p8.desc",
    metaLabelKey: "landing.pillar.p8.metaLabel",
    metaValueKey: "landing.pillar.p8.metaValue",
  },
];

export default function LandingPage() {
  const { t, lang, toggle } = useLanguage();
  return (
    <div className="min-h-screen bg-white">
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white/95 backdrop-blur z-50">
        <Link href="/" className="flex items-center gap-2">
          <Logo className="w-8 h-8" />
          <span className="font-bold text-gray-900 text-lg">MarketScout</span>
        </Link>

        <div className="hidden md:flex items-center gap-6">
          <Link href="/verify" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">
            {t("landing.nav.verifyNow")}
          </Link>
          <Link href="#team" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">
            {t("landing.nav.team")}
          </Link>
          <Link href="#powerhouse" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">
            {t("landing.nav.aiAgent")}
          </Link>
          <Link href="#pillars" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">
            {t("landing.nav.pillars")}
          </Link>
          <Link href="/pricing" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">
            {t("landing.nav.pricing")}
          </Link>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={toggle}
            title={t("lang.switchTo")}
            className="flex items-center gap-1.5 px-3 py-2 text-sm text-gray-600 hover:text-gray-900 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Globe className="w-4 h-4" />
            <span className="font-medium">{lang === "vi" ? "VI" : "EN"}</span>
          </button>

          <Link
            href="/login"
            className="px-5 py-2.5 bg-[#00D26A] text-white text-sm font-semibold rounded-lg hover:bg-[#00b85d] transition-colors"
          >
            {t("landing.nav.partnerLogin")}
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-5xl mx-auto px-4 py-20 text-center">
        <div className="inline-block mb-4">
          <span className="text-xs font-semibold tracking-widest text-[#00D26A] uppercase border border-[#00D26A]/30 rounded-full px-3 py-1">
            {t("landing.hero.badge")}
          </span>
        </div>

        <h1 className="text-5xl md:text-6xl font-bold text-gray-900 leading-tight mb-6">
          {t("landing.hero.titlePrefix")}{" "}
          <span className="text-[#00D26A]">{t("landing.hero.titleHighlight")}</span> {t("landing.hero.titleSuffix")}
        </h1>

        <p className="text-lg text-gray-500 max-w-2xl mx-auto mb-10">
          {t("landing.hero.subtitle")}
        </p>

        {/* Search bar */}
        <form
          action="/verify"
          className="flex gap-3 max-w-2xl mx-auto mb-10 bg-white border border-gray-200 rounded-2xl shadow-lg p-2"
        >
          <div className="flex-1 flex items-center gap-2 px-3">
            <Search className="w-5 h-5 text-gray-400 shrink-0" />
            <input
              name="q"
              placeholder={t("landing.hero.searchPlaceholder")}
              className="flex-1 py-2 text-sm focus:outline-none placeholder:text-gray-400"
            />
          </div>
          <select
            name="country"
            className="px-3 py-2 bg-gray-50 text-sm text-gray-600 border-l border-gray-200 focus:outline-none"
          >
            <option value="">{t("landing.hero.allCountries")}</option>
            <option value="US">{t("landing.hero.country.us")}</option>
            <option value="CN">{t("landing.hero.country.cn")}</option>
            <option value="VN">{t("landing.hero.country.vn")}</option>
            <option value="DE">{t("landing.hero.country.de")}</option>
          </select>
          <button
            type="submit"
            className="px-6 py-2.5 bg-[#00D26A] text-white font-semibold rounded-xl hover:bg-[#00b85d] transition-colors text-sm"
          >
            {t("landing.nav.verifyNow")}
          </button>
        </form>

        {/* Trust stats */}
        <div className="flex items-center justify-center gap-8 flex-wrap text-sm text-gray-500">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-[#00D26A]" />
            <span><strong className="text-gray-900"><CountUp end={500} suffix="+" /></strong> {t("landing.hero.statCompanies")}</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-[#00D26A]" />
            <span><strong className="text-gray-900"><CountUp end={99.8} decimals={1} suffix="%" /></strong> {t("landing.hero.statAccuracy")}</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-[#00D26A]" />
            <span><strong className="text-gray-900"><CountUp end={190} suffix="+" /></strong> {t("landing.hero.statCountries")}</span>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="bg-gray-50 py-16 scroll-mt-16">
        <div className="max-w-5xl mx-auto px-4">
          <Reveal>
            <h2 className="text-3xl font-bold text-gray-900 text-center mb-12">
              {t("landing.features.title")}
            </h2>
          </Reveal>
          <Reveal stagger className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {FEATURES.map((feat) => (
              <div key={feat.titleKey} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center mb-4">
                  <feat.icon className="w-5 h-5 text-[#00D26A]" />
                </div>
                <h3 className="text-base font-bold text-gray-900 mb-2">{t(feat.titleKey)}</h3>
                <p className="text-sm text-gray-500">{t(feat.descKey)}</p>
              </div>
            ))}
          </Reveal>
        </div>
      </section>

      {/* Team */}
      <section id="team" className="py-20 max-w-6xl mx-auto px-4 scroll-mt-16">
        <Reveal className="text-center max-w-2xl mx-auto mb-12">
          <span className="inline-block text-xs font-semibold tracking-widest text-[#00A859] uppercase bg-emerald-50 border border-[#00A859]/20 rounded-full px-3 py-1 mb-4">
            {t("landing.team.badge")}
          </span>
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3">{t("landing.team.title")}</h2>
          <p className="text-gray-500">{t("landing.team.subtitle")}</p>
        </Reveal>
        <Reveal stagger className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
          {TEAM.map((member) => (
            <div
              key={member.name}
              className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow p-5 flex flex-col"
            >
              <TeamAvatar avatar={member.avatar} initials={member.initials} gradient={member.gradient} name={member.name} />
              <p className="font-bold text-gray-900">{member.name}</p>
              <p className="text-xs font-bold text-[#00A859] uppercase tracking-wide mb-2">
                {t(member.roleKey)}
              </p>
              <p className="text-sm text-gray-500 mb-4 flex-1">{t(member.bioKey)}</p>
              <div className="flex items-center gap-3 pt-3 border-t border-gray-50">
                <a href="#" aria-label={t("landing.team.socialLinkedin", { name: member.name })} className="text-gray-400 hover:text-[#00D26A] transition-colors">
                  <LinkedinIcon className="w-4 h-4" />
                </a>
              </div>
            </div>
          ))}
        </Reveal>
      </section>

      {/* The Powerhouse: MarketScout AI Agent */}
      <section id="powerhouse" className="py-20 bg-gradient-to-br from-[#0F2A1C] to-[#081810] scroll-mt-16">
        <div className="max-w-6xl mx-auto px-4 grid lg:grid-cols-2 gap-12 items-center">
          {/* Left column */}
          <Reveal variant="left">
            <span className="inline-block text-xs font-semibold tracking-widest text-[#5EEAD4] uppercase border border-[#5EEAD4]/30 rounded-full px-3 py-1 mb-4">
              {t("landing.powerhouse.badge")}
            </span>
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4 leading-tight">
              {t("landing.powerhouse.titlePrefix")}{" "}
              <span className="bg-gradient-to-r from-[#00D26A] to-[#5EEAD4] bg-clip-text text-transparent">
                {t("landing.powerhouse.titleHighlight")}
              </span>
            </h2>
            <p className="text-gray-300 mb-8 leading-relaxed">
              {t("landing.powerhouse.desc")}
            </p>
            <div className="space-y-6">
              <div className="flex gap-4">
                <div className="w-10 h-10 rounded-lg bg-[#00D26A]/10 flex items-center justify-center shrink-0">
                  <Boxes className="w-5 h-5 text-[#00D26A]" />
                </div>
                <div>
                  <h4 className="text-white font-semibold mb-1">{t("landing.powerhouse.feature1.title")}</h4>
                  <p className="text-sm text-gray-400">
                    {t("landing.powerhouse.feature1.desc")}
                  </p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="w-10 h-10 rounded-lg bg-[#00D26A]/10 flex items-center justify-center shrink-0">
                  <Network className="w-5 h-5 text-[#00D26A]" />
                </div>
                <div>
                  <h4 className="text-white font-semibold mb-1">{t("landing.powerhouse.feature2.title")}</h4>
                  <p className="text-sm text-gray-400">
                    {t("landing.powerhouse.feature2.desc")}
                  </p>
                </div>
              </div>
            </div>
          </Reveal>

          {/* Right column - AI Agent panel mockup */}
          <Reveal variant="right" className="bg-[#0F2A1C] border border-[#00D26A]/20 rounded-2xl p-6 shadow-2xl">
            <div className="flex items-center justify-between flex-wrap gap-3 mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-[#00D26A]/15 flex items-center justify-center shrink-0">
                  <Bot className="w-5 h-5 text-[#00D26A]" />
                </div>
                <div>
                  <p className="text-sm font-bold text-white">{t("landing.powerhouse.panelName")}</p>
                  <p className="text-xs text-gray-400">{t("landing.powerhouse.panelVersion")}</p>
                </div>
              </div>
              <span className="text-xs font-medium text-[#00D26A] border border-[#00D26A]/30 rounded-full px-3 py-1 flex items-center gap-1.5 whitespace-nowrap">
                <span className="w-1.5 h-1.5 rounded-full bg-[#00D26A] animate-pulse" />
                {t("landing.powerhouse.scanning")}
              </span>
            </div>

            <div className="flex items-center justify-between mb-3 text-xs">
              <span className="text-gray-400 font-semibold uppercase tracking-wide">
                {t("landing.powerhouse.relationalMatches")}
              </span>
              <span className="text-[#00D26A] font-bold">{t("landing.powerhouse.probability")}</span>
            </div>

            {/* Relational graph */}
            <div className="bg-[#0A1F14] rounded-xl border border-white/5 p-5 mb-5">
              <svg viewBox="0 0 300 100" className="w-full h-24">
                <line x1="40" y1="50" x2="150" y2="25" stroke="#00D26A" strokeWidth="1" strokeOpacity="0.4" />
                <line x1="40" y1="50" x2="150" y2="75" stroke="#00D26A" strokeWidth="1" strokeOpacity="0.4" />
                <line x1="150" y1="25" x2="260" y2="50" stroke="#FBBF24" strokeWidth="1" strokeOpacity="0.7" strokeDasharray="4 2" />
                <line x1="150" y1="75" x2="260" y2="50" stroke="#00D26A" strokeWidth="1" strokeOpacity="0.4" />
                <circle cx="40" cy="50" r="6" fill="#00D26A" />
                <circle cx="150" cy="25" r="5" fill="#FBBF24" />
                <circle cx="150" cy="75" r="5" fill="#00D26A" />
                <circle cx="260" cy="50" r="6" fill="#00D26A" />
              </svg>
              <div className="flex items-center justify-between text-[10px] text-gray-400 uppercase tracking-wide mt-1 px-1">
                <span>{t("landing.powerhouse.subjectEntity")}</span>
                <span>{t("landing.powerhouse.beneficiaryOwner")}</span>
              </div>
            </div>

            {/* AI insight */}
            <div className="mb-5">
              <p className="text-xs font-semibold text-[#00D26A] uppercase tracking-wide mb-2">
                {t("landing.powerhouse.insightsTitle")}
              </p>
              <p className="text-sm text-gray-300 leading-relaxed">
                {t("landing.powerhouse.insightsQuote")}
              </p>
            </div>

            {/* Bottom stats */}
            <div className="grid grid-cols-2 gap-4 pt-5 border-t border-white/10">
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">{t("landing.powerhouse.operationalInsights")}</p>
                <p className="text-sm font-bold text-white">{t("landing.powerhouse.flagIssued")}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">{t("landing.powerhouse.processingLatency")}</p>
                <p className="text-sm font-bold text-white">{t("landing.powerhouse.latencyValue")}</p>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* The 8 Pillars of Deep Verification */}
      <section id="pillars" className="py-20 bg-gradient-to-b from-[#EAF3ED] to-[#DCEEE3] scroll-mt-16">
        <div className="max-w-6xl mx-auto px-4">
          <Reveal className="text-center max-w-2xl mx-auto mb-14">
            <span className="inline-block text-xs font-semibold tracking-widest text-[#00A859] uppercase bg-white border border-[#00A859]/20 rounded-full px-3 py-1 mb-4">
              {t("landing.pillars.badge")}
            </span>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              {t("landing.pillars.title")}
            </h2>
            <p className="text-gray-500">
              {t("landing.pillars.subtitle")}
            </p>
          </Reveal>

          <Reveal stagger className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {PILLARS.map((pillar) => (
              <div
                key={pillar.code}
                className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm flex flex-col"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="w-10 h-10 rounded-xl bg-[#00D26A]/10 flex items-center justify-center">
                    <pillar.icon className="w-5 h-5 text-[#00A859]" />
                  </div>
                  <span className="text-xs font-bold text-gray-300">{pillar.code}</span>
                </div>
                <h3 className="font-bold text-gray-900 mb-2">{t(pillar.titleKey)}</h3>
                <p className="text-sm text-gray-500 mb-4 flex-1">{t(pillar.descKey)}</p>
                <div className="flex items-center justify-between gap-2 text-xs pt-4 border-t border-gray-100">
                  <span className="text-gray-400">{t(pillar.metaLabelKey)}</span>
                  <span className="font-bold text-[#00A859] text-right">{t(pillar.metaValueKey)}</span>
                </div>
              </div>
            ))}
          </Reveal>
        </div>
      </section>

      {/* CTA */}
      <section className="px-4 py-16 bg-white">
        <Reveal variant="scale" className="max-w-5xl mx-auto bg-gradient-to-br from-[#10301E] to-[#0A1F14] rounded-3xl p-10 md:p-16 text-center shadow-xl">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            {t("landing.cta.title")}
          </h2>
          <p className="text-gray-300 max-w-xl mx-auto mb-8">
            {t("landing.cta.subtitle")}
          </p>
          <div className="flex items-center justify-center gap-4 flex-wrap">
            <Link
              href="/verify"
              className="px-8 py-3.5 bg-[#00D26A] text-black font-bold rounded-xl hover:bg-[#00b85d] transition-colors"
            >
              {t("landing.cta.startScan")}
            </Link>
            <Link
              href="#pillars"
              className="px-8 py-3.5 border border-white/20 text-white font-medium rounded-xl hover:bg-white/5 transition-colors"
            >
              {t("landing.cta.viewFramework")}
            </Link>
          </div>
        </Reveal>
      </section>

      {/* Footer */}
      <footer className="bg-[#081810] text-gray-400 pt-16 pb-8">
        <div className="max-w-6xl mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-10 mb-12">
            {/* Brand column */}
            <div className="md:col-span-1">
              <Link href="/" className="flex items-center gap-2 mb-4">
                <Logo className="w-8 h-8" />
                <span className="font-bold text-white text-lg">MarketScout</span>
              </Link>
              <p className="text-xs font-semibold tracking-widest text-[#00D26A] uppercase mb-3">
                {t("landing.footer.tagline")}
              </p>
              <p className="text-sm text-gray-400 mb-6 leading-relaxed">
                {t("landing.footer.brandDesc")}
              </p>
              <div className="flex items-center gap-3">
                <a href="https://www.facebook.com/profile.php?id=61590349996139" target="_blank" rel="noopener noreferrer" aria-label="Facebook" className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center hover:bg-white/10 transition-colors">
                  <FacebookIcon className="w-4 h-4" />
                </a>
                <a href="https://www.linkedin.com/in/qu%E1%BB%91c-tu%E1%BA%A5n-tr%C6%B0%C6%A1ng/" target="_blank" rel="noopener noreferrer" aria-label="LinkedIn" className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center hover:bg-white/10 transition-colors">
                  <LinkedinIcon className="w-4 h-4" />
                </a>
                <a href="https://github.com/Unvianpetronas/MarketScout" target="_blank" rel="noopener noreferrer" aria-label="GitHub" className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center hover:bg-white/10 transition-colors">
                  <GithubIcon className="w-4 h-4" />
                </a>
              </div>
            </div>

            {/* Verification column */}
            <div>
              <h4 className="text-white font-semibold text-sm uppercase tracking-wide mb-4">
                {t("landing.footer.verification.heading")}
              </h4>
              <ul className="space-y-3 text-sm">
                <li><Link href="/verify" className="hover:text-white transition-colors">{t("landing.footer.verification.link1")}</Link></li>
                <li><Link href="#pillars" className="hover:text-white transition-colors">{t("landing.footer.verification.link2")}</Link></li>
                <li><Link href="#powerhouse" className="hover:text-white transition-colors">{t("landing.footer.verification.link3")}</Link></li>
                <li><Link href="/pricing" className="hover:text-white transition-colors">{t("landing.footer.verification.link4")}</Link></li>
              </ul>
            </div>

            {/* Team ARAM column */}
            <div>
              <h4 className="text-white font-semibold text-sm uppercase tracking-wide mb-4">
                {t("landing.footer.team.heading")}
              </h4>
              <ul className="space-y-3 text-sm">
                <li><Link href="#team" className="hover:text-white transition-colors">{t("landing.footer.team.link1")}</Link></li>
                <li><Link href="#team" className="hover:text-white transition-colors">{t("landing.footer.team.link2")}</Link></li>
                <li><Link href="#" className="hover:text-white transition-colors">{t("landing.footer.team.link3")}</Link></li>
                <li><Link href="/support-desk" className="hover:text-white transition-colors">{t("landing.footer.team.link4")}</Link></li>
              </ul>
            </div>

            {/* HQ column */}
            <div>
              <h4 className="text-white font-semibold text-sm uppercase tracking-wide mb-4">
                {t("landing.footer.hq.heading")}
              </h4>
              <div className="flex items-start gap-2 text-sm mb-3">
                <MapPin className="w-4 h-4 mt-0.5 shrink-0 text-[#00D26A]" />
                <span>Mai Văn Vĩnh, Tân Hưng, Thành Phố Hồ Chí Minh</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Mail className="w-4 h-4 shrink-0 text-[#00D26A]" />
                <span>unviantruong26@gmail.com</span>
              </div>
            </div>
          </div>

          <div className="border-t border-white/10 pt-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <p className="text-xs text-gray-500">
                {t("landing.footer.copyright", { year: new Date().getFullYear() })}
              </p>
              <p className="text-xs text-gray-600 mt-2 max-w-2xl">
                {t("landing.footer.disclaimer")}
              </p>
            </div>
            <div className="flex items-center gap-4 shrink-0 text-xs">
              <Link href="/terms-of-service" className="hover:text-white transition-colors">{t("landing.footer.terms")}</Link>
              <Link href="/privacy-policy" className="hover:text-white transition-colors">{t("landing.footer.privacy")}</Link>
              <Link href="/support-desk" className="hover:text-white transition-colors">{t("landing.footer.supportDesk")}</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

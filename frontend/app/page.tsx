import Link from "next/link";
import {
  Search,
  BarChart2,
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
import { LinkedinIcon, XIcon, FacebookIcon, GithubIcon } from "@/components/icons/social-icons";

const TEAM = [
  {
    name: "Mai Vy Nguyen",
    role: "Co-Founder & Chief Compliance",
    bio: "Former senior customs attorney, specialized in cross-border maritime and logistic integrity.",
    initials: "MVN",
    gradient: "from-emerald-400 to-teal-500",
  },
  {
    name: "Quoc Huy Pham",
    role: "Lead AI Architect",
    bio: "Pioneered multi-layered NLP parsing models for complex tax and registry archives.",
    initials: "QHP",
    gradient: "from-blue-400 to-indigo-500",
  },
  {
    name: "Lan Anh Tran",
    role: "Director of Product Logistics",
    bio: "Specialist in Supply Chain tracking, ensuring deep-tier physical verification frameworks.",
    initials: "LAT",
    gradient: "from-amber-400 to-orange-500",
  },
  {
    name: "Khang Minh Duong",
    role: "Head of Global Strategy",
    bio: "Devised scaling strategies across bilateral B2B relations between SEA and western hubs.",
    initials: "KMD",
    gradient: "from-rose-400 to-pink-500",
  },
];

const FEATURES = [
  {
    icon: Shield,
    title: "8-Pillar Intelligence",
    desc: "Comprehensive verification across legal, financial, compliance, and reputation dimensions.",
  },
  {
    icon: Globe,
    title: "190+ Countries",
    desc: "Real-time data from global trade registries, court records, and sanctions lists.",
  },
  {
    icon: Zap,
    title: "Instant Results",
    desc: "AI-powered analysis delivers actionable insights in under 60 seconds.",
  },
];

const PILLARS = [
  {
    code: "P1",
    icon: Scale,
    title: "Legal Verification",
    desc: "Validation of foundational registries, commercial registrations, operational status, and legal authority filings.",
    metaLabel: "Compliance standard",
    metaValue: "KYB Phase 1",
  },
  {
    code: "P2",
    icon: Globe2,
    title: "Digital Footprint",
    desc: "Analysis of web domains, metadata validation, server hosting locations, and active digital communications channels.",
    metaLabel: "Auditing style",
    metaValue: "Automated OSINT",
  },
  {
    code: "P3",
    icon: Ship,
    title: "Trade History",
    desc: "Assessment of prior bill of lading files, historical freight volumes, shipping routes, and harbor clearance reports.",
    metaLabel: "Data update frequency",
    metaValue: "Weekly",
  },
  {
    code: "P4",
    icon: Fingerprint,
    title: "Identity Verification",
    desc: "Validating the personal IDs, background registries, and power of attorney documents of managing directors.",
    metaLabel: "Standard procedure",
    metaValue: "KYC Biometric",
  },
  {
    code: "P5",
    icon: Receipt,
    title: "Finance & Tax Integrity",
    desc: "In-depth analysis of municipal tax filings, structured liabilities, debt burdens, and overall payment records.",
    metaLabel: "Financial depth",
    metaValue: "Tax Node Crawls",
  },
  {
    code: "P6",
    icon: ShieldAlert,
    title: "Sanctions Check",
    desc: "Automated screening against primary international lists: OFAC, EU consolidations, and national restriction catalogs.",
    metaLabel: "Sanction databases",
    metaValue: "140+ Lists",
  },
  {
    code: "P7",
    icon: FileSignature,
    title: "Deal Structure",
    desc: "Examining proposed international contract parameters, trade clauses, escrow frameworks, and payment gateways.",
    metaLabel: "Analysis system",
    metaValue: "Smart Contract Audit",
  },
  {
    code: "P8",
    icon: Building2,
    title: "Physical Evidence",
    desc: "On-the-ground validation of corporate warehouses, physical inventories, operational machinery, and local facilities.",
    metaLabel: "Ground network",
    metaValue: "Nationwide Teams",
  },
];

export default function LandingPage() {
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

        <div className="hidden md:flex items-center gap-6">
          <Link href="/verify" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">
            Verify Now
          </Link>
          <Link href="#team" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">
            Team ARAM
          </Link>
          <Link href="#powerhouse" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">
            MarketScout AI
          </Link>
          <Link href="#pillars" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">
            Deep Verify Pillars
          </Link>
          <Link href="/pricing" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">
            Pricing
          </Link>
        </div>

        <Link
          href="/login"
          className="px-5 py-2.5 bg-[#00D26A] text-white text-sm font-semibold rounded-lg hover:bg-[#00b85d] transition-colors"
        >
          Partner Login
        </Link>
      </nav>

      {/* Hero */}
      <section className="max-w-5xl mx-auto px-4 py-20 text-center">
        <div className="inline-block mb-4">
          <span className="text-xs font-semibold tracking-widest text-[#00D26A] uppercase border border-[#00D26A]/30 rounded-full px-3 py-1">
            AI-Powered Trade Intelligence
          </span>
        </div>

        <h1 className="text-5xl md:text-6xl font-bold text-gray-900 leading-tight mb-6">
          Verify Your International{" "}
          <span className="text-[#00D26A]">Partners</span> with Confidence.
        </h1>

        <p className="text-lg text-gray-500 max-w-2xl mx-auto mb-10">
          MarketScout empowers businesses to verify trade partners across 190+ countries using
          our AI-driven 8-pillar intelligence framework. Make informed decisions before they cost you.
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
              placeholder="Search company name..."
              className="flex-1 py-2 text-sm focus:outline-none placeholder:text-gray-400"
            />
          </div>
          <select
            name="country"
            className="px-3 py-2 bg-gray-50 text-sm text-gray-600 border-l border-gray-200 focus:outline-none"
          >
            <option value="">All Countries</option>
            <option value="US">United States</option>
            <option value="CN">China</option>
            <option value="VN">Vietnam</option>
            <option value="DE">Germany</option>
          </select>
          <button
            type="submit"
            className="px-6 py-2.5 bg-[#00D26A] text-white font-semibold rounded-xl hover:bg-[#00b85d] transition-colors text-sm"
          >
            Verify Now
          </button>
        </form>

        {/* Trust stats */}
        <div className="flex items-center justify-center gap-8 flex-wrap text-sm text-gray-500">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-[#00D26A]" />
            <span><strong className="text-gray-900">500+</strong> verified companies</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-[#00D26A]" />
            <span><strong className="text-gray-900">99.8%</strong> accuracy rate</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-[#00D26A]" />
            <span><strong className="text-gray-900">190+</strong> countries covered</span>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="bg-gray-50 py-16 scroll-mt-16">
        <div className="max-w-5xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-12">
            Why MarketScout?
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {FEATURES.map((feat) => (
              <div key={feat.title} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center mb-4">
                  <feat.icon className="w-5 h-5 text-[#00D26A]" />
                </div>
                <h3 className="text-base font-bold text-gray-900 mb-2">{feat.title}</h3>
                <p className="text-sm text-gray-500">{feat.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Team */}
      <section id="team" className="py-20 max-w-6xl mx-auto px-4 scroll-mt-16">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <span className="inline-block text-xs font-semibold tracking-widest text-[#00A859] uppercase bg-emerald-50 border border-[#00A859]/20 rounded-full px-3 py-1 mb-4">
            Team ARAM #278
          </span>
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3">Architects Profile</h2>
          <p className="text-gray-500">The compliance officers, architects, and strategists behind MarketScout&apos;s Deep Verify™ engine.</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {TEAM.map((member) => (
            <div
              key={member.name}
              className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow p-5 flex flex-col"
            >
              <div
                className={`w-full aspect-square rounded-xl bg-gradient-to-br ${member.gradient} flex items-center justify-center text-white text-3xl font-bold mb-4`}
              >
                {member.initials}
              </div>
              <p className="font-bold text-gray-900">{member.name}</p>
              <p className="text-xs font-bold text-[#00A859] uppercase tracking-wide mb-2">
                {member.role}
              </p>
              <p className="text-sm text-gray-500 mb-4 flex-1">{member.bio}</p>
              <div className="flex items-center gap-3 pt-3 border-t border-gray-50">
                <a href="#" aria-label={`${member.name} on LinkedIn`} className="text-gray-400 hover:text-[#00D26A] transition-colors">
                  <LinkedinIcon className="w-4 h-4" />
                </a>
                <a href="#" aria-label={`${member.name} on X`} className="text-gray-400 hover:text-[#00D26A] transition-colors">
                  <XIcon className="w-4 h-4" />
                </a>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* The Powerhouse: MarketScout AI Agent */}
      <section id="powerhouse" className="py-20 bg-gradient-to-br from-[#0F2A1C] to-[#081810] scroll-mt-16">
        <div className="max-w-6xl mx-auto px-4 grid lg:grid-cols-2 gap-12 items-center">
          {/* Left column */}
          <div>
            <span className="inline-block text-xs font-semibold tracking-widest text-[#5EEAD4] uppercase border border-[#5EEAD4]/30 rounded-full px-3 py-1 mb-4">
              Deep Engine Stack
            </span>
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4 leading-tight">
              The Powerhouse:{" "}
              <span className="bg-gradient-to-r from-[#00D26A] to-[#5EEAD4] bg-clip-text text-transparent">
                MarketScout AI Agent
              </span>
            </h2>
            <p className="text-gray-300 mb-8 leading-relaxed">
              Our specialized neural engine, trained specifically on complex domestic transport
              databases, customs declarations, and regional corporate networks, synthesizes dense,
              unstructured public data into clean, intuitive threat reports.
            </p>
            <div className="space-y-6">
              <div className="flex gap-4">
                <div className="w-10 h-10 rounded-lg bg-[#00D26A]/10 flex items-center justify-center shrink-0">
                  <Boxes className="w-5 h-5 text-[#00D26A]" />
                </div>
                <div>
                  <h4 className="text-white font-semibold mb-1">Cross-border Asset Mapping</h4>
                  <p className="text-sm text-gray-400">
                    Reconciles discrepancies between bill of lading records and physical warehouse
                    capacities automatically.
                  </p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="w-10 h-10 rounded-lg bg-[#00D26A]/10 flex items-center justify-center shrink-0">
                  <Network className="w-5 h-5 text-[#00D26A]" />
                </div>
                <div>
                  <h4 className="text-white font-semibold mb-1">Network Anomaly Flagging</h4>
                  <p className="text-sm text-gray-400">
                    Identifies shell organizations and overlapping director structures in under 5
                    seconds.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Right column - AI Agent panel mockup */}
          <div className="bg-[#0F2A1C] border border-[#00D26A]/20 rounded-2xl p-6 shadow-2xl">
            <div className="flex items-center justify-between flex-wrap gap-3 mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-[#00D26A]/15 flex items-center justify-center shrink-0">
                  <Bot className="w-5 h-5 text-[#00D26A]" />
                </div>
                <div>
                  <p className="text-sm font-bold text-white">MarketScout AI Agent</p>
                  <p className="text-xs text-gray-400">v2.9.4 — Active Analysis</p>
                </div>
              </div>
              <span className="text-xs font-medium text-[#00D26A] border border-[#00D26A]/30 rounded-full px-3 py-1 flex items-center gap-1.5 whitespace-nowrap">
                <span className="w-1.5 h-1.5 rounded-full bg-[#00D26A] animate-pulse" />
                Scanning Partner Network
              </span>
            </div>

            <div className="flex items-center justify-between mb-3 text-xs">
              <span className="text-gray-400 font-semibold uppercase tracking-wide">
                Relational Matches
              </span>
              <span className="text-[#00D26A] font-bold">99.2% Probability</span>
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
                <span>Subject Entity</span>
                <span>Beneficiary Owner</span>
              </div>
            </div>

            {/* AI insight */}
            <div className="mb-5">
              <p className="text-xs font-semibold text-[#00D26A] uppercase tracking-wide mb-2">
                AI Insights Summary
              </p>
              <p className="text-sm text-gray-300 leading-relaxed">
                &quot;The AI system flagged an indirect subsidiary alignment pointing to a sanctioned
                parent company in District 7 (HCMC). Cross-reference recommended before structural
                container allocation.&quot;
              </p>
            </div>

            {/* Bottom stats */}
            <div className="grid grid-cols-2 gap-4 pt-5 border-t border-white/10">
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Operational Insights</p>
                <p className="text-sm font-bold text-white">Immediate Flag Issued</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Processing Latency</p>
                <p className="text-sm font-bold text-white">0.48 Seconds</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* The 8 Pillars of Deep Verification */}
      <section id="pillars" className="py-20 bg-gradient-to-b from-[#EAF3ED] to-[#DCEEE3] scroll-mt-16">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <span className="inline-block text-xs font-semibold tracking-widest text-[#00A859] uppercase bg-white border border-[#00A859]/20 rounded-full px-3 py-1 mb-4">
              Deep Verify™ Architecture
            </span>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              The 8 Pillars of Deep Verification
            </h2>
            <p className="text-gray-500">
              Our modular, end-to-end framework. We leave no stone unturned, evaluating
              international partners across eight primary layers of trade integrity.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
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
                <h3 className="font-bold text-gray-900 mb-2">{pillar.title}</h3>
                <p className="text-sm text-gray-500 mb-4 flex-1">{pillar.desc}</p>
                <div className="flex items-center justify-between gap-2 text-xs pt-4 border-t border-gray-100">
                  <span className="text-gray-400">{pillar.metaLabel}</span>
                  <span className="font-bold text-[#00A859] text-right">{pillar.metaValue}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-4 py-16 bg-white">
        <div className="max-w-5xl mx-auto bg-gradient-to-br from-[#10301E] to-[#0A1F14] rounded-3xl p-10 md:p-16 text-center shadow-xl">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Ready to verify a partner right now?
          </h2>
          <p className="text-gray-300 max-w-xl mx-auto mb-8">
            Don&apos;t leave your logistics and supply chain security to chance. Get a complete Deep
            Verify™ report in minutes.
          </p>
          <div className="flex items-center justify-center gap-4 flex-wrap">
            <Link
              href="/verify"
              className="px-8 py-3.5 bg-[#00D26A] text-black font-bold rounded-xl hover:bg-[#00b85d] transition-colors"
            >
              Start Instant Scan
            </Link>
            <Link
              href="#pillars"
              className="px-8 py-3.5 border border-white/20 text-white font-medium rounded-xl hover:bg-white/5 transition-colors"
            >
              View Framework Details
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#081810] text-gray-400 pt-16 pb-8">
        <div className="max-w-6xl mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-10 mb-12">
            {/* Brand column */}
            <div className="md:col-span-1">
              <Link href="/" className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-full bg-[#00D26A] flex items-center justify-center">
                  <BarChart2 className="w-4 h-4 text-black" />
                </div>
                <span className="font-bold text-white text-lg">MarketScout</span>
              </Link>
              <p className="text-xs font-semibold tracking-widest text-[#00D26A] uppercase mb-3">
                Enterprise Verification
              </p>
              <p className="text-sm text-gray-400 mb-6 leading-relaxed">
                The gold standard in international business intelligence and trade logistics
                verification. Formulated specifically for domestic SEA network reliability.
              </p>
              <div className="flex items-center gap-3">
                <a href="#" aria-label="Facebook" className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center hover:bg-white/10 transition-colors">
                  <FacebookIcon className="w-4 h-4" />
                </a>
                <a href="#" aria-label="LinkedIn" className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center hover:bg-white/10 transition-colors">
                  <LinkedinIcon className="w-4 h-4" />
                </a>
                <a href="#" aria-label="GitHub" className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center hover:bg-white/10 transition-colors">
                  <GithubIcon className="w-4 h-4" />
                </a>
                <a href="#" aria-label="X" className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center hover:bg-white/10 transition-colors">
                  <XIcon className="w-4 h-4" />
                </a>
              </div>
            </div>

            {/* Verification column */}
            <div>
              <h4 className="text-white font-semibold text-sm uppercase tracking-wide mb-4">
                Verification
              </h4>
              <ul className="space-y-3 text-sm">
                <li><Link href="/verify" className="hover:text-white transition-colors">Instant Registry Lookups</Link></li>
                <li><Link href="#pillars" className="hover:text-white transition-colors">Deep Verify™ Stack</Link></li>
                <li><Link href="#powerhouse" className="hover:text-white transition-colors">MarketScout AI Engine</Link></li>
                <li><Link href="/pricing" className="hover:text-white transition-colors">API Integrations</Link></li>
              </ul>
            </div>

            {/* Team ARAM column */}
            <div>
              <h4 className="text-white font-semibold text-sm uppercase tracking-wide mb-4">
                Team ARAM
              </h4>
              <ul className="space-y-3 text-sm">
                <li><Link href="#team" className="hover:text-white transition-colors">Our Mission &amp; Vision</Link></li>
                <li><Link href="#team" className="hover:text-white transition-colors">Architects Profile</Link></li>
                <li><Link href="#" className="hover:text-white transition-colors">Vietnamese Logistics Core</Link></li>
                <li><Link href="#" className="hover:text-white transition-colors">Support Portal</Link></li>
              </ul>
            </div>

            {/* HQ column */}
            <div>
              <h4 className="text-white font-semibold text-sm uppercase tracking-wide mb-4">
                Global Headquarters
              </h4>
              <div className="flex items-start gap-2 text-sm mb-3">
                <MapPin className="w-4 h-4 mt-0.5 shrink-0 text-[#00D26A]" />
                <span>Suite 1803, PetroVietnam Tower, District 1, Ho Chi Minh City, Vietnam</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Mail className="w-4 h-4 shrink-0 text-[#00D26A]" />
                <span>compliance@marketscout.aram.vn</span>
              </div>
            </div>
          </div>

          <div className="border-t border-white/10 pt-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <p className="text-xs text-gray-500">
                &copy; {new Date().getFullYear()} MarketScout. Developed by Team ARAM #278. All rights reserved.
              </p>
              <p className="text-xs text-gray-600 mt-2 max-w-2xl">
                Disclaimer: MarketScout provides trade logistics evaluations and public corporate
                records. All trust levels are probabilistic recommendations and do not constitute
                absolute legal advice or formal banking credit recommendations.
              </p>
            </div>
            <div className="flex items-center gap-4 shrink-0 text-xs">
              <Link href="#" className="hover:text-white transition-colors">Terms of Service</Link>
              <Link href="#" className="hover:text-white transition-colors">Privacy Policy</Link>
              <Link href="#" className="hover:text-white transition-colors">Support Desk</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

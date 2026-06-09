import Link from "next/link";
import { Search, BarChart2, CheckCircle2, Shield, Globe, Zap } from "lucide-react";

const TEAM = [
  { name: "Anh", role: "Lead Engineer", initials: "A" },
  { name: "Ryo", role: "AI Architect", initials: "R" },
  { name: "Aram", role: "Product Manager", initials: "A" },
  { name: "Mia", role: "UX Designer", initials: "M" },
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
          <Link href="/pricing" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">
            Momentum
          </Link>
          <Link href="/pricing" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">
            Gravity Pro Titles
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
      <section className="bg-gray-50 py-16">
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
      <section id="team" className="py-16 max-w-5xl mx-auto px-4">
        <div className="text-center mb-10">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Meet Team ARAM #278</h2>
          <p className="text-gray-500">The engineers and designers behind MarketScout.</p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {TEAM.map((member) => (
            <div key={member.name} className="text-center">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-emerald-400 to-blue-500 flex items-center justify-center text-white text-2xl font-bold mx-auto mb-3">
                {member.initials}
              </div>
              <p className="font-semibold text-gray-900">{member.name}</p>
              <p className="text-sm text-gray-500">{member.role}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 text-center" style={{ backgroundColor: "#0A0E1A" }}>
        <div className="max-w-2xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-white mb-4">
            Ready to verify your next trade partner?
          </h2>
          <p className="text-gray-400 mb-8">
            Start with 5 free verifications. No credit card required.
          </p>
          <div className="flex items-center justify-center gap-4 flex-wrap">
            <Link
              href="/register"
              className="px-8 py-3.5 bg-[#00D26A] text-white font-bold rounded-xl hover:bg-[#00b85d] transition-colors"
            >
              Start Free Trial
            </Link>
            <Link
              href="/pricing"
              className="px-8 py-3.5 border border-white/20 text-white font-medium rounded-xl hover:bg-white/5 transition-colors"
            >
              View Pricing
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-100 py-8">
        <div className="max-w-5xl mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-[#00D26A] flex items-center justify-center">
              <BarChart2 className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="font-bold text-gray-900 text-sm">MarketScout</span>
          </div>
          <p className="text-xs text-gray-400">
            &copy; {new Date().getFullYear()} MarketScout Intelligence Suite. All rights reserved.
          </p>
          <div className="flex items-center gap-4">
            <Link href="/pricing" className="text-xs text-gray-400 hover:text-gray-600">Pricing</Link>
            <Link href="/login" className="text-xs text-gray-400 hover:text-gray-600">Sign In</Link>
            <Link href="/register" className="text-xs text-gray-400 hover:text-gray-600">Sign Up</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

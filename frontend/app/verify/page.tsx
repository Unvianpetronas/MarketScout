"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Search, Globe, CheckCircle2, Clock, XCircle, Zap, Shield, HelpCircle, X, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { AuthGuard } from "@/components/shared/auth-guard";
import { getMyQuota } from "@/services/quota.service";
import { QuotaStatus } from "@/types/quota";

const COUNTRIES = [
  { code: "US", name: "United States" },
  { code: "CN", name: "China" },
  { code: "VN", name: "Vietnam" },
  { code: "DE", name: "Germany" },
  { code: "GB", name: "United Kingdom" },
  { code: "JP", name: "Japan" },
  { code: "KR", name: "South Korea" },
  { code: "IN", name: "India" },
  { code: "SG", name: "Singapore" },
  { code: "TH", name: "Thailand" },
  { code: "MY", name: "Malaysia" },
  { code: "AU", name: "Australia" },
];

interface MockResult {
  name: string;
  taxCode: string;
  address: string;
  status: "Verified" | "Pending Update" | "Unverified";
  initials: string;
  avatarColor: string;
}

function VerifyContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [query, setQuery] = useState(searchParams.get("q") || "");
  const [country, setCountry] = useState(searchParams.get("country") || "");
  const [quota, setQuota] = useState<QuotaStatus | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<MockResult[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [showAltBanner, setShowAltBanner] = useState(false);

  const [filters, setFilters] = useState({
    verified: true,
    pending: true,
    unverified: true,
  });

  useEffect(() => {
    getMyQuota().then(setQuota).catch(() => null);
  }, []);

  useEffect(() => {
    if (searchParams.get("q") && !hasSearched) {
      handleSearch(null, searchParams.get("q") || "");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSearch = async (e: React.FormEvent | null, overrideQuery?: string) => {
    e?.preventDefault();
    const q = overrideQuery ?? query;
    if (!q.trim()) {
      toast.error("Please enter a company name.");
      return;
    }
    setIsSearching(true);
    setHasSearched(true);
    setShowAltBanner(true);

    await new Promise((r) => setTimeout(r, 800));
    setResults([
      {
        name: "Aether Dynamics Holding",
        taxCode: "US-984021-AE",
        address: "1234 Innovation Blvd, San Francisco, CA 94105",
        status: "Verified",
        initials: "AD",
        avatarColor: "bg-blue-600",
      },
      {
        name: q + " International Corp",
        taxCode: "TAX-" + Math.random().toString(36).slice(2, 8).toUpperCase(),
        address: "456 Commerce Park, New York, NY 10001",
        status: "Pending Update",
        initials: q.slice(0, 2).toUpperCase(),
        avatarColor: "bg-orange-500",
      },
      {
        name: q + " Holdings LLC",
        taxCode: "TAX-" + Math.random().toString(36).slice(2, 8).toUpperCase(),
        address: "789 Enterprise Avenue, Dallas, TX 75001",
        status: "Unverified",
        initials: q.slice(0, 2).toUpperCase(),
        avatarColor: "bg-gray-400",
      },
    ]);
    setIsSearching(false);
  };

  const handleQuickScan = (result: MockResult) => {
    const countryName = COUNTRIES.find((c) => c.code === country)?.name || country || "global";
    const msg = encodeURIComponent(`Verify company "${result.name}" in ${countryName}`);
    router.push(`/chat?preMessage=${msg}`);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "Verified": return <CheckCircle2 className="w-3.5 h-3.5" />;
      case "Pending Update": return <Clock className="w-3.5 h-3.5" />;
      default: return <XCircle className="w-3.5 h-3.5" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Verified": return "bg-emerald-100 text-emerald-700 border-emerald-200";
      case "Pending Update": return "bg-orange-100 text-orange-700 border-orange-200";
      default: return "bg-gray-100 text-gray-600 border-gray-200";
    }
  };

  const filteredResults = results.filter((r) => {
    if (r.status === "Verified" && !filters.verified) return false;
    if (r.status === "Pending Update" && !filters.pending) return false;
    if (r.status === "Unverified" && !filters.unverified) return false;
    return true;
  });

  return (
    <AuthGuard>
      <div className="min-h-screen bg-white flex flex-col">
        {/* TOP NAV */}
        <nav className="bg-white border-b border-gray-100 px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#1A3A28] flex items-center justify-center">
              <Shield className="w-4 h-4 text-[#00D26A]" />
            </div>
            <div>
              <span className="font-bold text-gray-900 text-sm">MarketScout</span>
              <p className="text-[#00D26A] text-xs font-semibold">B2B VERIFICATION</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {quota && (
              <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-700 px-3 py-1.5 rounded-full text-xs font-semibold">
                🔋 {quota.quotaRemaining} Quotas Remaining
                <button className="text-[#00D26A] hover:underline ml-1">+ Buy More</button>
              </div>
            )}
            <button className="w-7 h-7 rounded-full border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-50">
              <HelpCircle className="w-4 h-4" />
            </button>
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold">
              U
            </div>
          </div>
        </nav>

        <div className="flex-1 max-w-5xl mx-auto w-full px-4 py-6">
          {/* Search card */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 mb-6">
            <h1 className="text-3xl font-bold text-gray-900 mb-1">Verify Global Entity Records</h1>
            <p className="text-gray-500 text-sm mb-6">
              Search and verify business entities across 190+ countries using our AI intelligence network.
            </p>
            <form onSubmit={handleSearch} className="flex gap-3">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Company name, tax ID, or registration..."
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#1A3A28] focus:ring-2 focus:ring-[#1A3A28]/10"
                />
              </div>
              <div className="relative w-48">
                <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <select
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#1A3A28] bg-white appearance-none"
                >
                  <option value="">All Countries</option>
                  {COUNTRIES.map((c) => (
                    <option key={c.code} value={c.code}>{c.name}</option>
                  ))}
                </select>
              </div>
              <button
                type="submit"
                disabled={isSearching}
                className="px-6 py-2.5 bg-[#1A3A28] text-white font-semibold rounded-lg hover:bg-[#0D2218] transition-colors text-sm disabled:opacity-60 flex items-center gap-2"
              >
                {isSearching ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <Search className="w-4 h-4" />
                )}
                Search
              </button>
            </form>

            {hasSearched && (
              <div className="mt-3 flex items-center gap-2">
                <button className="text-xs text-gray-400 hover:text-[#00D26A] flex items-center gap-1">
                  🕐 RECENT SEARCHES
                </button>
                <button className="text-xs text-gray-400 hover:text-red-500 ml-auto">Clear History</button>
              </div>
            )}
          </div>

          {/* Two-column layout */}
          <div className="flex gap-6">
            {/* Filters sidebar */}
            <div className="w-64 shrink-0 space-y-4">
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-gray-800">Filters</h3>
                  <button className="text-xs text-[#00D26A] hover:underline font-medium">Reset All</button>
                </div>

                {/* Verification Status */}
                <div className="mb-5">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Verification Status</p>
                  {[
                    { key: "verified" as const, label: "Verified", count: 14 },
                    { key: "pending" as const, label: "Pending Update", count: 3 },
                    { key: "unverified" as const, label: "Unverified", count: 8 },
                  ].map(({ key, label, count }) => (
                    <label key={key} className="flex items-center justify-between cursor-pointer py-1.5">
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={filters[key]}
                          onChange={(e) => setFilters((f) => ({ ...f, [key]: e.target.checked }))}
                          className="w-4 h-4 rounded accent-blue-600"
                        />
                        <span className="text-sm text-gray-600">{label}</span>
                      </div>
                      <span className="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded font-medium">{count}</span>
                    </label>
                  ))}
                </div>

                {/* Region */}
                <div className="mb-5">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Region</p>
                  <div className="relative mb-2">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                    <input placeholder="Search regions..." className="w-full pl-8 pr-3 py-1.5 border border-gray-200 rounded text-xs focus:outline-none focus:border-[#00D26A]" />
                  </div>
                  {[
                    { label: "United States", count: 12 },
                    { label: "European Union", count: 9 },
                    { label: "Singapore", count: 4 },
                  ].map((region) => (
                    <label key={region.label} className="flex items-center justify-between cursor-pointer py-1.5">
                      <div className="flex items-center gap-2">
                        <input type="checkbox" defaultChecked className="w-4 h-4 rounded accent-blue-600" />
                        <span className="text-sm text-gray-600">{region.label}</span>
                      </div>
                      <span className="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded font-medium">{region.count}</span>
                    </label>
                  ))}
                </div>

                {/* Industry */}
                <div className="mb-5">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Industry</p>
                  {[
                    { label: "Technology & IT", count: 10 },
                    { label: "Biomedical & Pharma", count: 6 },
                    { label: "Logistics & Transport", count: 5 },
                    { label: "Financial & Professional", count: 4 },
                  ].map((ind) => (
                    <label key={ind.label} className="flex items-center justify-between cursor-pointer py-1">
                      <div className="flex items-center gap-2">
                        <input type="checkbox" defaultChecked className="w-4 h-4 rounded accent-blue-600" />
                        <span className="text-xs text-gray-600">{ind.label}</span>
                      </div>
                      <span className="text-[10px] bg-gray-100 text-gray-500 px-1 py-0.5 rounded font-medium">{ind.count}</span>
                    </label>
                  ))}
                </div>

                {/* Info box */}
                <div className="bg-blue-50 border border-blue-100 rounded-lg p-3">
                  <p className="text-xs text-blue-600 leading-relaxed">
                    All scanned profiles are synced directly with corporate registrars within the last 24 hours.
                  </p>
                </div>
              </div>
            </div>

            {/* Results */}
            <div className="flex-1">
              {/* Alternative search banner */}
              {hasSearched && showAltBanner && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-4 flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm text-yellow-800 font-medium">
                      Showing results for <strong>&apos;Aether Dynamics Holding&apos;</strong>. Try instead:{" "}
                      <button className="text-[#00D26A] hover:underline">Aetherian Dynamic Solutions</button>
                      {" or "}
                      <button className="text-[#00D26A] hover:underline">Aether Dynamics Inc.</button>
                    </p>
                  </div>
                  <button onClick={() => setShowAltBanner(false)} className="text-yellow-600 hover:text-yellow-800 shrink-0">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              {!hasSearched ? (
                <div className="bg-white rounded-xl border border-gray-100 p-16 text-center shadow-sm">
                  <Search className="w-12 h-12 text-gray-200 mx-auto mb-4" />
                  <p className="text-gray-500 text-sm">Search for a company to see verification results.</p>
                </div>
              ) : isSearching ? (
                <div className="bg-white rounded-xl border border-gray-100 p-16 text-center shadow-sm">
                  <div className="w-8 h-8 border-2 border-[#00D26A]/30 border-t-[#00D26A] rounded-full animate-spin mx-auto mb-4" />
                  <p className="text-gray-500">Scanning global databases...</p>
                </div>
              ) : (
                <>
                  <div className="space-y-3 mb-4">
                    {filteredResults.map((result, idx) => (
                      <div key={idx} className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex items-start gap-4">
                          <div className={`w-10 h-10 rounded-xl ${result.avatarColor} flex items-center justify-center text-white font-bold text-sm shrink-0`}>
                            {result.initials}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="font-semibold text-gray-900 text-sm">{result.name}</h3>
                              <span className={`flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full border ${getStatusBadge(result.status)}`}>
                                {getStatusIcon(result.status)}
                                {result.status}
                              </span>
                            </div>
                            <p className="text-xs text-gray-400">Tax: {result.taxCode}</p>
                            <p className="text-xs text-gray-500 mt-0.5">{result.address}</p>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              onClick={() => handleQuickScan(result)}
                              className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 text-gray-600 text-xs font-semibold rounded-lg hover:bg-gray-50 transition-colors"
                            >
                              <Zap className="w-3 h-3" />
                              Quick Scan FREE
                            </button>
                            <button
                              onClick={() => handleQuickScan(result)}
                              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1A3A28] text-white text-xs font-semibold rounded-lg hover:bg-[#0D2218] transition-colors"
                            >
                              Deep Verify 1 Quota
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* No match section */}
                  <div className="bg-white rounded-xl border border-gray-100 p-8 text-center shadow-sm mb-4">
                    <div className="w-12 h-12 rounded-full border-2 border-gray-200 flex items-center justify-center mx-auto mb-3">
                      <span className="text-gray-400 text-xl">?</span>
                    </div>
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Not Finding What You Need?</p>
                    <p className="text-sm text-gray-600 mb-4">No exact match found for &apos;Xylorite Technologies&apos;</p>
                    <div className="flex justify-center gap-3">
                      <button
                        onClick={() => toast.info("Broadening to global search...")}
                        className="px-4 py-2 border border-gray-200 text-sm font-medium text-gray-600 rounded-lg hover:bg-gray-50"
                      >
                        Broaden to Global Search
                      </button>
                      <button
                        onClick={() => toast.info("On-demand scan requested.")}
                        className="px-4 py-2 bg-[#1A3A28] text-white text-sm font-medium rounded-lg hover:bg-[#0D2218]"
                      >
                        Request On-Demand Scan
                      </button>
                    </div>
                  </div>

                  {/* Pagination */}
                  <div className="flex items-center justify-between text-sm">
                    <p className="text-gray-500">Page 1 of 1 ({filteredResults.length} Results)</p>
                    <div className="flex gap-2">
                      <button className="px-3 py-1.5 border border-gray-200 rounded-lg text-gray-400 text-xs flex items-center gap-1 cursor-not-allowed">
                        <ChevronLeft className="w-3.5 h-3.5" />
                        Previous
                      </button>
                      <button className="px-3 py-1.5 border border-gray-200 rounded-lg text-gray-600 text-xs flex items-center gap-1 hover:bg-gray-50">
                        Next
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="border-t border-gray-100 bg-white px-6 py-3 flex items-center justify-between">
          <p className="text-xs text-gray-400">MarketScout &copy; 2025</p>
          <div className="flex gap-4">
            {["API documentation", "Terms of Service", "Privacy Policy"].map((link) => (
              <a key={link} href="#" className="text-xs text-gray-400 hover:text-gray-600 transition-colors">
                {link}
              </a>
            ))}
          </div>
        </div>
      </div>
    </AuthGuard>
  );
}

export default function VerifyPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#00D26A]/30 border-t-[#00D26A] rounded-full animate-spin" />
      </div>
    }>
      <VerifyContent />
    </Suspense>
  );
}

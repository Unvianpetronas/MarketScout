"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BarChart2, FileText, Zap, AlertTriangle, Search, ExternalLink, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { AuthGuard } from "@/components/shared/auth-guard";
import { AppNav } from "@/components/layout/nav";
import { useAuth } from "@/providers/auth-provider";
import { getReports } from "@/services/report.service";
import { getMyQuota } from "@/services/quota.service";
import { ReportListItem } from "@/types/report";
import { QuotaStatus } from "@/types/quota";

function getRiskColor(risk: string) {
  switch (risk) {
    case "LOW": return "bg-emerald-100 text-emerald-700";
    case "MEDIUM": return "bg-yellow-100 text-yellow-700";
    case "HIGH": return "bg-red-100 text-red-700";
    default: return "bg-gray-100 text-gray-600";
  }
}

function getScoreColor(score: number) {
  if (score < 40) return "text-emerald-600";
  if (score < 70) return "text-yellow-600";
  return "text-red-600";
}

export default function DashboardPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [reports, setReports] = useState<ReportListItem[]>([]);
  const [quota, setQuota] = useState<QuotaStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [quickSearch, setQuickSearch] = useState("");
  const [quickCountry, setQuickCountry] = useState("");

  useEffect(() => {
    Promise.all([
      getReports().catch(() => [] as ReportListItem[]),
      getMyQuota().catch(() => null),
    ]).then(([r, q]) => {
      setReports(r);
      setQuota(q);
      setIsLoading(false);
    });
  }, []);

  const handleQuickVerify = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickSearch.trim()) {
      toast.error("Please enter a company name.");
      return;
    }
    const params = new URLSearchParams({ q: quickSearch, country: quickCountry });
    router.push(`/verify?${params.toString()}`);
  };

  const totalReports = reports.length;
  const activeScans = reports.filter((r) => r.status === "PROCESSING").length;
  const riskAlerts = reports.filter((r) => r.riskLevel === "HIGH").length;

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gray-50">
        <AppNav />

        <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
          {/* Welcome */}
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-gray-900">
              Welcome back, {user?.fullName?.split(" ")[0] || "User"} 👋
            </h1>
            <p className="text-gray-500 text-sm mt-1">
              Here&apos;s your intelligence overview for today.
            </p>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Reports</span>
                <FileText className="w-4 h-4 text-gray-400" />
              </div>
              <p className="text-3xl font-bold text-gray-900">{isLoading ? "—" : totalReports}</p>
              <p className="text-xs text-gray-400 mt-1">All time</p>
            </div>

            <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Queries Left</span>
                <BarChart2 className="w-4 h-4 text-[#00D26A]" />
              </div>
              <p className="text-3xl font-bold text-[#00D26A]">
                {quota ? quota.quotaRemaining : (user?.quotaRemaining ?? "—")}
              </p>
              <p className="text-xs text-gray-400 mt-1">
                {quota ? `of ${quota.monthlyQuota} monthly` : "queries remaining"}
              </p>
            </div>

            <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Active Scans</span>
                <Zap className="w-4 h-4 text-blue-400" />
              </div>
              <p className="text-3xl font-bold text-gray-900">{isLoading ? "—" : activeScans}</p>
              <p className="text-xs text-gray-400 mt-1">In progress</p>
            </div>

            <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Risk Alerts</span>
                <AlertTriangle className="w-4 h-4 text-red-400" />
              </div>
              <p className="text-3xl font-bold text-red-500">{isLoading ? "—" : riskAlerts}</p>
              <p className="text-xs text-gray-400 mt-1">High risk entities</p>
            </div>
          </div>

          {/* Quick Verify */}
          <div className="bg-white rounded-xl border border-gray-100 p-6 shadow-sm mb-8">
            <h2 className="text-base font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Search className="w-4 h-4 text-[#00D26A]" />
              Quick Verify
            </h2>
            <form onSubmit={handleQuickVerify} className="flex gap-3 flex-wrap">
              <input
                value={quickSearch}
                onChange={(e) => setQuickSearch(e.target.value)}
                placeholder="Company name..."
                className="flex-1 min-w-48 px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#00D26A] focus:ring-2 focus:ring-[#00D26A]/20"
              />
              <select
                value={quickCountry}
                onChange={(e) => setQuickCountry(e.target.value)}
                className="px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#00D26A] bg-white"
              >
                <option value="">All Countries</option>
                <option value="US">United States</option>
                <option value="CN">China</option>
                <option value="VN">Vietnam</option>
                <option value="DE">Germany</option>
                <option value="GB">United Kingdom</option>
                <option value="JP">Japan</option>
                <option value="KR">South Korea</option>
                <option value="IN">India</option>
              </select>
              <button
                type="submit"
                className="px-6 py-2.5 bg-[#00D26A] text-white font-semibold rounded-lg hover:bg-[#00b85d] transition-colors text-sm"
              >
                Search & Verify
              </button>
            </form>
          </div>

          {/* Recent Reports */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-base font-bold text-gray-900">Recent Reports</h2>
              <Link
                href="/verify"
                className="text-sm text-[#00D26A] hover:underline font-medium"
              >
                New Verification →
              </Link>
            </div>

            {isLoading ? (
              <div className="p-12 text-center text-gray-400">Loading reports...</div>
            ) : reports.length === 0 ? (
              <div className="p-12 text-center">
                <FileText className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                <p className="text-gray-500 text-sm">No reports yet.</p>
                <Link href="/verify" className="mt-3 inline-block text-sm text-[#00D26A] hover:underline">
                  Start your first verification
                </Link>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="text-xs font-semibold text-gray-500 uppercase tracking-wider bg-gray-50">
                      <th className="px-6 py-3 text-left">Company</th>
                      <th className="px-6 py-3 text-left">Country</th>
                      <th className="px-6 py-3 text-left">Score</th>
                      <th className="px-6 py-3 text-left">Risk Level</th>
                      <th className="px-6 py-3 text-left">Status</th>
                      <th className="px-6 py-3 text-left">Date</th>
                      <th className="px-6 py-3 text-left">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {reports.map((report) => (
                      <tr key={report.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 text-sm font-medium text-gray-900">
                          {report.entityName}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500">
                          {report.countryIso2 || "—"}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`text-sm font-bold ${getScoreColor(report.overallScore)}`}>
                            {report.overallScore}/100
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${getRiskColor(report.riskLevel)}`}>
                            {report.riskLevel}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`text-xs font-medium ${
                            report.status === "COMPLETED" ? "text-emerald-600" :
                            report.status === "PROCESSING" ? "text-blue-600" :
                            report.status === "FAILED" ? "text-red-600" : "text-gray-500"
                          }`}>
                            {report.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500">
                          {report.createdAt
                            ? new Date(report.createdAt).toLocaleDateString()
                            : "—"}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <Link
                              href={`/reports/${report.id}`}
                              className="flex items-center gap-1 text-xs font-medium text-[#00D26A] hover:underline"
                            >
                              <ExternalLink className="w-3 h-3" />
                              View
                            </Link>
                            <button
                              onClick={() => router.push(`/verify?rescan=${report.id}`)}
                              className="flex items-center gap-1 text-xs font-medium text-gray-400 hover:text-gray-600"
                            >
                              <RefreshCw className="w-3 h-3" />
                              Re-scan
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </main>
      </div>
    </AuthGuard>
  );
}

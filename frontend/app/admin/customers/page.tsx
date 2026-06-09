"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  BarChart2, Users, DollarSign, Ban, Database,
  Search, Download, UserPlus, History, Key, Terminal, CreditCard
} from "lucide-react";
import { toast } from "sonner";
import { AuthGuard } from "@/components/shared/auth-guard";
import { setUserQuota, refundUserQuota } from "@/services/admin.service";

interface AdminUser {
  id: string;
  email: string;
  fullName: string;
  initials: string;
  avatarColor: string;
  companyId: string;
  role: string;
  quotaRemaining: number;
  emailVerified: boolean;
  planName: string;
  planColor: string;
  totalSpent: number;
  systemStatus: string;
  quotaUsed: number;
  monthlyQuota: number;
}

const MOCK_USERS: AdminUser[] = [
  {
    id: "usr-1",
    email: "amelia.mendez@apexflow.io",
    fullName: "Amelia Mendez",
    initials: "AM",
    avatarColor: "bg-teal-500",
    companyId: "MSC-9482",
    role: "USER",
    quotaRemaining: 750,
    emailVerified: true,
    planName: "Enterprise",
    planColor: "bg-pink-100 text-pink-700",
    totalSpent: 14500,
    systemStatus: "ACTIVE",
    quotaUsed: 4250,
    monthlyQuota: 5000,
  },
  {
    id: "usr-2",
    email: "tobias.foley@techhorizon.net",
    fullName: "Tobias Foley",
    initials: "TF",
    avatarColor: "bg-gray-800",
    companyId: "MSC-1052",
    role: "USER",
    quotaRemaining: 390,
    emailVerified: true,
    planName: "Pro Tier",
    totalSpent: 3400,
    systemStatus: "PAST_DUE",
    quotaUsed: 610,
    monthlyQuota: 1000,
    planColor: "bg-purple-100 text-purple-700",
  },
  {
    id: "usr-3",
    email: "clara.valerie@designhub.co",
    fullName: "Clara Valerie",
    initials: "CV",
    avatarColor: "bg-blue-500",
    companyId: "MSC-8841",
    role: "USER",
    quotaRemaining: 10,
    emailVerified: true,
    planName: "Starter",
    planColor: "bg-blue-100 text-blue-700",
    totalSpent: 450,
    systemStatus: "ACTIVE",
    quotaUsed: 240,
    monthlyQuota: 250,
  },
  {
    id: "usr-4",
    email: "devon.lane@codestack.dev",
    fullName: "Devon Lane",
    initials: "DL",
    avatarColor: "bg-gray-500",
    companyId: "MSC-4389",
    role: "USER",
    quotaRemaining: 40,
    emailVerified: false,
    planName: "Free Tier",
    planColor: "bg-gray-100 text-gray-600",
    totalSpent: 0,
    systemStatus: "ACTIVE",
    quotaUsed: 10,
    monthlyQuota: 50,
  },
  {
    id: "usr-5",
    email: "harvey.spector@pearson.law",
    fullName: "Harvey Spector",
    initials: "HS",
    avatarColor: "bg-red-600",
    companyId: "MSC-1120",
    role: "USER",
    quotaRemaining: 20,
    emailVerified: true,
    planName: "Pro Tier",
    planColor: "bg-purple-100 text-purple-700",
    totalSpent: 3600,
    systemStatus: "SUSPENDED",
    quotaUsed: 980,
    monthlyQuota: 1000,
  },
];

const SIDEBAR_SECTIONS = [
  {
    label: "Core Platform",
    items: [
      { label: "Overview", href: "/admin", icon: BarChart2 },
      { label: "Customers", href: "/admin/customers", icon: Users, active: true },
      { label: "Quota Matrix", href: "/admin/quota", icon: Database },
      { label: "Billing Systems", href: "/admin/billing", icon: CreditCard },
    ],
  },
  {
    label: "Audit & Logs",
    items: [
      { label: "Global History", href: "/admin/history", icon: History },
      { label: "Access Tokens", href: "/admin/tokens", icon: Key },
      { label: "System Logs", href: "/admin/logs", icon: Terminal },
    ],
  },
];

function getQuotaBarColor(percent: number) {
  if (percent >= 90) return "bg-red-500";
  if (percent >= 70) return "bg-yellow-500";
  if (percent >= 50) return "bg-orange-400";
  return "bg-[#00D26A]";
}

function getStatusBadge(status: string) {
  switch (status) {
    case "ACTIVE": return "text-emerald-600 before:bg-emerald-500";
    case "PAST_DUE": return "text-orange-600 before:bg-orange-500";
    case "SUSPENDED": return "text-red-600 before:bg-red-500";
    default: return "text-gray-600 before:bg-gray-400";
  }
}

function getStatusLabel(status: string) {
  switch (status) {
    case "ACTIVE": return "Active";
    case "PAST_DUE": return "Past Due";
    case "SUSPENDED": return "Suspended";
    default: return status;
  }
}

export default function AdminCustomersPage() {
  const [users] = useState<AdminUser[]>(MOCK_USERS);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [planFilter, setPlanFilter] = useState("all");
  const [showNoResults, setShowNoResults] = useState(false);
  const [quotaModal, setQuotaModal] = useState<{ userId: string; name: string } | null>(null);
  const [quotaValue, setQuotaValue] = useState("50");

  useEffect(() => {
    setIsLoading(false);
  }, []);

  const filteredUsers = users.filter((u) => {
    if (showNoResults) return false;
    const matchSearch =
      !searchQuery ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.fullName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchPlan = planFilter === "all" || u.planName.toLowerCase().includes(planFilter.toLowerCase());
    return matchSearch && matchPlan;
  });

  const handleSetQuota = async () => {
    if (!quotaModal) return;
    try {
      await setUserQuota(quotaModal.userId, parseInt(quotaValue));
      toast.success(`Quota updated for ${quotaModal.name}`);
      setQuotaModal(null);
    } catch {
      toast.error("Failed to update quota.");
    }
  };

  const handleRefund = async (userId: string, name: string) => {
    try {
      await refundUserQuota(userId);
      toast.success(`Refund issued for ${name}`);
    } catch {
      toast.error("Failed to process refund.");
    }
  };

  const totalRevenue = users.reduce((s, u) => s + (u.totalSpent || 0), 0);
  const activePaid = users.filter((u) => u.systemStatus === "ACTIVE" && u.planName !== "Free Tier").length;
  const suspended = users.filter((u) => u.systemStatus === "SUSPENDED").length;
  const avgQuotaPercent = Math.round(
    users.reduce((s, u) => s + ((u.quotaUsed || 0) / (u.monthlyQuota || 1)), 0) / Math.max(users.length, 1) * 100
  );

  const METRIC_CARDS = [
    {
      label: "Total Revenue",
      value: `$${totalRevenue.toLocaleString()}.00`,
      sub: "+18.4% vs prior month",
      subColor: "text-emerald-600",
      icon: DollarSign,
      iconBg: "bg-teal-100",
      iconColor: "text-teal-600",
    },
    {
      label: "Active Paid Users",
      value: "1,482",
      sub: "+8.2%  84% of total base",
      subColor: "text-emerald-600",
      icon: Users,
      iconBg: "bg-teal-100",
      iconColor: "text-teal-600",
    },
    {
      label: "Suspended Accounts",
      value: suspended.toString(),
      sub: "Critical — Requires verification",
      subColor: "text-red-500",
      icon: Ban,
      iconBg: "bg-red-100",
      iconColor: "text-red-600",
    },
    {
      label: "Total Quota Used",
      value: `${avgQuotaPercent}%`,
      sub: "High load  9.4M queries",
      subColor: "text-yellow-600",
      icon: Database,
      iconBg: "bg-yellow-100",
      iconColor: "text-yellow-600",
    },
  ];

  return (
    <AuthGuard>
      <div className="min-h-screen flex bg-[#F8F9FA]">
        {/* SIDEBAR */}
        <aside className="w-60 shrink-0 flex flex-col bg-[#0D1117]">
          {/* Logo */}
          <div className="p-4 border-b border-white/5">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-[#1A2A1A] flex items-center justify-center">
                <BarChart2 className="w-4 h-4 text-[#00D26A]" />
              </div>
              <div>
                <p className="text-sm font-bold text-white">MarketScout</p>
                <p className="text-[10px] text-[#00D26A]">SUPER ADMIN</p>
              </div>
            </div>
          </div>

          {/* Nav sections */}
          <nav className="flex-1 p-3 space-y-5 pt-5">
            {SIDEBAR_SECTIONS.map((section) => (
              <div key={section.label}>
                <p className="text-[10px] text-gray-600 uppercase tracking-wider font-semibold mb-2 px-2">
                  {section.label}
                </p>
                <div className="space-y-0.5">
                  {section.items.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                        item.active
                          ? "bg-[#1A2635] text-white font-semibold"
                          : "text-gray-400 hover:text-white hover:bg-white/5"
                      }`}
                    >
                      <item.icon className="w-4 h-4" />
                      {item.label}
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </nav>

          {/* User info at bottom */}
          <div className="p-4 border-t border-white/5">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-teal-600 flex items-center justify-center text-white text-xs font-bold">EA</div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white truncate">Evelyn Albright</p>
                <p className="text-xs text-gray-500 truncate">evelyn.a@marketscout.co</p>
              </div>
              <div className="w-2 h-2 rounded-full bg-[#00D26A]" />
            </div>
          </div>
        </aside>

        {/* MAIN */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-6">
            {/* Breadcrumb */}
            <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold mb-4">
              Global Operations &gt; Customer Central
            </p>

            {/* Header row */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-bold text-gray-900">Customer Management</h1>
                <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold px-2 py-1 rounded-full">
                  SuperAdminConsole
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => toast.info("Export coming soon.")}
                  className="flex items-center gap-1.5 px-4 py-2 border border-gray-200 bg-white text-sm font-medium text-gray-600 rounded-lg hover:bg-gray-50"
                >
                  <Download className="w-4 h-4" />
                  Export Reports
                </button>
                <button
                  onClick={() => toast.info("Provision account coming soon.")}
                  className="flex items-center gap-1.5 px-4 py-2 bg-[#00D26A] text-white text-sm font-semibold rounded-lg hover:bg-[#00b85d]"
                >
                  <UserPlus className="w-4 h-4" />
                  Provision Account
                </button>
              </div>
            </div>

            {/* Metric cards */}
            <div className="grid grid-cols-4 gap-4 mb-6">
              {METRIC_CARDS.map((card) => (
                <div key={card.label} className="bg-white rounded-xl border border-gray-100 p-5">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{card.label}</span>
                    <div className={`w-9 h-9 rounded-lg ${card.iconBg} flex items-center justify-center`}>
                      <card.icon className={`w-4 h-4 ${card.iconColor}`} />
                    </div>
                  </div>
                  <p className="text-2xl font-bold text-gray-900">{card.value}</p>
                  <p className={`text-xs mt-1 ${card.subColor}`}>{card.sub}</p>
                </div>
              ))}
            </div>

            {/* Search & filters */}
            <div className="bg-white rounded-xl border border-gray-100 p-4 mb-4 flex items-center gap-3 flex-wrap">
              <div className="relative flex-1 min-w-48">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search customer base by email or domain..."
                  className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#00D26A]"
                />
              </div>
              <select
                value={planFilter}
                onChange={(e) => setPlanFilter(e.target.value)}
                className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none bg-white"
              >
                <option value="all">All Plans Statuses</option>
                <option value="free">Free</option>
                <option value="starter">Starter</option>
                <option value="pro">Pro</option>
                <option value="enterprise">Enterprise</option>
              </select>
              <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-600">
                <input
                  type="checkbox"
                  checked={showNoResults}
                  onChange={(e) => setShowNoResults(e.target.checked)}
                  className="w-4 h-4 accent-[#00D26A]"
                />
                Simulate &apos;No Results&apos;
              </label>
              <button
                onClick={() => toast.success("Filters applied.")}
                className="px-4 py-2 bg-[#1A3A28] text-white text-sm font-semibold rounded-lg hover:bg-[#0D2218] transition-colors flex items-center gap-1.5"
              >
                ≡ Apply Filters
              </button>
            </div>

            {/* Table */}
            <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
              {isLoading ? (
                <div className="p-12 text-center text-gray-400">Loading customers...</div>
              ) : filteredUsers.length === 0 ? (
                <div className="p-12 text-center">
                  <Users className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                  <p className="text-gray-500 text-sm">No customers found.</p>
                </div>
              ) : (
                <table className="w-full">
                  <thead>
                    <tr className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider bg-gray-50 border-b border-gray-100">
                      <th className="px-5 py-3.5 text-left">Customer Profile</th>
                      <th className="px-5 py-3.5 text-left">Plan Level</th>
                      <th className="px-5 py-3.5 text-left">Current Quota Used</th>
                      <th className="px-5 py-3.5 text-left">Total Spent</th>
                      <th className="px-5 py-3.5 text-left">System Status</th>
                      <th className="px-5 py-3.5 text-left">Operational Controls</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {filteredUsers.map((user) => {
                      const qPercent =
                        user.monthlyQuota > 0
                          ? Math.min((user.quotaUsed / user.monthlyQuota) * 100, 100)
                          : 0;
                      return (
                        <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-3">
                              <div className={`w-9 h-9 rounded-lg ${user.avatarColor} flex items-center justify-center text-white font-bold text-sm`}>
                                {user.initials}
                              </div>
                              <div>
                                <p className="text-sm font-semibold text-gray-900">{user.fullName}</p>
                                <p className="text-xs text-gray-400">{user.email}</p>
                                <p className="text-xs text-gray-400 font-mono">ID: {user.companyId}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-5 py-4">
                            <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${user.planColor}`}>
                              {user.planName}
                            </span>
                          </td>
                          <td className="px-5 py-4 min-w-36">
                            <div className="flex items-center gap-2 mb-1">
                              <div className="flex-1 bg-gray-100 rounded-full h-1.5">
                                <div
                                  className={`h-1.5 rounded-full ${getQuotaBarColor(qPercent)}`}
                                  style={{ width: `${qPercent}%` }}
                                />
                              </div>
                              <span className="text-xs text-gray-500 shrink-0">{user.quotaUsed}/{user.monthlyQuota}</span>
                            </div>
                            <p className="text-xs text-gray-400">{qPercent.toFixed(0)}%</p>
                          </td>
                          <td className="px-5 py-4 text-sm font-semibold text-gray-800">
                            ${user.totalSpent.toLocaleString()}.00
                          </td>
                          <td className="px-5 py-4">
                            <span className={`text-xs font-semibold flex items-center gap-1.5 ${
                              user.systemStatus === "ACTIVE" ? "text-emerald-600" :
                              user.systemStatus === "PAST_DUE" ? "text-orange-500" :
                              "text-red-600"
                            }`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${
                                user.systemStatus === "ACTIVE" ? "bg-emerald-500" :
                                user.systemStatus === "PAST_DUE" ? "bg-orange-500" :
                                "bg-red-500"
                              }`} />
                              {user.systemStatus === "PAST_DUE" ? "Past Due" : user.systemStatus === "ACTIVE" ? "Active" : "Suspended"}
                            </span>
                          </td>
                          <td className="px-5 py-4">
                            <div className="flex gap-2">
                              <button
                                onClick={() => {
                                  setQuotaModal({ userId: user.id, name: user.fullName });
                                  setQuotaValue("50");
                                }}
                                className="px-3 py-1.5 text-xs font-semibold bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors"
                              >
                                Quota
                              </button>
                              <button
                                onClick={() => handleRefund(user.id, user.fullName)}
                                className="px-3 py-1.5 text-xs font-semibold bg-orange-50 text-orange-700 rounded-lg hover:bg-orange-100 transition-colors"
                              >
                                Refund
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}

              {/* Table footer */}
              <div className="px-5 py-4 border-t border-gray-100 flex items-center justify-between bg-white">
                <p className="text-xs text-gray-500">Showing 1–5 of 1,482 registered accounts</p>
                <div className="flex items-center gap-2">
                  <button className="px-3 py-1.5 border border-gray-200 rounded-lg text-xs text-gray-400 cursor-not-allowed">Previous</button>
                  <span className="text-xs text-gray-600 font-medium">Page 1 of 297</span>
                  <button className="px-3 py-1.5 border border-gray-200 rounded-lg text-xs text-gray-700 bg-gray-900 text-white hover:bg-gray-700">Next</button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Quota modal */}
        {quotaModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl p-6 w-full max-w-sm">
              <h3 className="text-base font-bold text-gray-900 mb-1">Set Quota</h3>
              <p className="text-sm text-gray-500 mb-4">Update monthly quota for <strong>{quotaModal.name}</strong></p>
              <input
                type="number"
                value={quotaValue}
                onChange={(e) => setQuotaValue(e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#00D26A] mb-4"
                min="0"
              />
              <div className="flex gap-3">
                <button onClick={handleSetQuota} className="flex-1 py-2.5 bg-[#00D26A] text-white font-semibold rounded-lg hover:bg-[#00b85d] text-sm">Apply</button>
                <button onClick={() => setQuotaModal(null)} className="flex-1 py-2.5 border border-gray-200 text-gray-600 font-medium rounded-lg hover:bg-gray-50 text-sm">Cancel</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AuthGuard>
  );
}

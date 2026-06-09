"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  User, Mail, Lock, CheckCircle2, BarChart2,
  Bell, Shield, CreditCard, Download, Zap,
  Clock, Key, ChevronRight
} from "lucide-react";
import { toast } from "sonner";
import { AuthGuard } from "@/components/shared/auth-guard";
import { useAuth } from "@/providers/auth-provider";
import { updateProfile, changePassword } from "@/services/auth.service";
import { getMyQuota } from "@/services/quota.service";
import { QuotaStatus } from "@/types/quota";

const MOCK_BILLING = [
  { date: "Oct 01, 2024", plan: "Pro Plan", ref: "REF-2024-10-PRO", amount: "5,800,000 VND", invoice: "#INV-2024-10" },
  { date: "Sep 01, 2024", plan: "Pro Plan", ref: "REF-2024-09-PRO", amount: "5,800,000 VND", invoice: "#INV-2024-09" },
  { date: "Aug 01, 2024", plan: "Starter Plan", ref: "REF-2024-08-STR", amount: "2,000,000 VND", invoice: "#INV-2024-08" },
  { date: "Jul 01, 2024", plan: "Starter Plan", ref: "REF-2024-07-STR", amount: "2,000,000 VND", invoice: "#INV-2024-07" },
];

const SIDEBAR_TABS = [
  { id: "profile", label: "Profile Info", icon: User },
  { id: "subscription", label: "Subscription & Quota", icon: Zap },
  { id: "history", label: "Verification History", icon: Clock },
  { id: "security", label: "Security & Sessions", icon: Key },
];

function Toggle({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <button
      type="button"
      onClick={onChange}
      className={`relative w-10 h-5 rounded-full transition-colors ${checked ? "bg-[#00D26A]" : "bg-gray-200"}`}
    >
      <div
        className="absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform shadow-sm"
        style={{ transform: checked ? "translateX(22px)" : "translateX(2px)" }}
      />
    </button>
  );
}

export default function ProfilePage() {
  const { user, refreshUser } = useAuth();
  const [quota, setQuota] = useState<QuotaStatus | null>(null);
  const [activeTab, setActiveTab] = useState("profile");

  const [profileForm, setProfileForm] = useState({
    fullName: user?.fullName || "",
    email: user?.email || "",
    phone: user?.phone || "",
    taxId: user?.taxId || "",
  });

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [showPasswordForm, setShowPasswordForm] = useState(false);

  const [notifications, setNotifications] = useState({
    quotaAlert: true,
    reportComplete: true,
  });

  useEffect(() => {
    if (user) {
      setProfileForm({
        fullName: user.fullName || "",
        email: user.email || "",
        phone: user.phone || "",
        taxId: user.taxId || "",
      });
    }
    getMyQuota().then(setQuota).catch(() => null);
  }, [user]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingProfile(true);
    try {
      await updateProfile({
        fullName: profileForm.fullName,
        phone: profileForm.phone,
        taxId: profileForm.taxId,
      });
      await refreshUser();
      toast.success("Profile updated successfully.");
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        "Failed to update profile.";
      toast.error(message);
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error("Passwords do not match.");
      return;
    }
    setIsChangingPassword(true);
    try {
      await changePassword({
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      });
      toast.success("Password changed successfully.");
      setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
      setShowPasswordForm(false);
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        "Failed to change password.";
      toast.error(message);
    } finally {
      setIsChangingPassword(false);
    }
  };

  const quotaUsed = quota ? quota.quotaUsedThisCycle : 2750;
  const quotaTotal = quota ? quota.monthlyQuota : 10000;
  const quotaRemaining = quota ? quota.quotaRemaining : 7250;
  const quotaPercent = quotaTotal > 0 ? Math.min((quotaUsed / quotaTotal) * 100, 100) : 0;
  const safetyMargin = quotaTotal > 0 ? ((quotaRemaining / quotaTotal) * 100).toFixed(1) : "72.5";

  return (
    <AuthGuard>
      <div className="flex h-screen bg-gray-50 overflow-hidden">
        {/* TOP NAV */}
        <div className="fixed top-0 left-0 right-0 h-14 bg-white border-b border-gray-100 flex items-center px-6 justify-between z-10">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#00D26A]/10 flex items-center justify-center">
              <BarChart2 className="w-4 h-4 text-[#00D26A]" />
            </div>
            <span className="font-bold text-gray-900">MarketScout</span>
            <span className="text-gray-400 text-xs font-semibold uppercase tracking-wider">INTELLIGENCE HUB</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5 text-xs text-emerald-600 font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              API Connected
            </span>
            <span className="text-sm text-gray-600">Morgan Sterling <span className="text-[#00D26A] font-semibold">PRO Member</span></span>
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold">
              MS
            </div>
          </div>
        </div>

        {/* LEFT SIDEBAR */}
        <aside className="w-52 shrink-0 bg-white border-r border-gray-100 pt-20 flex flex-col">
          <nav className="px-2 flex-1 space-y-0.5">
            {SIDEBAR_TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm transition-colors text-left ${
                  activeTab === tab.id
                    ? "text-[#00D26A] font-semibold bg-green-50"
                    : "text-gray-600 hover:bg-gray-50"
                }`}
              >
                <tab.icon className="w-4 h-4 shrink-0" />
                {tab.label}
              </button>
            ))}
          </nav>

          {/* Need Assistance */}
          <div className="m-3 bg-[#0A0E1A] rounded-xl p-4 text-white">
            <p className="text-xs font-semibold mb-1">Need Assistance?</p>
            <p className="text-xs text-gray-400 mb-3">Our support team is here to help you.</p>
            <button className="text-xs text-[#00D26A] hover:underline font-medium">Contact Expert Support →</button>
          </div>
        </aside>

        {/* MAIN CONTENT */}
        <main className="flex-1 overflow-y-auto pt-14">
          <div className="max-w-3xl mx-auto p-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-1">Account Management</h1>
            <p className="text-gray-500 text-sm mb-8">
              Update your details, monitor query allocations, and customize security keys.
            </p>

            <div className="space-y-6">
              {/* PERSONAL PROFILE */}
              <div className="bg-white rounded-xl border border-gray-100 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-gray-900">Personal Profile</h2>
                  <span className="flex items-center gap-1 bg-green-50 text-green-600 text-xs font-semibold px-2 py-1 rounded-full border border-green-200">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Verified Identity
                  </span>
                </div>
                <p className="text-gray-500 text-sm mb-5">Your essential system credentials and identification details.</p>

                <form onSubmit={handleSaveProfile} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Full Name</label>
                      <input
                        value={profileForm.fullName}
                        onChange={(e) => setProfileForm((f) => ({ ...f, fullName: e.target.value }))}
                        className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#00D26A] focus:ring-2 focus:ring-[#00D26A]/10"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Email Address</label>
                      <div className="relative">
                        <input
                          type="email"
                          value={profileForm.email}
                          disabled
                          className="w-full px-3 pr-32 py-2.5 border border-gray-200 rounded-lg text-sm bg-gray-50 text-gray-500 cursor-not-allowed"
                        />
                        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1">
                          <span className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded font-bold">PRIMARY & VERIFIED</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowPasswordForm(!showPasswordForm)}
                      className="flex items-center gap-2 px-4 py-2.5 border border-gray-200 text-gray-600 text-sm font-medium rounded-lg hover:bg-gray-50"
                    >
                      <Lock className="w-4 h-4" />
                      Change Password
                    </button>
                    <button
                      type="button"
                      onClick={() => setProfileForm({ fullName: user?.fullName || "", email: user?.email || "", phone: user?.phone || "", taxId: user?.taxId || "" })}
                      className="px-4 py-2.5 border border-gray-200 text-gray-600 text-sm font-medium rounded-lg hover:bg-gray-50"
                    >
                      Reset Form
                    </button>
                    <button
                      type="submit"
                      disabled={isSavingProfile}
                      className="px-5 py-2.5 bg-gray-900 text-white text-sm font-semibold rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-60 flex items-center gap-2 ml-auto"
                    >
                      {isSavingProfile && <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                      Save Changes
                    </button>
                  </div>
                </form>

                {showPasswordForm && (
                  <form onSubmit={handleChangePassword} className="mt-6 pt-6 border-t border-gray-100 space-y-4">
                    <h3 className="text-sm font-bold text-gray-700">Change Password</h3>
                    <div className="grid grid-cols-3 gap-4">
                      {[
                        { key: "currentPassword" as const, label: "Current Password" },
                        { key: "newPassword" as const, label: "New Password" },
                        { key: "confirmPassword" as const, label: "Confirm" },
                      ].map(({ key, label }) => (
                        <div key={key}>
                          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">{label}</label>
                          <input
                            type="password"
                            value={passwordForm[key]}
                            onChange={(e) => setPasswordForm((f) => ({ ...f, [key]: e.target.value }))}
                            className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#00D26A]"
                          />
                        </div>
                      ))}
                    </div>
                    <button
                      type="submit"
                      disabled={isChangingPassword}
                      className="px-5 py-2.5 bg-gray-900 text-white text-sm font-semibold rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-60 flex items-center gap-2"
                    >
                      {isChangingPassword && <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                      Update Password
                    </button>
                  </form>
                )}
              </div>

              {/* CURRENT PACKAGE */}
              <div className="bg-white rounded-xl border border-gray-100 p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <span className="bg-[#0A0E1A] text-white text-xs font-semibold px-2 py-1 rounded">ENTERPRISE ENGINE</span>
                    <div className="flex items-center gap-3 mt-3">
                      <h2 className="text-xl font-bold text-gray-900">Pro Plan Account</h2>
                      <span className="flex items-center gap-1 text-xs text-emerald-600 font-semibold">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        Active Status
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 mt-0.5">Next billing date: Oct 28, 2024</p>
                  </div>
                </div>
                <p className="text-sm text-gray-500 mb-5">Premium access configured for deep historical search.</p>

                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">System Quota Monitor</p>

                <div className="flex items-end justify-between mb-3">
                  <div>
                    <span className="text-4xl font-bold text-gray-900">{quotaRemaining.toLocaleString()}</span>
                    <span className="text-gray-500 text-sm ml-2">queries remaining of {quotaTotal.toLocaleString()}</span>
                  </div>
                  <Link
                    href="/checkout?plan=pro"
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 transition-colors"
                  >
                    <Zap className="w-4 h-4" />
                    Top-up Quota
                  </Link>
                </div>

                {/* Progress bar */}
                <div className="w-full bg-gray-100 rounded-full h-3 mb-2">
                  <div
                    className="h-3 rounded-full transition-all"
                    style={{
                      width: `${100 - quotaPercent}%`,
                      background: "linear-gradient(90deg, #86efac 0%, #00D26A 100%)",
                    }}
                  />
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-400">{safetyMargin}% allocation safety margin</span>
                  <span className="text-[#00D26A] font-medium flex items-center gap-1">
                    ♺ Quota purchased via top-up never expires
                  </span>
                </div>

                <div className="flex gap-3 mt-5 pt-5 border-t border-gray-100">
                  <button className="px-4 py-2 border border-gray-200 text-gray-600 text-sm font-medium rounded-lg hover:bg-gray-50">
                    Cancel Subscription
                  </button>
                  <Link
                    href="/pricing"
                    className="px-4 py-2 bg-[#00D26A] text-white text-sm font-semibold rounded-lg hover:bg-[#00b85d] transition-colors"
                  >
                    Upgrade Plan
                  </Link>
                </div>
              </div>

              {/* NOTIFICATIONS & SECURITY */}
              <div className="bg-white rounded-xl border border-gray-100 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-1">Notification & Security Controls</h2>
                <p className="text-gray-500 text-sm mb-5">Manage real-time alerts and revoke active database integration sessions.</p>

                <div className="space-y-1">
                  {[
                    { key: "quotaAlert" as const, label: "Alert on Quota Depletion", desc: "Receive email when quota falls below 20%" },
                    { key: "reportComplete" as const, label: "Report Completion Emails", desc: "Get notified when verifications are complete" },
                  ].map(({ key, label, desc }) => (
                    <div key={key} className="flex items-start justify-between py-4 border-b border-gray-50">
                      <div className="flex items-start gap-3">
                        <Bell className="w-4 h-4 text-gray-400 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium text-gray-800">{label}</p>
                          <p className="text-xs text-gray-400">{desc}</p>
                        </div>
                      </div>
                      <Toggle
                        checked={notifications[key]}
                        onChange={() => setNotifications((n) => ({ ...n, [key]: !n[key] }))}
                      />
                    </div>
                  ))}
                  <div className="flex items-start justify-between py-4">
                    <div className="flex items-start gap-3">
                      <Shield className="w-4 h-4 text-gray-400 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-gray-800">Active API & Web Sessions</p>
                        <p className="text-xs text-gray-400">Track all active authentication sessions</p>
                      </div>
                    </div>
                    <button
                      onClick={() => toast.info("Revoked all active sessions.")}
                      className="px-3 py-1.5 border border-red-200 text-red-600 text-xs font-semibold rounded-lg hover:bg-red-50 transition-colors"
                    >
                      Revoke Active Sessions
                    </button>
                  </div>
                </div>
              </div>

              {/* BILLING HISTORY */}
              <div className="bg-white rounded-xl border border-gray-100 p-6">
                <div className="flex items-center justify-between mb-5">
                  <h2 className="text-lg font-semibold text-gray-900">Payment & Billing History</h2>
                  <button className="flex items-center gap-1.5 text-sm text-[#00D26A] hover:underline font-medium">
                    <Download className="w-4 h-4" />
                    Export All PDFs
                  </button>
                </div>
                <p className="text-gray-500 text-sm mb-5">Review recent transactional activity and download invoices.</p>

                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider bg-gray-50">
                        <th className="px-4 py-3 text-left">Billing Date</th>
                        <th className="px-4 py-3 text-left">Plan Details</th>
                        <th className="px-4 py-3 text-left">Transaction Amount</th>
                        <th className="px-4 py-3 text-left">Documents</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {MOCK_BILLING.map((row, i) => (
                        <tr key={i} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm text-gray-600">{row.date}</td>
                          <td className="px-4 py-3">
                            <p className="text-sm font-medium text-gray-900">{row.plan}</p>
                            <p className="text-xs text-[#00D26A]">{row.ref}</p>
                          </td>
                          <td className="px-4 py-3 text-sm font-semibold text-gray-700">{row.amount}</td>
                          <td className="px-4 py-3">
                            <button
                              onClick={() => toast.info("Invoice download coming soon.")}
                              className="flex items-center gap-1 text-xs text-[#00D26A] hover:underline font-medium"
                            >
                              <Download className="w-3 h-3" />
                              PDF Invoice
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-50">
                  <p className="text-xs text-gray-400">Showing last 4 transactions</p>
                  <button className="text-xs text-[#00D26A] hover:underline font-medium flex items-center gap-0.5">
                    View Extended Archive
                    <ChevronRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="mt-8 pt-6 border-t border-gray-100 flex items-center justify-between">
              <p className="text-xs text-gray-400">&copy; 2024 MarketScout Analytics Inc.</p>
              <div className="flex gap-4">
                {["Privacy Policy", "Terms of Use", "API License Agreement"].map((link) => (
                  <a key={link} href="#" className="text-xs text-gray-400 hover:text-gray-600 transition-colors">
                    {link}
                  </a>
                ))}
              </div>
            </div>
          </div>
        </main>
      </div>
    </AuthGuard>
  );
}

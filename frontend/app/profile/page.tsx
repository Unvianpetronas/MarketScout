"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  User, Lock, CheckCircle2,
  Bell, Shield, Download, Zap, Clock, Key,
  CreditCard, Camera, Mail, Phone, Building2,
  ChevronRight, AlertCircle, Star, XCircle
} from "lucide-react";
import { toast } from "sonner";
import { AuthGuard } from "@/components/shared/auth-guard";
import { Sidebar } from "@/components/layout/sidebar";
import { useAuth } from "@/providers/auth-provider";
import { useLanguage } from "@/providers/language-provider";
import { updateProfile, changePassword } from "@/services/auth.service";
import { getMyQuota } from "@/services/quota.service";
import { getMyInvoices, cancelScheduledPlanChange, getSubscription, cancelSubscription, SubscriptionInfo } from "@/services/payment.service";
import { QuotaStatus } from "@/types/quota";
import { InvoiceSummary } from "@/types/payment";

const VND = new Intl.NumberFormat("vi-VN");

function formatBillingDate(value: string | number | null): string {
  if (!value) return "—";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString("vi-VN");
}

function billingStatusLabel(status: string): string {
  switch (status) {
    case "paid": return "Paid";
    case "pending": return "Pending";
    case "expired": return "Expired";
    default: return status;
  }
}

const TABS = [
  { id: "profile", labelKey: "profile.tab.profile", icon: User },
  { id: "subscription", labelKey: "profile.tab.subscription", icon: Zap },
  { id: "security", labelKey: "profile.tab.security", icon: Shield },
  { id: "billing", labelKey: "profile.tab.billing", icon: CreditCard },
];

function Toggle({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <button onClick={onChange} type="button"
      className={`relative w-11 h-6 rounded-full transition-all ${checked ? "bg-[#059669]" : "bg-gray-200"}`}>
      <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${checked ? "translate-x-6" : "translate-x-1"}`} />
    </button>
  );
}

export default function ProfilePage() {
  const { user, refreshUser } = useAuth();
  const { t } = useLanguage();
  const [quota, setQuota] = useState<QuotaStatus | null>(null);
  const [invoices, setInvoices] = useState<InvoiceSummary[]>([]);
  const [activeTab, setActiveTab] = useState("profile");

  const [profileForm, setProfileForm] = useState({
    fullName: user?.fullName || "", email: user?.email || "",
    phone: user?.phone || "", taxId: user?.taxId || "",
  });
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "", newPassword: "", confirmPassword: "",
  });
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [notifications, setNotifications] = useState({ quotaAlert: true, reportComplete: true, marketing: false });
  const [cancellingPlanChange, setCancellingPlanChange] = useState(false);
  const [subscription, setSubscription] = useState<SubscriptionInfo | null>(null);
  const [cancellingSub, setCancellingSub] = useState(false);

  const handleCancelSubscription = async () => {
    if (!window.confirm(t("profile.cancelSubConfirm"))) return;
    setCancellingSub(true);
    try {
      const res = await cancelSubscription();
      setSubscription(res);
      toast.success(t("profile.cancelSubSuccess", { date: formatBillingDate(res.currentPeriodEnd) }));
      await refreshUser();
    } catch {
      toast.error(t("profile.cancelSubError"));
    } finally {
      setCancellingSub(false);
    }
  };

  const handleCancelPendingPlanChange = async () => {
    setCancellingPlanChange(true);
    try {
      await cancelScheduledPlanChange();
      toast.success(t("pricing.schedule.cancelled"));
      await refreshUser();
    } catch {
      toast.error(t("pricing.schedule.toastError"));
    } finally {
      setCancellingPlanChange(false);
    }
  };

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- sync form + quota from loaded user */
    if (user) {
      setProfileForm({ fullName: user.fullName || "", email: user.email || "", phone: user.phone || "", taxId: user.taxId || "" });
    }
    getMyQuota().then(setQuota).catch(() => null);
    getMyInvoices().then(setInvoices).catch(() => null);
    getSubscription().then(setSubscription).catch(() => null);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [user]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingProfile(true);
    try {
      await updateProfile({ fullName: profileForm.fullName, phone: profileForm.phone, taxId: profileForm.taxId });
      await refreshUser();
      toast.success(t("profile.savedOk"));
    } catch (err: unknown) {
      toast.error((err as { response?: { data?: { message?: string } } })?.response?.data?.message || t("profile.saveFail"));
    } finally { setIsSavingProfile(false); }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordForm.newPassword !== passwordForm.confirmPassword) { toast.error(t("profile.pwMismatch")); return; }
    setIsChangingPassword(true);
    try {
      await changePassword({ currentPassword: passwordForm.currentPassword, newPassword: passwordForm.newPassword });
      toast.success(t("profile.pwOk"));
      setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
      setShowPasswordForm(false);
    } catch (err: unknown) {
      toast.error((err as { response?: { data?: { message?: string } } })?.response?.data?.message || t("profile.pwFail"));
    } finally { setIsChangingPassword(false); }
  };

  const quotaUsed = quota?.quotaUsedThisCycle ?? 0;
  const quotaTotal = quota?.monthlyQuota ?? 100;
  const quotaRemaining = quota?.quotaRemaining ?? 100;
  const quotaPercent = Math.min((quotaUsed / Math.max(quotaTotal, 1)) * 100, 100);

  const userInitials = (user?.fullName || "U").split(" ").map((n: string) => n[0]).slice(0, 2).join("").toUpperCase();

  return (
    <AuthGuard>
      <div className="flex h-screen overflow-hidden bg-[#faf9f6]">
        <Sidebar active="profile" />

        <div className="flex-1 flex overflow-hidden">
          {/* ── Settings Tabs Sidebar ── */}
          <aside className="w-56 bg-white border-r border-[rgba(16,22,43,0.06)] flex flex-col shrink-0">
            <div className="p-5 border-b border-[rgba(16,22,43,0.06)]">
              <h2 className="text-sm font-bold text-gray-900">{t("profile.accountSettings")}</h2>
              <p className="text-xs text-gray-400 mt-0.5">{t("profile.manageAccount")}</p>
            </div>
            <nav className="px-2 pt-4 flex-1 space-y-0.5">
              {TABS.map((tab) => (
                <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm transition-all text-left ${
                    activeTab === tab.id
                      ? "bg-[#E7F6EF] text-[#047857] font-semibold"
                      : "text-gray-500 hover:bg-gray-50 hover:text-gray-700"
                  }`}>
                  <tab.icon className={`w-4 h-4 shrink-0 ${activeTab === tab.id ? "text-[#059669]" : "text-gray-400"}`} />
                  {t(tab.labelKey)}
                </button>
              ))}
            </nav>
            {/* Help card */}
            <div className="m-3 bg-[#0b1120] rounded-2xl p-4">
              <p className="text-xs font-bold text-white mb-1">{t("profile.needHelp")}</p>
              <p className="text-xs text-gray-400 mb-3">{t("profile.helpDesc")}</p>
              <button className="text-xs text-[#059669] hover:underline font-semibold flex items-center gap-1">
                {t("profile.contactSupport")} <ChevronRight className="w-3 h-3" />
              </button>
            </div>
          </aside>

          {/* ── Main Content ── */}
          <main className="flex-1 overflow-y-auto scrollbar-thin">
            <div className="max-w-3xl mx-auto px-8 py-8 space-y-6">
              
              {/* ── Profile Tab ── */}
              {activeTab === "profile" && (
                <>
                  {/* Avatar header */}
                  <div className="bg-white rounded-2xl border border-[rgba(16,22,43,0.06)] p-6 shadow-[0_2px_20px_rgba(16,22,43,0.03)] flex items-center gap-5">
                    <div className="relative">
                      <div className="w-20 h-20 rounded-2xl gradient-brand flex items-center justify-center text-white text-2xl font-extrabold shadow-lg">
                        {userInitials}
                      </div>
                      <button className="absolute -bottom-1.5 -right-1.5 w-7 h-7 bg-white border border-gray-200 rounded-lg flex items-center justify-center shadow-[0_2px_20px_rgba(16,22,43,0.03)] hover:bg-gray-50">
                        <Camera className="w-3.5 h-3.5 text-gray-500" />
                      </button>
                    </div>
                    <div>
                      <h1 className="text-xl font-extrabold text-gray-900">{user?.fullName || t("profile.userFallback")}</h1>
                      <p className="text-sm text-gray-400 mt-0.5">{user?.email}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <span className="flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                          <CheckCircle2 className="w-3 h-3" /> {t("profile.verified")}
                        </span>
                        <span className="text-xs text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-0.5 rounded-full font-semibold flex items-center gap-1">
                          <Star className="w-3 h-3" /> {user?.planName
                            ? `${user.planName.charAt(0).toUpperCase()}${user.planName.slice(1)} ${t("nav.planSuffix")}`
                            : t("nav.freePlan")}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Profile form */}
                  <div className="bg-white rounded-2xl border border-[rgba(16,22,43,0.06)] p-6 shadow-[0_2px_20px_rgba(16,22,43,0.03)]">
                    <h2 className="text-base font-bold text-gray-900 mb-5 flex items-center gap-2">
                      <User className="w-4 h-4 text-[#059669]" />
                      {t("profile.tab.profile")}
                    </h2>
                    <form onSubmit={handleSaveProfile} className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">{t("profile.fullName")}</label>
                          <div className="relative">
                            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
                            <input value={profileForm.fullName}
                              onChange={(e) => setProfileForm((f) => ({ ...f, fullName: e.target.value }))}
                              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus-ms transition-all" />
                          </div>
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">{t("profile.emailLocked")}</label>
                          <div className="relative">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
                            <input type="email" value={profileForm.email} disabled
                              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 text-gray-400 cursor-not-allowed" />
                          </div>
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">{t("profile.phone")}</label>
                          <div className="relative">
                            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
                            <input value={profileForm.phone}
                              onChange={(e) => setProfileForm((f) => ({ ...f, phone: e.target.value }))}
                              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus-ms" />
                          </div>
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">{t("profile.taxId")}</label>
                          <div className="relative">
                            <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
                            <input value={profileForm.taxId}
                              onChange={(e) => setProfileForm((f) => ({ ...f, taxId: e.target.value }))}
                              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus-ms" />
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center justify-between pt-2 border-t border-gray-50">
                        <button type="button" onClick={() => setShowPasswordForm(!showPasswordForm)}
                          className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700">
                          <Lock className="w-4 h-4" />
                          {showPasswordForm ? t("profile.hidePw") : t("profile.changePw")}
                        </button>
                        <button type="submit" disabled={isSavingProfile}
                          className="flex items-center gap-2 px-5 py-2.5 gradient-brand text-white text-sm font-semibold rounded-xl hover:opacity-90 disabled:opacity-60">
                          {isSavingProfile && <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                          {t("profile.saveChanges")}
                        </button>
                      </div>
                    </form>

                    {showPasswordForm && (
                      <form onSubmit={handleChangePassword} className="mt-6 pt-6 border-t border-[rgba(16,22,43,0.06)] space-y-4">
                        <h3 className="text-sm font-bold text-gray-800 flex items-center gap-2">
                          <Lock className="w-4 h-4 text-[#059669]" /> {t("profile.changePw")}
                        </h3>
                        <div className="grid grid-cols-3 gap-4">
                          {[
                            { key: "currentPassword" as const, label: t("profile.currentPw") },
                            { key: "newPassword" as const, label: t("profile.newPw") },
                            { key: "confirmPassword" as const, label: t("profile.confirmPw") },
                          ].map(({ key, label }) => (
                            <div key={key}>
                              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">{label}</label>
                              <input type="password" value={passwordForm[key]}
                                onChange={(e) => setPasswordForm((f) => ({ ...f, [key]: e.target.value }))}
                                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus-ms" />
                            </div>
                          ))}
                        </div>
                        <button type="submit" disabled={isChangingPassword}
                          className="flex items-center gap-2 px-5 py-2.5 gradient-brand text-white text-sm font-semibold rounded-xl hover:opacity-90 disabled:opacity-60">
                          {isChangingPassword && <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                          {t("profile.updatePw")}
                        </button>
                      </form>
                    )}
                  </div>
                </>
              )}

              {/* ── Subscription Tab ── */}
              {activeTab === "subscription" && (
                <>
                  <div className="bg-white rounded-2xl border border-[rgba(16,22,43,0.06)] p-6 shadow-[0_2px_20px_rgba(16,22,43,0.03)]">
                    <div className="flex items-start justify-between mb-5">
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-widest text-[#059669] bg-[#E7F6EF] px-3 py-1 rounded-full">
                          {t("profile.currentPlan")}
                        </span>
                        <h2 className="text-xl font-extrabold text-gray-900 mt-3">{user?.planName
                          ? `${user.planName.charAt(0).toUpperCase()}${user.planName.slice(1)} ${t("nav.planSuffix")}`
                          : t("nav.freePlan")}</h2>
                        <p className="text-sm text-gray-400 mt-0.5">
                          {t("profile.nextCyclePrefix")} {subscription?.currentPeriodEnd ? formatBillingDate(subscription.currentPeriodEnd) : "—"}
                        </p>
                      </div>
                      <Link href="/pricing" className="flex items-center gap-2 px-4 py-2 gradient-brand text-white text-sm font-semibold rounded-xl hover:opacity-90">
                        <Zap className="w-4 h-4" /> {t("nav.upgrade")}
                      </Link>
                    </div>

                    {user?.pendingPlanName && (
                      <div className="flex items-center justify-between gap-4 bg-purple-50 border border-purple-200 rounded-xl px-4 py-3 mb-4">
                        <div className="flex items-center gap-2.5">
                          <Clock className="w-4 h-4 text-purple-500 shrink-0" />
                          <p className="text-sm text-purple-800">
                            {t("pricing.schedule.banner", {
                              plan: user.pendingPlanName,
                              date: user.pendingPlanEffectiveAt
                                ? new Date(user.pendingPlanEffectiveAt).toLocaleDateString("vi-VN")
                                : "",
                            })}
                          </p>
                        </div>
                        <button onClick={handleCancelPendingPlanChange} disabled={cancellingPlanChange}
                          className="flex items-center gap-1.5 text-xs font-semibold text-purple-700 hover:text-purple-900 shrink-0 disabled:opacity-50">
                          <XCircle className="w-3.5 h-3.5" /> {t("pricing.schedule.cancelPending")}
                        </button>
                      </div>
                    )}

                    {subscription?.cancelAt && (
                      <div className="flex items-center gap-2.5 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-4">
                        <AlertCircle className="w-4 h-4 text-amber-500 shrink-0" />
                        <p className="text-sm text-amber-800">
                          {t("profile.subCanceledBanner", { date: formatBillingDate(subscription.currentPeriodEnd) })}
                        </p>
                      </div>
                    )}

                    <div className="bg-gray-50 rounded-2xl p-4 mb-4">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-sm font-bold text-gray-700">{t("profile.quotaUsage")}</p>
                        <p className="text-sm font-bold text-gray-900">{quotaUsed.toLocaleString()} / {quotaTotal.toLocaleString()}</p>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-3 mb-2">
                        <div className="h-3 rounded-full transition-all duration-700"
                          style={{ width: `${quotaPercent}%`, background: quotaPercent > 80 ? "#EF4444" : quotaPercent > 60 ? "#F59E0B" : "#059669" }} />
                      </div>
                      <div className="flex items-center justify-between text-xs text-gray-400">
                        <span>{t("profile.quotaRemaining", { n: quotaRemaining.toLocaleString() })}</span>
                        <span className="text-[#059669] font-semibold">{t("profile.quotaNoExpire")}</span>
                      </div>
                    </div>

                    {quotaPercent > 80 && (
                      <div className="flex items-center gap-3 p-3 bg-amber-50 border border-amber-200 rounded-xl text-sm">
                        <AlertCircle className="w-4 h-4 text-amber-500 shrink-0" />
                        <span className="text-amber-700">{t("profile.quotaLow")}</span>
                        <Link href="/checkout?plan=topup" className="ml-auto text-amber-700 font-bold hover:underline whitespace-nowrap">
                          {t("profile.topupArrow")}
                        </Link>
                      </div>
                    )}

                    <div className="flex gap-3 mt-4 pt-4 border-t border-[rgba(16,22,43,0.06)]">
                      <button onClick={handleCancelSubscription}
                        disabled={cancellingSub || !subscription?.paid || !!subscription?.cancelAt}
                        className="px-4 py-2 border border-gray-200 text-gray-600 text-sm rounded-xl hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed">
                        {subscription?.cancelAt ? t("profile.cancelSubDone") : t("profile.cancelSub")}
                      </button>
                      <Link href="/checkout?plan=topup"
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700">
                        <Zap className="w-4 h-4" /> {t("profile.topupMore")}
                      </Link>
                    </div>
                  </div>
                </>
              )}

              {/* ── Security Tab ── */}
              {activeTab === "security" && (
                <div className="space-y-4">
                  <div className="bg-white rounded-2xl border border-[rgba(16,22,43,0.06)] p-6 shadow-[0_2px_20px_rgba(16,22,43,0.03)]">
                    <h2 className="text-base font-bold text-gray-900 mb-5 flex items-center gap-2">
                      <Bell className="w-4 h-4 text-[#059669]" /> {t("profile.notifications")}
                    </h2>
                    <div className="space-y-0.5">
                      {[
                        { key: "quotaAlert" as const, label: t("profile.notif.quotaAlert"), desc: t("profile.notif.quotaAlertDesc") },
                        { key: "reportComplete" as const, label: t("profile.notif.reportComplete"), desc: t("profile.notif.reportCompleteDesc") },
                        { key: "marketing" as const, label: t("profile.notif.marketing"), desc: t("profile.notif.marketingDesc") },
                      ].map(({ key, label, desc }) => (
                        <div key={key} className="flex items-center justify-between py-3.5 border-b border-gray-50">
                          <div>
                            <p className="text-sm font-semibold text-gray-800">{label}</p>
                            <p className="text-xs text-gray-400">{desc}</p>
                          </div>
                          <Toggle checked={notifications[key]} onChange={() => setNotifications((n) => ({ ...n, [key]: !n[key] }))} />
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="bg-white rounded-2xl border border-[rgba(16,22,43,0.06)] p-6 shadow-[0_2px_20px_rgba(16,22,43,0.03)]">
                    <h2 className="text-base font-bold text-gray-900 mb-5 flex items-center gap-2">
                      <Key className="w-4 h-4 text-[#059669]" /> {t("profile.sessions")}
                    </h2>
                    <div className="flex items-center justify-between py-3 border-b border-gray-50">
                      <div>
                        <p className="text-sm font-semibold text-gray-800">{t("profile.activeSessions")}</p>
                        <p className="text-xs text-gray-400">{t("profile.sessionsDesc")}</p>
                      </div>
                      <button onClick={() => toast.info(t("profile.revokedToast"))}
                        className="px-3 py-1.5 border border-red-200 text-red-600 text-xs font-bold rounded-xl hover:bg-red-50">
                        {t("profile.revokeAll")}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* ── Billing Tab ── */}
              {activeTab === "billing" && (
                <div className="bg-white rounded-2xl border border-[rgba(16,22,43,0.06)] shadow-[0_2px_20px_rgba(16,22,43,0.03)] overflow-hidden">
                  <div className="px-6 py-4 border-b border-[rgba(16,22,43,0.06)] flex items-center justify-between">
                    <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
                      <CreditCard className="w-4 h-4 text-[#059669]" /> {t("profile.billingHistory")}
                    </h2>
                    <button onClick={() => toast.info(t("profile.exportSoon"))}
                      className="flex items-center gap-1.5 text-sm text-[#059669] hover:underline font-semibold">
                      <Download className="w-4 h-4" /> {t("profile.exportAll")}
                    </button>
                  </div>
                  {invoices.length === 0 ? (
                    <div className="px-6 py-10 text-center text-sm text-gray-400">{t("profile.noBilling")}</div>
                  ) : (
                    <table className="w-full">
                      <thead>
                        <tr className="text-[10px] font-bold text-gray-400 uppercase tracking-wider bg-gray-50/60">
                          <th className="px-6 py-3 text-left">{t("profile.col.date")}</th>
                          <th className="px-6 py-3 text-left">{t("profile.col.plan")}</th>
                          <th className="px-6 py-3 text-left">{t("profile.col.amount")}</th>
                          <th className="px-6 py-3 text-left">{t("profile.col.status")}</th>
                          <th className="px-6 py-3 text-left">{t("profile.col.invoice")}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {invoices.map((row) => (
                          <tr key={row.invoiceId} className="hover:bg-gray-50 transition-colors">
                            <td className="px-6 py-4 text-sm text-gray-600">{formatBillingDate(row.paidAt || row.createdAt)}</td>
                            <td className="px-6 py-4">
                              <p className="text-sm font-semibold text-gray-900">{row.itemLabel}</p>
                              <p className="text-xs text-[#059669]">{row.invoiceNo}</p>
                            </td>
                            <td className="px-6 py-4 text-sm font-bold text-gray-900">{VND.format(row.totalVnd)}₫</td>
                            <td className="px-6 py-4">
                              <span className="risk-low text-xs font-semibold px-2.5 py-0.5 rounded-full">{billingStatusLabel(row.status)}</span>
                            </td>
                            <td className="px-6 py-4">
                              <button onClick={() => toast.info(t("profile.soon"))}
                                className="flex items-center gap-1 text-xs text-[#059669] hover:underline font-semibold">
                                <Download className="w-3 h-3" /> PDF
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )}
            </div>
          </main>
        </div>
      </div>
    </AuthGuard>
  );
}

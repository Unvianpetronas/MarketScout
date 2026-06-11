"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  User, Lock, CheckCircle2, BarChart2,
  Bell, Shield, Download, Zap, Clock, Key,
  CreditCard, Camera, Mail, Phone, Building2,
  ChevronRight, AlertCircle, Star
} from "lucide-react";
import { toast } from "sonner";
import { AuthGuard } from "@/components/shared/auth-guard";
import { Sidebar } from "@/components/layout/sidebar";
import { useAuth } from "@/providers/auth-provider";
import { updateProfile, changePassword } from "@/services/auth.service";
import { getMyQuota } from "@/services/quota.service";
import { QuotaStatus } from "@/types/quota";

const MOCK_BILLING = [
  { date: "01/10/2024", plan: "Pro Plan", ref: "REF-2024-10-PRO", amount: "5.800.000₫", status: "Paid" },
  { date: "01/09/2024", plan: "Pro Plan", ref: "REF-2024-09-PRO", amount: "5.800.000₫", status: "Paid" },
  { date: "01/08/2024", plan: "Starter Plan", ref: "REF-2024-08-STR", amount: "2.000.000₫", status: "Paid" },
];

const TABS = [
  { id: "profile", label: "Thông tin cá nhân", icon: User },
  { id: "subscription", label: "Gói & Quota", icon: Zap },
  { id: "security", label: "Bảo mật", icon: Shield },
  { id: "billing", label: "Thanh toán", icon: CreditCard },
];

function Toggle({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <button onClick={onChange} type="button"
      className={`relative w-11 h-6 rounded-full transition-all ${checked ? "bg-[#00D26A]" : "bg-gray-200"}`}>
      <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${checked ? "translate-x-6" : "translate-x-1"}`} />
    </button>
  );
}

export default function ProfilePage() {
  const { user, refreshUser } = useAuth();
  const [quota, setQuota] = useState<QuotaStatus | null>(null);
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

  useEffect(() => {
    if (user) {
      setProfileForm({ fullName: user.fullName || "", email: user.email || "", phone: user.phone || "", taxId: user.taxId || "" });
    }
    getMyQuota().then(setQuota).catch(() => null);
  }, [user]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingProfile(true);
    try {
      await updateProfile({ fullName: profileForm.fullName, phone: profileForm.phone, taxId: profileForm.taxId });
      await refreshUser();
      toast.success("Cập nhật hồ sơ thành công!");
    } catch (err: unknown) {
      toast.error((err as { response?: { data?: { message?: string } } })?.response?.data?.message || "Cập nhật thất bại.");
    } finally { setIsSavingProfile(false); }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordForm.newPassword !== passwordForm.confirmPassword) { toast.error("Mật khẩu không khớp."); return; }
    setIsChangingPassword(true);
    try {
      await changePassword({ currentPassword: passwordForm.currentPassword, newPassword: passwordForm.newPassword });
      toast.success("Đổi mật khẩu thành công!");
      setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
      setShowPasswordForm(false);
    } catch (err: unknown) {
      toast.error((err as { response?: { data?: { message?: string } } })?.response?.data?.message || "Đổi mật khẩu thất bại.");
    } finally { setIsChangingPassword(false); }
  };

  const quotaUsed = quota?.quotaUsedThisCycle ?? 0;
  const quotaTotal = quota?.monthlyQuota ?? 100;
  const quotaRemaining = quota?.quotaRemaining ?? 100;
  const quotaPercent = Math.min((quotaUsed / Math.max(quotaTotal, 1)) * 100, 100);

  const userInitials = (user?.fullName || "U").split(" ").map((n: string) => n[0]).slice(0, 2).join("").toUpperCase();

  return (
    <AuthGuard>
      <div className="flex h-screen overflow-hidden bg-[#FAFBFA]">
        <Sidebar active="profile" />

        <div className="flex-1 flex overflow-hidden">
          {/* ── Settings Tabs Sidebar ── */}
          <aside className="w-56 bg-white border-r border-gray-100 flex flex-col shrink-0">
            <div className="p-5 border-b border-gray-100">
              <h2 className="text-sm font-bold text-gray-900">Cài đặt tài khoản</h2>
              <p className="text-xs text-gray-400 mt-0.5">Quản lý tài khoản của bạn</p>
            </div>
            <nav className="px-2 pt-4 flex-1 space-y-0.5">
              {TABS.map((tab) => (
                <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm transition-all text-left ${
                    activeTab === tab.id
                      ? "bg-[#E6F9F0] text-[#00843F] font-semibold"
                      : "text-gray-500 hover:bg-gray-50 hover:text-gray-700"
                  }`}>
                  <tab.icon className={`w-4 h-4 shrink-0 ${activeTab === tab.id ? "text-[#00D26A]" : "text-gray-400"}`} />
                  {tab.label}
                </button>
              ))}
            </nav>
            {/* Help card */}
            <div className="m-3 bg-[#0A1A12] rounded-2xl p-4">
              <p className="text-xs font-bold text-white mb-1">Cần hỗ trợ?</p>
              <p className="text-xs text-gray-400 mb-3">Đội ngũ chúng tôi sẵn sàng giúp đỡ.</p>
              <button className="text-xs text-[#00D26A] hover:underline font-semibold flex items-center gap-1">
                Liên hệ hỗ trợ <ChevronRight className="w-3 h-3" />
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
                  <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm flex items-center gap-5">
                    <div className="relative">
                      <div className="w-20 h-20 rounded-2xl gradient-brand flex items-center justify-center text-white text-2xl font-extrabold shadow-lg">
                        {userInitials}
                      </div>
                      <button className="absolute -bottom-1.5 -right-1.5 w-7 h-7 bg-white border border-gray-200 rounded-lg flex items-center justify-center shadow-sm hover:bg-gray-50">
                        <Camera className="w-3.5 h-3.5 text-gray-500" />
                      </button>
                    </div>
                    <div>
                      <h1 className="text-xl font-extrabold text-gray-900">{user?.fullName || "Người dùng"}</h1>
                      <p className="text-sm text-gray-400 mt-0.5">{user?.email}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <span className="flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                          <CheckCircle2 className="w-3 h-3" /> Đã xác thực
                        </span>
                        <span className="text-xs text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-0.5 rounded-full font-semibold flex items-center gap-1">
                          <Star className="w-3 h-3" /> {user?.planName || "Free Plan"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Profile form */}
                  <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
                    <h2 className="text-base font-bold text-gray-900 mb-5 flex items-center gap-2">
                      <User className="w-4 h-4 text-[#00D26A]" />
                      Thông tin cá nhân
                    </h2>
                    <form onSubmit={handleSaveProfile} className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Họ và tên</label>
                          <div className="relative">
                            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
                            <input value={profileForm.fullName}
                              onChange={(e) => setProfileForm((f) => ({ ...f, fullName: e.target.value }))}
                              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus-ms transition-all" />
                          </div>
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Email (không thể đổi)</label>
                          <div className="relative">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
                            <input type="email" value={profileForm.email} disabled
                              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 text-gray-400 cursor-not-allowed" />
                          </div>
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Số điện thoại</label>
                          <div className="relative">
                            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
                            <input value={profileForm.phone}
                              onChange={(e) => setProfileForm((f) => ({ ...f, phone: e.target.value }))}
                              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus-ms" />
                          </div>
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Mã số thuế</label>
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
                          {showPasswordForm ? "Ẩn form đổi mật khẩu" : "Đổi mật khẩu"}
                        </button>
                        <button type="submit" disabled={isSavingProfile}
                          className="flex items-center gap-2 px-5 py-2.5 gradient-brand text-white text-sm font-semibold rounded-xl hover:opacity-90 disabled:opacity-60">
                          {isSavingProfile && <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                          Lưu thay đổi
                        </button>
                      </div>
                    </form>

                    {showPasswordForm && (
                      <form onSubmit={handleChangePassword} className="mt-6 pt-6 border-t border-gray-100 space-y-4">
                        <h3 className="text-sm font-bold text-gray-800 flex items-center gap-2">
                          <Lock className="w-4 h-4 text-[#00D26A]" /> Đổi mật khẩu
                        </h3>
                        <div className="grid grid-cols-3 gap-4">
                          {[
                            { key: "currentPassword" as const, label: "Mật khẩu hiện tại" },
                            { key: "newPassword" as const, label: "Mật khẩu mới" },
                            { key: "confirmPassword" as const, label: "Xác nhận mật khẩu" },
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
                          Cập nhật mật khẩu
                        </button>
                      </form>
                    )}
                  </div>
                </>
              )}

              {/* ── Subscription Tab ── */}
              {activeTab === "subscription" && (
                <>
                  <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
                    <div className="flex items-start justify-between mb-5">
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-widest text-[#00D26A] bg-[#E6F9F0] px-3 py-1 rounded-full">
                          Gói hiện tại
                        </span>
                        <h2 className="text-xl font-extrabold text-gray-900 mt-3">{user?.planName || "Free Plan"}</h2>
                        <p className="text-sm text-gray-400 mt-0.5">Chu kỳ tiếp theo: 28/10/2024</p>
                      </div>
                      <Link href="/pricing" className="flex items-center gap-2 px-4 py-2 gradient-brand text-white text-sm font-semibold rounded-xl hover:opacity-90">
                        <Zap className="w-4 h-4" /> Nâng cấp gói
                      </Link>
                    </div>

                    <div className="bg-gray-50 rounded-2xl p-4 mb-4">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-sm font-bold text-gray-700">Sử dụng Quota</p>
                        <p className="text-sm font-bold text-gray-900">{quotaUsed.toLocaleString()} / {quotaTotal.toLocaleString()}</p>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-3 mb-2">
                        <div className="h-3 rounded-full transition-all duration-700"
                          style={{ width: `${quotaPercent}%`, background: quotaPercent > 80 ? "#EF4444" : quotaPercent > 60 ? "#F59E0B" : "#00D26A" }} />
                      </div>
                      <div className="flex items-center justify-between text-xs text-gray-400">
                        <span>{quotaRemaining.toLocaleString()} quota còn lại</span>
                        <span className="text-[#00D26A] font-semibold">Quota mua thêm không hết hạn ✓</span>
                      </div>
                    </div>

                    {quotaPercent > 80 && (
                      <div className="flex items-center gap-3 p-3 bg-amber-50 border border-amber-200 rounded-xl text-sm">
                        <AlertCircle className="w-4 h-4 text-amber-500 shrink-0" />
                        <span className="text-amber-700">Quota sắp cạn. Hãy nạp thêm để không gián đoạn dịch vụ.</span>
                        <Link href="/checkout?plan=topup" className="ml-auto text-amber-700 font-bold hover:underline whitespace-nowrap">
                          Nạp quota →
                        </Link>
                      </div>
                    )}

                    <div className="flex gap-3 mt-4 pt-4 border-t border-gray-100">
                      <button onClick={() => toast.info("Sẽ sớm ra mắt.")}
                        className="px-4 py-2 border border-gray-200 text-gray-600 text-sm rounded-xl hover:bg-gray-50">
                        Hủy đăng ký
                      </button>
                      <Link href="/checkout?plan=topup"
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700">
                        <Zap className="w-4 h-4" /> Nạp thêm Quota
                      </Link>
                    </div>
                  </div>
                </>
              )}

              {/* ── Security Tab ── */}
              {activeTab === "security" && (
                <div className="space-y-4">
                  <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
                    <h2 className="text-base font-bold text-gray-900 mb-5 flex items-center gap-2">
                      <Bell className="w-4 h-4 text-[#00D26A]" /> Thông báo
                    </h2>
                    <div className="space-y-0.5">
                      {[
                        { key: "quotaAlert" as const, label: "Cảnh báo quota cạn", desc: "Nhận email khi quota dưới 20%" },
                        { key: "reportComplete" as const, label: "Báo cáo hoàn thành", desc: "Thông báo khi thẩm định xong" },
                        { key: "marketing" as const, label: "Cập nhật sản phẩm", desc: "Tin tức và tính năng mới" },
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

                  <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
                    <h2 className="text-base font-bold text-gray-900 mb-5 flex items-center gap-2">
                      <Key className="w-4 h-4 text-[#00D26A]" /> Phiên đăng nhập
                    </h2>
                    <div className="flex items-center justify-between py-3 border-b border-gray-50">
                      <div>
                        <p className="text-sm font-semibold text-gray-800">Phiên API & Web đang hoạt động</p>
                        <p className="text-xs text-gray-400">Theo dõi và quản lý tất cả phiên xác thực</p>
                      </div>
                      <button onClick={() => toast.info("Đã thu hồi tất cả phiên.")}
                        className="px-3 py-1.5 border border-red-200 text-red-600 text-xs font-bold rounded-xl hover:bg-red-50">
                        Thu hồi tất cả
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* ── Billing Tab ── */}
              {activeTab === "billing" && (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                  <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                    <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
                      <CreditCard className="w-4 h-4 text-[#00D26A]" /> Lịch sử thanh toán
                    </h2>
                    <button onClick={() => toast.info("Xuất PDF sắp ra mắt.")}
                      className="flex items-center gap-1.5 text-sm text-[#00D26A] hover:underline font-semibold">
                      <Download className="w-4 h-4" /> Xuất tất cả
                    </button>
                  </div>
                  <table className="w-full">
                    <thead>
                      <tr className="text-[10px] font-bold text-gray-400 uppercase tracking-wider bg-gray-50/60">
                        <th className="px-6 py-3 text-left">Ngày</th>
                        <th className="px-6 py-3 text-left">Gói</th>
                        <th className="px-6 py-3 text-left">Số tiền</th>
                        <th className="px-6 py-3 text-left">Trạng thái</th>
                        <th className="px-6 py-3 text-left">Hóa đơn</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {MOCK_BILLING.map((row, i) => (
                        <tr key={i} className="hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-4 text-sm text-gray-600">{row.date}</td>
                          <td className="px-6 py-4">
                            <p className="text-sm font-semibold text-gray-900">{row.plan}</p>
                            <p className="text-xs text-[#00D26A]">{row.ref}</p>
                          </td>
                          <td className="px-6 py-4 text-sm font-bold text-gray-900">{row.amount}</td>
                          <td className="px-6 py-4">
                            <span className="risk-low text-xs font-semibold px-2.5 py-0.5 rounded-full">{row.status}</span>
                          </td>
                          <td className="px-6 py-4">
                            <button onClick={() => toast.info("Sắp ra mắt.")}
                              className="flex items-center gap-1 text-xs text-[#00D26A] hover:underline font-semibold">
                              <Download className="w-3 h-3" /> PDF
                            </button>
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
      </div>
    </AuthGuard>
  );
}

"use client";

import { useEffect, useState } from "react";
import { Database, RefreshCw, Save } from "lucide-react";
import { toast } from "sonner";
import { AuthGuard } from "@/components/shared/auth-guard";
import { AdminShell } from "@/components/admin/admin-shell";
import { getPlans, updatePlan, PlanDTO } from "@/services/admin.service";

function getPlanStyle(plan: string) {
  const p = plan.toLowerCase();
  if (p.includes("enterprise")) return "text-pink-700 bg-pink-50 border-pink-200";
  if (p.includes("pro")) return "text-purple-700 bg-purple-50 border-purple-200";
  if (p.includes("starter")) return "text-blue-700 bg-blue-50 border-blue-200";
  return "text-gray-600 bg-gray-50 border-gray-200";
}

export default function AdminQuotaPage() {
  const [plans, setPlans] = useState<PlanDTO[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [edits, setEdits] = useState<Record<number, string>>({});
  const [savingId, setSavingId] = useState<number | null>(null);

  const fetchPlans = async () => {
    try {
      const res = await getPlans();
      setPlans(res);
    } catch {
      toast.error("Không thể tải danh sách gói.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchPlans(); }, []);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchPlans();
    setTimeout(() => setIsRefreshing(false), 500);
  };

  const handleSave = async (plan: PlanDTO) => {
    const raw = edits[plan.id];
    if (raw === undefined) return;
    const quota = parseInt(raw, 10);
    if (Number.isNaN(quota) || quota < 0) {
      toast.error("Quota phải là số không âm.");
      return;
    }
    setSavingId(plan.id);
    try {
      await updatePlan(plan.id, { monthlyQuota: quota });
      toast.success(`Đã cập nhật quota cho gói ${plan.name}`);
      setEdits((prev) => { const next = { ...prev }; delete next[plan.id]; return next; });
      fetchPlans();
    } catch {
      toast.error("Cập nhật quota thất bại.");
    } finally {
      setSavingId(null);
    }
  };

  return (
    <AuthGuard requiredRole="ADMIN">
      <AdminShell active="quota">
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-widest mb-1">Global Operations &gt; Quota Matrix</p>
            <h1 className="text-2xl font-extrabold text-gray-900">Quota theo gói dịch vụ</h1>
          </div>
          <button onClick={handleRefresh} disabled={isRefreshing}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-sm font-medium text-gray-600 rounded-xl hover:bg-gray-50 shadow-sm">
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? "animate-spin" : ""}`} />
          </button>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {isLoading ? (
            <div className="p-12 flex flex-col items-center">
              <div className="w-10 h-10 border-2 border-[#00D26A]/20 border-t-[#00D26A] rounded-full animate-spin mb-3" />
              <p className="text-sm text-gray-400">Đang tải...</p>
            </div>
          ) : plans.length === 0 ? (
            <div className="p-16 text-center">
              <Database className="w-10 h-10 text-gray-200 mx-auto mb-3" />
              <p className="text-gray-400 text-sm">Chưa có gói dịch vụ nào.</p>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="text-[10px] font-bold text-gray-400 uppercase tracking-wider bg-gray-50/80">
                  <th className="px-5 py-4 text-left">Gói</th>
                  <th className="px-5 py-4 text-left">Chu kỳ</th>
                  <th className="px-5 py-4 text-left">Quota / tháng</th>
                  <th className="px-5 py-4 text-left">Trạng thái</th>
                  <th className="px-5 py-4 text-left">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {plans.map((plan) => {
                  const editValue = edits[plan.id] ?? plan.monthlyQuota.toString();
                  const isDirty = edits[plan.id] !== undefined && edits[plan.id] !== plan.monthlyQuota.toString();
                  return (
                    <tr key={plan.id} className="hover:bg-[#FAFBFA] transition-colors">
                      <td className="px-5 py-4">
                        <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${getPlanStyle(plan.name)}`}>
                          {plan.name}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-sm text-gray-500">{plan.billingCycle}</td>
                      <td className="px-5 py-4">
                        <input
                          type="number"
                          min="0"
                          value={editValue}
                          onChange={(e) => setEdits((prev) => ({ ...prev, [plan.id]: e.target.value }))}
                          className="w-28 px-3 py-2 border border-gray-200 rounded-xl text-sm focus-ms"
                        />
                      </td>
                      <td className="px-5 py-4">
                        <span className={`text-xs font-bold flex items-center gap-1.5 ${plan.isActive ? "text-emerald-600" : "text-gray-400"}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${plan.isActive ? "bg-emerald-500" : "bg-gray-300"}`} />
                          {plan.isActive ? "Đang bán" : "Tạm ẩn"}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <button
                          onClick={() => handleSave(plan)}
                          disabled={!isDirty || savingId === plan.id}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-blue-50 text-blue-700 rounded-xl hover:bg-blue-100 border border-blue-200 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          <Save className="w-3.5 h-3.5" />
                          {savingId === plan.id ? "Đang lưu..." : "Lưu"}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </AdminShell>
    </AuthGuard>
  );
}

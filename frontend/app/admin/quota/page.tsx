"use client";

import { useCallback, useEffect, useState } from "react";
import { Database, Save } from "lucide-react";
import { toast } from "sonner";
import { AuthGuard } from "@/components/shared/auth-guard";
import { AdminShell } from "@/components/admin/admin-shell";
import { AdminPageHeader, RefreshButton } from "@/components/admin/admin-page-header";
import { getPlans, updatePlan, PlanDTO, getPaymentSettings, updatePaymentSettings } from "@/services/admin.service";
import { useLanguage } from "@/providers/language-provider";

function getPlanStyle(plan: string) {
  const p = plan.toLowerCase();
  if (p.includes("enterprise")) return "text-pink-700 bg-pink-50 border-pink-200";
  if (p.includes("pro")) return "text-purple-700 bg-purple-50 border-purple-200";
  if (p.includes("starter")) return "text-blue-700 bg-blue-50 border-blue-200";
  return "text-gray-600 bg-gray-50 border-gray-200";
}

export default function AdminQuotaPage() {
  const { t } = useLanguage();
  const [plans, setPlans] = useState<PlanDTO[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [edits, setEdits] = useState<Record<number, string>>({});
  const [savingId, setSavingId] = useState<number | null>(null);

  const [topupPrice, setTopupPrice] = useState<number | null>(null);
  const [topupPriceEdit, setTopupPriceEdit] = useState("");
  const [isSavingTopupPrice, setIsSavingTopupPrice] = useState(false);

  const fetchPlans = useCallback(async () => {
    try {
      const res = await getPlans();
      setPlans(res);
    } catch {
      toast.error(t("admin.quota.loadError"));
    } finally {
      setIsLoading(false);
    }
  }, [t]);

  const fetchTopupPrice = useCallback(async () => {
    try {
      const res = await getPaymentSettings();
      setTopupPrice(res.pricePerCreditVnd);
      setTopupPriceEdit(String(res.pricePerCreditVnd));
    } catch {
      toast.error(t("admin.quota.topupPriceLoadError"));
    }
  }, [t]);

  useEffect(() => { Promise.resolve().then(() => { fetchPlans(); fetchTopupPrice(); }); }, [fetchPlans, fetchTopupPrice]);

  const handleSaveTopupPrice = async () => {
    const price = Number(topupPriceEdit);
    if (!Number.isFinite(price) || price <= 0) {
      toast.error(t("admin.quota.topupPriceInvalid"));
      return;
    }
    setIsSavingTopupPrice(true);
    try {
      const res = await updatePaymentSettings(price);
      setTopupPrice(res.pricePerCreditVnd);
      setTopupPriceEdit(String(res.pricePerCreditVnd));
      toast.success(t("admin.quota.topupPriceUpdateSuccess"));
    } catch {
      toast.error(t("admin.quota.topupPriceUpdateError"));
    } finally {
      setIsSavingTopupPrice(false);
    }
  };

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
      toast.error(t("admin.quota.invalidQuota"));
      return;
    }
    setSavingId(plan.id);
    try {
      await updatePlan(plan.id, { monthlyQuota: quota });
      toast.success(t("admin.quota.updateSuccess", { plan: plan.name }));
      setEdits((prev) => { const next = { ...prev }; delete next[plan.id]; return next; });
      fetchPlans();
    } catch {
      toast.error(t("admin.quota.updateError"));
    } finally {
      setSavingId(null);
    }
  };

  return (
    <AuthGuard requiredRole="ADMIN">
      <AdminShell active="quota">
        <AdminPageHeader
          breadcrumb="GLOBAL OPERATIONS > QUOTA MATRIX"
          title="Quota Matrix"
          subtitle="Cấu hình hạn mức gói cước và giá credit nạp thêm."
          rightSlot={<RefreshButton onClick={handleRefresh} spinning={isRefreshing} />}
        />

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-6">
          <p className="text-sm font-bold text-gray-900 mb-1">{t("admin.quota.topupPriceTitle")}</p>
          <p className="text-xs text-gray-400 mb-4">{t("admin.quota.topupPriceDesc")}</p>
          <div className="flex items-center gap-3">
            <input
              type="number"
              min="1"
              value={topupPriceEdit}
              onChange={(e) => setTopupPriceEdit(e.target.value)}
              className="w-40 px-3 py-2 border border-gray-200 rounded-xl text-sm focus-ms"
            />
            <span className="text-sm text-gray-400">VND</span>
            <button
              onClick={handleSaveTopupPrice}
              disabled={topupPrice === null || isSavingTopupPrice || topupPriceEdit === String(topupPrice)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-blue-50 text-blue-700 rounded-xl hover:bg-blue-100 border border-blue-200 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Save className="w-3.5 h-3.5" />
              {isSavingTopupPrice ? t("admin.quota.saving") : t("admin.quota.save")}
            </button>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {isLoading ? (
            <div className="p-12 flex flex-col items-center">
              <div className="w-10 h-10 border-2 border-[#059669]/20 border-t-[#059669] rounded-full animate-spin mb-3" />
              <p className="text-sm text-gray-400">{t("admin.quota.loading")}</p>
            </div>
          ) : plans.length === 0 ? (
            <div className="p-16 text-center">
              <Database className="w-10 h-10 text-gray-200 mx-auto mb-3" />
              <p className="text-gray-400 text-sm">{t("admin.quota.empty")}</p>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="text-[10px] font-bold text-gray-400 uppercase tracking-wider bg-gray-50/80">
                  <th className="px-5 py-4 text-left">{t("admin.quota.colPlan")}</th>
                  <th className="px-5 py-4 text-left">{t("admin.quota.colCycle")}</th>
                  <th className="px-5 py-4 text-left">{t("admin.quota.colQuotaMonth")}</th>
                  <th className="px-5 py-4 text-left">{t("admin.quota.colStatus")}</th>
                  <th className="px-5 py-4 text-left">{t("admin.quota.colActions")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {plans.map((plan) => {
                  const editValue = edits[plan.id] ?? plan.monthlyQuota.toString();
                  const isDirty = edits[plan.id] !== undefined && edits[plan.id] !== plan.monthlyQuota.toString();
                  return (
                    <tr key={plan.id} className="hover:bg-[#faf9f6] transition-colors">
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
                          {plan.isActive ? t("admin.quota.statusActive") : t("admin.quota.statusInactive")}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <button
                          onClick={() => handleSave(plan)}
                          disabled={!isDirty || savingId === plan.id}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-blue-50 text-blue-700 rounded-xl hover:bg-blue-100 border border-blue-200 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          <Save className="w-3.5 h-3.5" />
                          {savingId === plan.id ? t("admin.quota.saving") : t("admin.quota.save")}
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

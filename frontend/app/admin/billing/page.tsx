"use client";

import { useCallback, useEffect, useState } from "react";
import { CreditCard, Save } from "lucide-react";
import { toast } from "sonner";
import { AuthGuard } from "@/components/shared/auth-guard";
import { AdminShell } from "@/components/admin/admin-shell";
import { AdminPageHeader, RefreshButton } from "@/components/admin/admin-page-header";
import { getPlans, updatePlan, PlanDTO } from "@/services/admin.service";
import { useLanguage } from "@/providers/language-provider";

function getPlanStyle(plan: string) {
  const p = plan.toLowerCase();
  if (p.includes("enterprise")) return "text-pink-700 bg-pink-50 border-pink-200";
  if (p.includes("pro")) return "text-purple-700 bg-purple-50 border-purple-200";
  if (p.includes("starter")) return "text-blue-700 bg-blue-50 border-blue-200";
  return "text-gray-600 bg-gray-50 border-gray-200";
}

interface PriceEdit { priceVnd: string; priceUsd: string }

export default function AdminBillingPage() {
  const { t } = useLanguage();
  const [plans, setPlans] = useState<PlanDTO[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [edits, setEdits] = useState<Record<number, PriceEdit>>({});
  const [savingId, setSavingId] = useState<number | null>(null);
  const [togglingId, setTogglingId] = useState<number | null>(null);

  const fetchPlans = useCallback(async () => {
    try {
      const res = await getPlans();
      setPlans(res);
    } catch {
      toast.error(t("admin.billing.fetchError"));
    } finally {
      setIsLoading(false);
    }
  }, [t]);

  useEffect(() => { Promise.resolve().then(fetchPlans); }, [fetchPlans]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchPlans();
    setTimeout(() => setIsRefreshing(false), 500);
  };

  const getEdit = (plan: PlanDTO): PriceEdit =>
    edits[plan.id] ?? { priceVnd: (plan.priceVnd ?? 0).toString(), priceUsd: (plan.priceUsd ?? 0).toString() };

  const isDirty = (plan: PlanDTO) => {
    const e = edits[plan.id];
    if (!e) return false;
    return e.priceVnd !== (plan.priceVnd ?? 0).toString() || e.priceUsd !== (plan.priceUsd ?? 0).toString();
  };

  const handleSave = async (plan: PlanDTO) => {
    const edit = getEdit(plan);
    const priceVnd = parseFloat(edit.priceVnd);
    const priceUsd = parseFloat(edit.priceUsd);
    if (Number.isNaN(priceVnd) || priceVnd < 0 || Number.isNaN(priceUsd) || priceUsd < 0) {
      toast.error(t("admin.billing.invalidPrice"));
      return;
    }
    setSavingId(plan.id);
    try {
      await updatePlan(plan.id, { priceVnd, priceUsd });
      toast.success(t("admin.billing.priceUpdated", { plan: plan.name }));
      setEdits((prev) => { const next = { ...prev }; delete next[plan.id]; return next; });
      fetchPlans();
    } catch {
      toast.error(t("admin.billing.priceUpdateFailed"));
    } finally {
      setSavingId(null);
    }
  };

  const handleToggleActive = async (plan: PlanDTO) => {
    setTogglingId(plan.id);
    try {
      await updatePlan(plan.id, { isActive: !plan.isActive });
      toast.success(
        plan.isActive
          ? t("admin.billing.toastHidden", { plan: plan.name })
          : t("admin.billing.toastActivated", { plan: plan.name })
      );
      fetchPlans();
    } catch {
      toast.error(t("admin.billing.statusUpdateFailed"));
    } finally {
      setTogglingId(null);
    }
  };

  return (
    <AuthGuard requiredRole="ADMIN">
      <AdminShell active="billing">
        <AdminPageHeader
          breadcrumb="GLOBAL OPERATIONS > BILLING"
          title="Billing"
          subtitle="Bảng giá các gói cước hiển thị cho khách hàng."
          rightSlot={<RefreshButton onClick={handleRefresh} spinning={isRefreshing} />}
        />

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {isLoading ? (
            <div className="p-12 flex flex-col items-center">
              <div className="w-10 h-10 border-2 border-[#059669]/20 border-t-[#059669] rounded-full animate-spin mb-3" />
              <p className="text-sm text-gray-400">{t("admin.billing.loading")}</p>
            </div>
          ) : plans.length === 0 ? (
            <div className="p-16 text-center">
              <CreditCard className="w-10 h-10 text-gray-200 mx-auto mb-3" />
              <p className="text-gray-400 text-sm">{t("admin.billing.empty")}</p>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="text-[10px] font-bold text-gray-400 uppercase tracking-wider bg-gray-50/80">
                  <th className="px-5 py-4 text-left">{t("admin.billing.colPlan")}</th>
                  <th className="px-5 py-4 text-left">{t("admin.billing.colPriceVnd")}</th>
                  <th className="px-5 py-4 text-left">{t("admin.billing.colPriceUsd")}</th>
                  <th className="px-5 py-4 text-left">{t("admin.billing.colActive")}</th>
                  <th className="px-5 py-4 text-left">{t("admin.billing.colActions")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {plans.map((plan) => {
                  const edit = getEdit(plan);
                  const dirty = isDirty(plan);
                  return (
                    <tr key={plan.id} className="hover:bg-[#faf9f6] transition-colors">
                      <td className="px-5 py-4">
                        <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${getPlanStyle(plan.name)}`}>
                          {plan.name}
                        </span>
                        <p className="text-[11px] text-gray-400 mt-1">{plan.billingCycle}</p>
                      </td>
                      <td className="px-5 py-4">
                        <input
                          type="number"
                          min="0"
                          value={edit.priceVnd}
                          onChange={(e) => setEdits((prev) => ({ ...prev, [plan.id]: { ...edit, priceVnd: e.target.value } }))}
                          className="w-32 px-3 py-2 border border-gray-200 rounded-xl text-sm focus-ms"
                        />
                      </td>
                      <td className="px-5 py-4">
                        <input
                          type="number"
                          min="0"
                          value={edit.priceUsd}
                          onChange={(e) => setEdits((prev) => ({ ...prev, [plan.id]: { ...edit, priceUsd: e.target.value } }))}
                          className="w-28 px-3 py-2 border border-gray-200 rounded-xl text-sm focus-ms"
                        />
                      </td>
                      <td className="px-5 py-4">
                        <button
                          onClick={() => handleToggleActive(plan)}
                          disabled={togglingId === plan.id}
                          className={`relative w-11 h-6 rounded-full transition-colors disabled:opacity-50 ${plan.isActive ? "bg-[#059669]" : "bg-gray-200"}`}
                        >
                          <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${plan.isActive ? "translate-x-5" : ""}`} />
                        </button>
                      </td>
                      <td className="px-5 py-4">
                        <button
                          onClick={() => handleSave(plan)}
                          disabled={!dirty || savingId === plan.id}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-blue-50 text-blue-700 rounded-xl hover:bg-blue-100 border border-blue-200 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          <Save className="w-3.5 h-3.5" />
                          {savingId === plan.id ? t("admin.billing.saving") : t("admin.billing.save")}
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

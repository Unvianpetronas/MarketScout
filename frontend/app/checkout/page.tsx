"use client";

import { useState, useEffect, useRef, useCallback, Suspense } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { Copy, List, ArrowLeft, Minus, Plus, CheckCircle2, Clock } from "lucide-react";
import { toast } from "sonner";

import { createTopup, createPlanCheckout, getTopupStatus } from "@/services/payment.service";
import { getMyQuota } from "@/services/quota.service";
import { TopupResponse, TopupStatus, PRICE_PER_CREDIT_VND } from "@/types/payment";
import { useLanguage } from "@/providers/language-provider";
import { useAuth } from "@/providers/auth-provider";

const formatVnd = (n: number) => new Intl.NumberFormat("vi-VN").format(n);

// Plan display info (mirrors the pricing page). Price also returned by the
// backend in the order, this is only for the pre-order summary.
const PLAN_INFO: Record<string, { name: string; priceVnd: number; quota: number }> = {
  starter: { name: "Starter", priceVnd: 2_000_000, quota: 15 },
  pro: { name: "Pro", priceVnd: 5_800_000, quota: 50 },
};

const handleCopy = (text: string) =>
  navigator.clipboard.writeText(text).then(() => toast.success("Copied to clipboard!"));

// Backend Instant may arrive as an ISO string, epoch seconds, or epoch millis.
const parseExpiry = (v: string | number): number => {
  if (typeof v === "number") return v < 1e12 ? v * 1000 : v; // seconds → ms
  const t = Date.parse(v);
  return Number.isNaN(t) ? Date.now() : t;
};

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-gray-500">{label}</span>
      <span className="text-white font-semibold">{value}</span>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════
// Unified real SePay VietQR checkout — handles both quota top-up and plan buy
// ════════════════════════════════════════════════════════════════════════

function VietQrCheckout({ mode, planKey }: { mode: "topup" | "plan"; planKey: string }) {
  const router = useRouter();
  const { t, lang } = useLanguage();
  const { refreshUser } = useAuth();

  const isTopup = mode === "topup";
  const planInfo = PLAN_INFO[planKey];
  const planName = planInfo?.name ?? (planKey.charAt(0).toUpperCase() + planKey.slice(1));

  const [quantity, setQuantity] = useState(1);
  const [order, setOrder] = useState<TopupResponse | null>(null);
  const [status, setStatus] = useState<TopupStatus>("pending");
  const [creating, setCreating] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [redirectIn, setRedirectIn] = useState(6);
  const [qrFailed, setQrFailed] = useState(false);

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const total = isTopup ? quantity * PRICE_PER_CREDIT_VND : (order?.amountVnd ?? planInfo?.priceVnd ?? 0);
  const redirectUrl = isTopup ? "/dashboard?topup=success" : "/dashboard?plan=success";

  const stopTimers = useCallback(() => {
    if (pollRef.current) clearInterval(pollRef.current);
    if (tickRef.current) clearInterval(tickRef.current);
    pollRef.current = null;
    tickRef.current = null;
  }, []);

  useEffect(() => stopTimers, [stopTimers]);

  const handleCreate = async () => {
    if (isTopup && quantity < 1) return;
    setCreating(true);
    setQrFailed(false);
    try {
      const resp = isTopup ? await createTopup(quantity) : await createPlanCheckout(planKey);
      setOrder(resp);
      setStatus(resp.status);
      setSecondsLeft(Math.max(0, Math.floor((parseExpiry(resp.expiresAt) - Date.now()) / 1000)));
    } catch (err) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg || t("checkout.creatingError"));
    } finally {
      setCreating(false);
    }
  };

  // Poll status + count down to expiry once an order exists.
  useEffect(() => {
    if (!order || status !== "pending") return;

    pollRef.current = setInterval(async () => {
      try {
        const s = await getTopupStatus(order.invoiceId);
        if (s.status === "paid") {
          setStatus("paid");
          setRedirectIn(6);
          stopTimers();
          toast.success(t("checkout.paidToast"));
          // Refresh user/quota so the new plan or credits show immediately.
          await refreshUser().catch(() => undefined);
          await getMyQuota().catch(() => undefined);
        } else if (s.status === "expired") {
          setStatus("expired");
          stopTimers();
        }
      } catch {
        /* transient error — keep polling */
      }
    }, 4000);

    tickRef.current = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          setStatus("expired");
          stopTimers();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return stopTimers;
  }, [order, status, stopTimers, t, refreshUser]);

  // Late-payment grace: the backend honors transfers that land after QR expiry
  // (and reconciles missed webhooks), so keep checking for a few minutes after
  // the countdown ends instead of declaring the order dead immediately.
  useEffect(() => {
    if (!order || status !== "expired") return;
    let attempts = 0;
    const id = setInterval(async () => {
      if (++attempts > 24) { clearInterval(id); return; } // ~4 minutes
      try {
        const s = await getTopupStatus(order.invoiceId);
        if (s.status === "paid") {
          clearInterval(id);
          setStatus("paid");
          setRedirectIn(6);
          toast.success(t("checkout.paidToast"));
          await refreshUser().catch(() => undefined);
          await getMyQuota().catch(() => undefined);
        }
      } catch {
        /* transient error — keep checking */
      }
    }, 10000);
    return () => clearInterval(id);
  }, [order, status, refreshUser, t]);

  // Once paid, count down and auto-redirect to the dashboard.
  useEffect(() => {
    if (status !== "paid") return;
    const id = setInterval(() => {
      setRedirectIn((prev) => {
        if (prev <= 1) {
          clearInterval(id);
          router.push(redirectUrl);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [status, router, redirectUrl]);

  const mm = String(Math.floor(secondsLeft / 60)).padStart(2, "0");
  const ss = String(secondsLeft % 60).padStart(2, "0");
  const successCount = order?.quantity ?? 0;

  return (
    <main className="max-w-6xl mx-auto px-6 py-8">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* LEFT — header + (quantity for top-up) + QR */}
        <div className="lg:col-span-2 space-y-6">
          <div>
            <h1 className="text-3xl font-bold text-white mb-1">
              {isTopup ? t("checkout.topupTitle") : t("checkout.planTitle", { plan: planName })}
            </h1>
            <p className="text-gray-400 text-sm">
              {isTopup
                ? t("checkout.topupSubtitle", { price: formatVnd(PRICE_PER_CREDIT_VND) })
                : t("checkout.planSubtitle")}
            </p>
          </div>

          {/* Quantity selector — top-up only */}
          {isTopup && (
            <div className="bg-[#1A2035] rounded-xl border border-white/10 p-6">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">{t("checkout.credits")}</p>
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  disabled={!!order}
                  className="w-10 h-10 rounded-lg border border-white/10 bg-[#0A0E1A] text-white flex items-center justify-center hover:border-[#00D26A] disabled:opacity-40"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <input
                  type="number"
                  min={1}
                  max={1000}
                  value={quantity}
                  disabled={!!order}
                  onChange={(e) => setQuantity(Math.min(1000, Math.max(1, Number(e.target.value) || 1)))}
                  className="w-24 text-center px-3 py-2.5 bg-[#0A0E1A] border border-white/10 rounded-lg text-white text-lg font-bold focus:outline-none focus:border-[#00D26A] disabled:opacity-60"
                />
                <button
                  onClick={() => setQuantity((q) => Math.min(1000, q + 1))}
                  disabled={!!order}
                  className="w-10 h-10 rounded-lg border border-white/10 bg-[#0A0E1A] text-white flex items-center justify-center hover:border-[#00D26A] disabled:opacity-40"
                >
                  <Plus className="w-4 h-4" />
                </button>
                <div className="ml-auto text-right">
                  <p className="text-xs text-gray-500">{t("checkout.total")}</p>
                  <p className="text-white text-xl font-bold">{formatVnd(total)} <span className="text-sm">VND</span></p>
                </div>
              </div>
            </div>
          )}

          {/* VietQR panel — only after an order is created */}
          {order && (
            <div className="bg-[#1A2035] rounded-xl border border-white/10 p-6">
              {status === "paid" ? (
                <div className="flex flex-col items-center text-center py-8">
                  <div className="relative mb-4">
                    <span className="absolute inset-0 rounded-full bg-[#00D26A]/20 animate-ping" />
                    <div className="relative w-16 h-16 rounded-full bg-[#00D26A]/15 flex items-center justify-center">
                      <CheckCircle2 className="w-10 h-10 text-[#00D26A]" />
                    </div>
                  </div>
                  <h3 className="text-white text-2xl font-bold mb-1">{t("checkout.successTitle")}</h3>
                  <p className="text-gray-400 text-sm mb-4">
                    {isTopup
                      ? t("checkout.successDesc", { count: successCount })
                      : t("checkout.planSuccessDesc", { count: successCount })}
                  </p>
                  <div className="w-full max-w-xs bg-[#0A0E1A] border border-white/10 rounded-lg px-4 py-3 mb-4 flex items-center justify-center gap-2 text-sm text-gray-300">
                    <Clock className="w-4 h-4 text-[#00D26A]" />
                    {t("checkout.redirectIn")}
                    <span className="text-white font-bold tabular-nums">{redirectIn}s</span>
                  </div>
                  <button
                    onClick={() => router.push(redirectUrl)}
                    className="px-6 py-2.5 bg-[#00D26A] text-black font-bold rounded-lg hover:bg-[#00b85d] transition-colors"
                  >
                    {t("checkout.goDashboard")}
                  </button>
                </div>
              ) : status === "expired" ? (
                <div className="flex flex-col items-center text-center py-6">
                  <Clock className="w-14 h-14 text-orange-400 mb-3" />
                  <h3 className="text-white text-lg font-bold mb-1">{t("checkout.expiredTitle")}</h3>
                  <p className="text-gray-400 text-sm mb-4">{t("checkout.expiredDesc")}</p>
                  <button
                    onClick={() => { setOrder(null); setStatus("pending"); }}
                    className="px-5 py-2.5 bg-[#00D26A] text-black font-bold rounded-lg hover:bg-[#00b85d]"
                  >
                    {t("checkout.createNew")}
                  </button>
                </div>
              ) : (
                <div className="flex gap-6">
                  {/* QR */}
                  <div className="shrink-0">
                    <div className="bg-white rounded-xl p-3 w-44 h-44 flex items-center justify-center">
                      {qrFailed ? (
                        <p className="text-center text-[11px] text-gray-500 px-1">{t("checkout.qrFailed")}</p>
                      ) : (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={order.qrUrl}
                          alt="VietQR payment code"
                          className="w-full h-full object-contain"
                          onError={() => setQrFailed(true)}
                        />
                      )}
                    </div>
                    <div className="mt-2 flex items-center justify-center gap-1.5 text-orange-400 text-xs font-semibold">
                      <Clock className="w-3.5 h-3.5" />
                      {t("checkout.expiresIn")} {mm}:{ss}
                    </div>
                  </div>

                  {/* Transfer details */}
                  <div className="flex-1 space-y-3">
                    <span className="bg-orange-500/20 text-orange-400 text-xs px-2 py-0.5 rounded font-medium inline-block">
                      {t("checkout.pendingTransfer")}
                    </span>

                    <div>
                      <p className="text-xs text-gray-500 mb-1 uppercase tracking-wider font-semibold">{t("checkout.transferContent")}</p>
                      <div className="bg-[#0A0E1A] rounded-lg p-3 border border-white/10 flex items-center justify-between">
                        <span className="font-mono text-white text-base font-bold tracking-widest">{order.transferContent}</span>
                        <button onClick={() => handleCopy(order.transferContent)} className="text-gray-400 hover:text-[#00D26A]">
                          <Copy className="w-4 h-4" />
                        </button>
                      </div>
                      <p className="text-[11px] text-orange-300 mt-1">{t("checkout.transferNote")}</p>
                    </div>

                    <div className="space-y-2 text-sm">
                      <Row label={t("checkout.bank")} value={order.bankCode} />
                      <Row label={t("checkout.accountName")} value={order.accountName} />
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-500">{t("checkout.accountNo")}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-white font-mono font-bold">{order.accountNo}</span>
                          <button onClick={() => handleCopy(order.accountNo)} className="text-gray-500 hover:text-[#00D26A]">
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-500">{t("checkout.amount")}</span>
                        <span className="text-white font-bold">{formatVnd(order.amountVnd)} VND</span>
                      </div>
                    </div>

                    <div className="bg-blue-950/50 border border-blue-800/30 rounded-lg p-3">
                      <p className="text-blue-300 text-xs">{t("checkout.autoCredit")}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* RIGHT — order summary */}
        <div>
          <div className="bg-gradient-to-b from-[#1A2035] to-[#0F1629] rounded-2xl border border-white/10 p-6 sticky top-4">
            <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-4">{t("checkout.orderSummary")}</p>

            <div className="bg-gradient-to-br from-[#1A2840] to-[#0F1A30] rounded-xl border border-white/10 p-5 mb-5">
              <div className="flex items-center justify-between mb-3">
                <span className="bg-[#00D26A]/10 text-[#00D26A] text-xs font-bold px-2 py-1 rounded">
                  {isTopup ? t("checkout.quotaTopupBadge") : t("checkout.planBadge")}
                </span>
                <List className="w-4 h-4 text-gray-400" />
              </div>

              {isTopup ? (
                <>
                  <h3 className="text-white text-xl font-bold mb-1">{quantity} {t("checkout.creditUnit")}{quantity > 1 && lang === "en" ? "s" : ""}</h3>
                  <p className="text-[#00D26A] text-sm mb-4">{t("checkout.payg")}</p>
                  <div className="space-y-2.5 mb-4 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400">{t("checkout.unitPrice")}</span>
                      <span className="text-white font-medium">{formatVnd(PRICE_PER_CREDIT_VND)} VND</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400">{t("checkout.quantity")}</span>
                      <span className="text-white font-medium">× {quantity}</span>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <h3 className="text-white text-xl font-bold mb-1">{planName}</h3>
                  {planInfo && (
                    <p className="text-[#00D26A] text-sm mb-4">{t("checkout.perMonth", { n: planInfo.quota })}</p>
                  )}
                </>
              )}

              <div className="border-t border-white/10 pt-4">
                <div className="flex items-baseline justify-between">
                  <span className="text-gray-400 text-sm">{t("checkout.total")}</span>
                  <span className="text-white text-3xl font-bold">{formatVnd(total)} <span className="text-lg">VND</span></span>
                </div>
              </div>
            </div>

            {!order && (
              <button
                onClick={handleCreate}
                disabled={creating}
                className="w-full py-4 bg-[#00D26A] text-black font-bold rounded-xl hover:bg-[#00b85d] transition-colors disabled:opacity-60 flex items-center justify-center gap-2 text-base"
              >
                {creating && <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />}
                {t("checkout.generateQr")}
              </button>
            )}

            <p className="text-xs text-gray-500 text-center mt-3">{t("checkout.securedBy")}</p>
          </div>
        </div>
      </div>
    </main>
  );
}

// ════════════════════════════════════════════════════════════════════════

function CheckoutContent() {
  const searchParams = useSearchParams();
  const { t } = useLanguage();
  const planKey = searchParams.get("plan") || "starter";
  const mode: "topup" | "plan" = planKey === "topup" ? "topup" : "plan";

  return (
    <div className="min-h-screen bg-[#0A0E1A]">
      {/* Navbar */}
      <nav className="border-b border-white/10 px-6 py-3 flex items-center justify-between bg-[#0A0E1A]">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded bg-[#00D26A] flex items-center justify-center">
            <span className="text-black font-bold text-sm">M</span>
          </div>
          <div>
            <span className="text-white font-bold text-sm">MarketScout</span>
            <span className="text-[#00D26A] text-xs ml-2">B2B INTELLIGENCE</span>
          </div>
        </div>
        <Link href="/dashboard" className="text-gray-400 text-sm flex items-center gap-1 hover:text-white transition-colors">
          <ArrowLeft className="w-4 h-4" />
          {t("checkout.backToDashboard")}
        </Link>
      </nav>

      <VietQrCheckout mode={mode} planKey={planKey} />
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#0A0E1A] flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-[#00D26A]/30 border-t-[#00D26A] rounded-full animate-spin" />
        </div>
      }
    >
      <CheckoutContent />
    </Suspense>
  );
}

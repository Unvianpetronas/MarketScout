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
      <span className="text-xs text-[#8C8672]">{label}</span>
      <span className="text-[#3A362E] font-semibold">{value}</span>
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
    <main className="max-w-6xl mx-auto px-6 py-10">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* LEFT — header + (quantity for top-up) + QR */}
        <div className="lg:col-span-2 space-y-6">
          <div>
            <h1 className="text-3xl font-bold text-[#3A362E] mb-1">
              {isTopup ? t("checkout.topupTitle") : t("checkout.planTitle", { plan: planName })}
            </h1>
            <p className="text-[#8C8672] text-sm">
              {isTopup
                ? t("checkout.topupSubtitle", { price: formatVnd(PRICE_PER_CREDIT_VND) })
                : t("checkout.planSubtitle")}
            </p>
          </div>

          {/* Quantity selector — top-up only */}
          {isTopup && (
            <div className="neu-surface p-6">
              <p className="text-xs font-semibold text-[#8C8672] uppercase tracking-wider mb-4">{t("checkout.credits")}</p>
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  disabled={!!order}
                  className="neu-btn w-11 h-11 rounded-2xl text-[#3A362E] flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed"
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
                  className="neu-inset w-24 text-center px-3 py-2.5 text-[#3A362E] text-lg font-bold focus:outline-none disabled:opacity-60"
                />
                <button
                  onClick={() => setQuantity((q) => Math.min(1000, q + 1))}
                  disabled={!!order}
                  className="neu-btn w-11 h-11 rounded-2xl text-[#3A362E] flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Plus className="w-4 h-4" />
                </button>
                <div className="ml-auto text-right">
                  <p className="text-xs text-[#8C8672]">{t("checkout.total")}</p>
                  <p className="text-[#3A362E] text-xl font-bold">{formatVnd(total)} <span className="text-sm font-medium">VND</span></p>
                </div>
              </div>
            </div>
          )}

          {/* VietQR panel — only after an order is created */}
          {order && (
            <div className="neu-surface p-6">
              {status === "paid" ? (
                <div className="flex flex-col items-center text-center py-8">
                  <div className="relative mb-4">
                    <span className="absolute inset-0 rounded-full bg-[#00D26A]/20 animate-ping" />
                    <div className="relative w-16 h-16 rounded-full neu-inset flex items-center justify-center">
                      <CheckCircle2 className="w-9 h-9 text-[#00B85D]" />
                    </div>
                  </div>
                  <h3 className="text-[#3A362E] text-2xl font-bold mb-1">{t("checkout.successTitle")}</h3>
                  <p className="text-[#8C8672] text-sm mb-4">
                    {isTopup
                      ? t("checkout.successDesc", { count: successCount })
                      : t("checkout.planSuccessDesc", { count: successCount })}
                  </p>
                  <div className="neu-inset w-full max-w-xs px-4 py-3 mb-4 flex items-center justify-center gap-2 text-sm text-[#5A5545]">
                    <Clock className="w-4 h-4 text-[#00B85D]" />
                    {t("checkout.redirectIn")}
                    <span className="text-[#3A362E] font-bold tabular-nums">{redirectIn}s</span>
                  </div>
                  <button
                    onClick={() => router.push(redirectUrl)}
                    className="neu-btn-primary px-6 py-2.5 text-white font-bold rounded-2xl"
                  >
                    {t("checkout.goDashboard")}
                  </button>
                </div>
              ) : status === "expired" ? (
                <div className="flex flex-col items-center text-center py-6">
                  <div className="w-16 h-16 rounded-full neu-inset flex items-center justify-center mb-3">
                    <Clock className="w-8 h-8 text-orange-500" />
                  </div>
                  <h3 className="text-[#3A362E] text-lg font-bold mb-1">{t("checkout.expiredTitle")}</h3>
                  <p className="text-[#8C8672] text-sm mb-4">{t("checkout.expiredDesc")}</p>
                  <button
                    onClick={() => { setOrder(null); setStatus("pending"); }}
                    className="neu-btn-primary px-5 py-2.5 text-white font-bold rounded-2xl"
                  >
                    {t("checkout.createNew")}
                  </button>
                </div>
              ) : (
                <div className="flex flex-col sm:flex-row gap-6">
                  {/* QR */}
                  <div className="shrink-0 mx-auto sm:mx-0">
                    <div className="neu-inset p-3 w-44 h-44 flex items-center justify-center">
                      {qrFailed ? (
                        <p className="text-center text-[11px] text-[#8C8672] px-1">{t("checkout.qrFailed")}</p>
                      ) : (
                        <div className="bg-white rounded-xl w-full h-full flex items-center justify-center p-2 shadow-inner">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={order.qrUrl}
                            alt="VietQR payment code"
                            className="w-full h-full object-contain"
                            onError={() => setQrFailed(true)}
                          />
                        </div>
                      )}
                    </div>
                    <div className="mt-2 flex items-center justify-center gap-1.5 text-orange-500 text-xs font-semibold">
                      <Clock className="w-3.5 h-3.5" />
                      {t("checkout.expiresIn")} {mm}:{ss}
                    </div>
                  </div>

                  {/* Transfer details */}
                  <div className="flex-1 space-y-3">
                    <span className="inline-block neu-inset text-orange-600 text-xs px-3 py-1 rounded-full font-medium">
                      {t("checkout.pendingTransfer")}
                    </span>

                    <div>
                      <p className="text-xs text-[#8C8672] mb-1 uppercase tracking-wider font-semibold">{t("checkout.transferContent")}</p>
                      <div className="neu-inset px-3 py-3 flex items-center justify-between">
                        <span className="font-mono text-[#3A362E] text-base font-bold tracking-widest">{order.transferContent}</span>
                        <button onClick={() => handleCopy(order.transferContent)} className="neu-btn w-8 h-8 rounded-xl flex items-center justify-center text-[#00B85D] shrink-0">
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <p className="text-[11px] text-orange-600 mt-1">{t("checkout.transferNote")}</p>
                    </div>

                    <div className="space-y-2 text-sm">
                      <Row label={t("checkout.bank")} value={order.bankCode} />
                      <Row label={t("checkout.accountName")} value={order.accountName} />
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-[#8C8672]">{t("checkout.accountNo")}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-[#3A362E] font-mono font-bold">{order.accountNo}</span>
                          <button onClick={() => handleCopy(order.accountNo)} className="text-[#8C8672] hover:text-[#00B85D] transition-colors">
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-[#8C8672]">{t("checkout.amount")}</span>
                        <span className="text-[#3A362E] font-bold">{formatVnd(order.amountVnd)} VND</span>
                      </div>
                    </div>

                    <div className="neu-inset p-3">
                      <p className="text-[#5A5545] text-xs">{t("checkout.autoCredit")}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* RIGHT — order summary */}
        <div>
          <div className="neu-surface p-6 sticky top-6">
            <p className="text-xs text-[#8C8672] uppercase tracking-wider font-semibold mb-4">{t("checkout.orderSummary")}</p>

            <div className="neu-surface-soft p-5 mb-5">
              <div className="flex items-center justify-between mb-3">
                <span className="neu-inset text-[#00843F] text-xs font-bold px-2.5 py-1 rounded-full">
                  {isTopup ? t("checkout.quotaTopupBadge") : t("checkout.planBadge")}
                </span>
                <List className="w-4 h-4 text-[#8C8672]" />
              </div>

              {isTopup ? (
                <>
                  <h3 className="text-[#3A362E] text-xl font-bold mb-1">{quantity} {t("checkout.creditUnit")}{quantity > 1 && lang === "en" ? "s" : ""}</h3>
                  <p className="text-[#00843F] text-sm mb-4">{t("checkout.payg")}</p>
                  <div className="space-y-2.5 mb-4 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-[#8C8672]">{t("checkout.unitPrice")}</span>
                      <span className="text-[#3A362E] font-medium">{formatVnd(PRICE_PER_CREDIT_VND)} VND</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[#8C8672]">{t("checkout.quantity")}</span>
                      <span className="text-[#3A362E] font-medium">× {quantity}</span>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <h3 className="text-[#3A362E] text-xl font-bold mb-1">{planName}</h3>
                  {planInfo && (
                    <p className="text-[#00843F] text-sm mb-4">{t("checkout.perMonth", { n: planInfo.quota })}</p>
                  )}
                </>
              )}

              <div className="border-t border-[#DAD5C8] pt-4">
                <div className="flex items-baseline justify-between">
                  <span className="text-[#8C8672] text-sm">{t("checkout.total")}</span>
                  <span className="text-[#3A362E] text-3xl font-bold">{formatVnd(total)} <span className="text-lg">VND</span></span>
                </div>
              </div>
            </div>

            {!order && (
              <button
                onClick={handleCreate}
                disabled={creating}
                className="neu-btn-primary w-full py-4 text-white font-bold rounded-2xl disabled:opacity-60 flex items-center justify-center gap-2 text-base"
              >
                {creating && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                {t("checkout.generateQr")}
              </button>
            )}

            <p className="text-xs text-[#8C8672] text-center mt-3">{t("checkout.securedBy")}</p>
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
    <div
      className="min-h-screen"
      style={{ background: "linear-gradient(160deg, #F5F3EE 0%, #EDEAE2 55%, #E7E2D6 100%)" }}
    >
      {/* Navbar */}
      <nav className="px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="neu-btn w-9 h-9 rounded-2xl flex items-center justify-center">
            <span className="text-[#00B85D] font-bold text-sm">M</span>
          </div>
          <div>
            <span className="text-[#3A362E] font-bold text-sm">MarketScout</span>
            <span className="text-[#00843F] text-xs ml-2 font-semibold">B2B INTELLIGENCE</span>
          </div>
        </div>
        <Link href="/dashboard" className="neu-btn text-[#5A5545] text-sm flex items-center gap-1.5 px-4 py-2 rounded-xl hover:text-[#3A362E] transition-colors">
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
        <div
          className="min-h-screen flex items-center justify-center"
          style={{ background: "linear-gradient(160deg, #F5F3EE 0%, #EDEAE2 55%, #E7E2D6 100%)" }}
        >
          <div className="neu-btn w-12 h-12 rounded-full flex items-center justify-center">
            <div className="w-5 h-5 border-2 border-[#00B85D]/30 border-t-[#00B85D] rounded-full animate-spin" />
          </div>
        </div>
      }
    >
      <CheckoutContent />
    </Suspense>
  );
}

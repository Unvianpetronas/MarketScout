"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Check, X, Zap, Shield, Star, ArrowRight, ChevronDown, ChevronUp, Globe, Clock, XCircle } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/providers/auth-provider";
import { useLanguage } from "@/providers/language-provider";
import { Reveal } from "@/components/shared/reveal";
import { getPublicPlans, getPricePerCredit, schedulePlanChange, cancelScheduledPlanChange } from "@/services/payment.service";
import { PublicPlan } from "@/types/payment";
import { PLANS, FAQS } from "./plans-data";

function formatDate(v: string | number | null | undefined) {
  if (!v) return "";
  const d = new Date(v);
  return d.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function ScheduleChangeModal({
  fromPlan, toPlanId, onClose, onScheduled,
}: { fromPlan: string; toPlanId: string; onClose: () => void; onScheduled: () => void }) {
  const { t } = useLanguage();
  const [submitting, setSubmitting] = useState(false);

  const handleConfirm = async () => {
    setSubmitting(true);
    try {
      const resp = await schedulePlanChange(toPlanId);
      toast.success(t("pricing.schedule.toastSuccess", { plan: resp.pendingPlanName ?? toPlanId }));
      onScheduled();
      onClose();
    } catch (err) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg || t("pricing.schedule.toastError"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
        <h3 className="text-base font-bold text-gray-900 mb-2">{t("pricing.schedule.modalTitle")}</h3>
        <p className="text-sm text-gray-500 mb-6">
          {t("pricing.schedule.modalDesc", { from: fromPlan, to: toPlanId })}
        </p>
        <div className="flex gap-3">
          <button onClick={handleConfirm} disabled={submitting}
            className="flex-1 py-3 gradient-brand text-white font-bold rounded-xl hover:opacity-90 text-sm disabled:opacity-60">
            {submitting ? t("pricing.schedule.confirming") : t("pricing.schedule.confirm")}
          </button>
          <button onClick={onClose} disabled={submitting}
            className="flex-1 py-3 border border-gray-200 text-gray-600 font-semibold rounded-xl hover:bg-gray-50 text-sm">
            {t("pricing.schedule.cancel")}
          </button>
        </div>
      </div>
    </div>
  );
}

function PriceDisplay({ vnd, usd, isFree, isCustom, isDark }: { vnd: number; usd: number; isFree: boolean; isCustom?: boolean; isDark?: boolean }) {
  const { t } = useLanguage();
  const textColor = isDark ? "text-white" : "text-gray-900";
  const subColor = isDark ? "text-gray-400" : "text-gray-400";
  if (isFree) return <div className={`text-4xl font-extrabold ${textColor}`}>{t("pricing.free")}</div>;
  if (isCustom) return <div className={`text-3xl font-extrabold ${textColor}`}>{t("pricing.custom")}</div>;
  return (
    <div>
      <div className="flex items-end gap-1">
        <span className={`text-4xl font-extrabold ${textColor}`}>{new Intl.NumberFormat("vi-VN").format(vnd)}</span>
        <span className={`text-sm font-medium ${subColor} mb-1.5`}>VND</span>
      </div>
      <p className={`text-xs ${subColor}`}>({t("pricing.priceUsdSuffix", { usd })})</p>
    </div>
  );
}

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-gray-100 rounded-2xl overflow-hidden">
      <button onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-gray-50">
        <p className="text-sm font-semibold text-gray-900">{q}</p>
        {open ? <ChevronUp className="w-4 h-4 text-gray-400 shrink-0" /> : <ChevronDown className="w-4 h-4 text-gray-400 shrink-0" />}
      </button>
      {open && (
        <div className="px-5 pb-5 pt-0">
          <p className="text-sm text-gray-500 leading-relaxed">{a}</p>
        </div>
      )}
    </div>
  );
}

export default function PricingPage() {
  const { isAuthenticated, isLoading, user, refreshUser } = useAuth();
  const { t, lang, toggle } = useLanguage();
  const [livePlans, setLivePlans] = useState<PublicPlan[]>([]);
  const [pricePerCreditVnd, setPricePerCreditVnd] = useState<number | null>(null);
  const [scheduleTarget, setScheduleTarget] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    getPublicPlans().then(setLivePlans).catch(() => undefined);
    getPricePerCredit().then(setPricePerCreditVnd).catch(() => undefined);
  }, []);

  const plans = PLANS.map((plan) => {
    const live = livePlans.find((p) => p.name.toLowerCase() === plan.id.toLowerCase());
    if (!live) return plan;
    return { ...plan, priceVnd: live.priceVnd, priceUsd: live.priceUsd };
  });

  // A logged-in user already on a paid plan gets the deferred-change flow
  // for any *different* plan (including down to Free) — no charge now, the
  // current plan/quota keep running until the cycle ends. Enterprise always
  // goes to "contact sales" regardless. Free/logged-out users check out
  // immediately (no already-paid time to protect).
  const currentPlanName = user?.planName?.toLowerCase();
  const hasActivePaidPlan = isAuthenticated && !!currentPlanName && currentPlanName !== "free";

  const isDeferred = (planId: string) =>
    hasActivePaidPlan && planId !== "enterprise" && planId !== currentPlanName;

  const handleCancelPending = async () => {
    setCancelling(true);
    try {
      await cancelScheduledPlanChange();
      toast.success(t("pricing.schedule.cancelled"));
      await refreshUser();
    } catch {
      toast.error(t("pricing.schedule.toastError"));
    } finally {
      setCancelling(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAFBFA]">
      {/* ── Navbar ── */}
      <nav className="sticky top-0 z-30 bg-white/90 backdrop-blur border-b border-gray-100 px-6 py-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl gradient-brand flex items-center justify-center">
            <Shield className="w-4 h-4 text-white" />
          </div>
          <div>
            <span className="font-extrabold text-gray-900 text-sm">MarketScout</span>
            <span className="text-[#00D26A] text-xs font-semibold ml-1.5">B2B INTELLIGENCE</span>
          </div>
        </Link>
        <div className="flex items-center gap-3">
          <button
            onClick={toggle}
            title={t("lang.switchTo")}
            className="flex items-center gap-1.5 px-3 py-2 text-sm text-gray-600 hover:text-gray-900 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Globe className="w-4 h-4" />
            <span className="font-medium">{lang === "vi" ? "VI" : "EN"}</span>
          </button>
          {isLoading ? null : isAuthenticated ? (
            <Link href="/dashboard" className="px-4 py-2 gradient-brand text-white text-sm font-semibold rounded-xl hover:opacity-90">
              {t("pricing.nav.dashboard")}
            </Link>
          ) : (
            <>
              <Link href="/login" className="px-4 py-2 border border-gray-200 text-gray-700 text-sm font-semibold rounded-xl hover:bg-gray-50">
                {t("pricing.nav.login")}
              </Link>
              <Link href="/register" className="px-4 py-2 gradient-brand text-white text-sm font-semibold rounded-xl hover:opacity-90">
                {t("pricing.nav.tryFree")}
              </Link>
            </>
          )}
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-6 py-16">

        {/* ── Header ── */}
        <div className="text-center mb-14 animate-fade-in-up">
          <span className="text-xs font-bold text-[#00D26A] bg-[#E6F9F0] border border-[#00D26A]/30 px-4 py-1.5 rounded-full uppercase tracking-widest">
            {t("pricing.badge")}
          </span>
          <h1 className="text-5xl font-extrabold text-gray-900 mt-5 mb-4 leading-tight">
            {t("pricing.heroTitleLine1")}<br />
            <span className="gradient-text">{t("pricing.heroTitleLine2")}</span>
          </h1>
          <p className="text-lg text-gray-500 max-w-xl mx-auto">
            {t("pricing.heroSubtitle")}
          </p>
        </div>

        {/* ── Pending plan change banner ── */}
        {user?.pendingPlanName && (
          <div className="flex items-center justify-between gap-4 bg-purple-50 border border-purple-200 rounded-2xl px-6 py-4 mb-8">
            <div className="flex items-center gap-3">
              <Clock className="w-5 h-5 text-purple-500 shrink-0" />
              <p className="text-sm text-purple-800">
                {t("pricing.schedule.banner", {
                  plan: user.pendingPlanName,
                  date: formatDate(user.pendingPlanEffectiveAt),
                })}
              </p>
            </div>
            <button onClick={handleCancelPending} disabled={cancelling}
              className="flex items-center gap-1.5 text-xs font-semibold text-purple-700 hover:text-purple-900 shrink-0 disabled:opacity-50">
              <XCircle className="w-3.5 h-3.5" /> {t("pricing.schedule.cancelPending")}
            </button>
          </div>
        )}

        {/* ── Plans Grid ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-16 stagger">
          {plans.map((plan) => (
            <div key={plan.id}
              className={`relative flex flex-col rounded-2xl border p-6 shadow-sm transition-all hover:shadow-md ${plan.cardStyle}`}>

              {plan.isPopular && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                  <span className="gradient-brand text-white text-[10px] font-extrabold uppercase tracking-widest px-4 py-1.5 rounded-full shadow-lg flex items-center gap-1">
                    <Star className="w-3 h-3" /> {t("pricing.mostPopular")}
                  </span>
                </div>
              )}

              <div className="mb-5">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-bold uppercase tracking-widest" style={{ color: plan.accentColor }}>{t(`pricing.plan.${plan.id}.name`)}</p>
                </div>
                <p className={`text-xs mb-4 ${(plan as { isDark?: boolean }).isDark ? "text-gray-400" : "text-gray-400"}`}>{t(`pricing.plan.${plan.id}.tagline`)}</p>
                <PriceDisplay vnd={plan.priceVnd} usd={plan.priceUsd} isFree={plan.isFree} isCustom={(plan as { isCustom?: boolean }).isCustom} isDark={(plan as { isDark?: boolean }).isDark} />
                <p className="text-xs mt-2 font-semibold" style={{ color: plan.accentColor }}>{t(`pricing.plan.${plan.id}.quotaLabel`)}</p>
              </div>

              {isDeferred(plan.id) ? (
                <button onClick={() => setScheduleTarget(plan.id)}
                  className={`block w-full py-3 rounded-xl text-sm font-bold text-center transition-all mb-5 ${plan.ctaStyle}`}>
                  {t(`pricing.plan.${plan.id}.cta`)} →
                </button>
              ) : (
                <Link href={plan.href}
                  className={`block w-full py-3 rounded-xl text-sm font-bold text-center transition-all mb-5 ${plan.ctaStyle}`}>
                  {t(`pricing.plan.${plan.id}.cta`)} →
                </Link>
              )}

              <div className="flex-1 space-y-2">
                {Array.from({ length: plan.featureCount }).map((_, i) => (
                  <div key={`f-${i}`} className="flex items-start gap-2">
                    <Check className="w-4 h-4 shrink-0 mt-0.5" style={{ color: plan.accentColor }} />
                    <span className={`text-xs ${(plan as { isDark?: boolean }).isDark ? "text-gray-300" : "text-gray-600"}`}>{t(`pricing.plan.${plan.id}.feature.${i}`)}</span>
                  </div>
                ))}
                {Array.from({ length: plan.noFeatureCount }).map((_, i) => (
                  <div key={`nf-${i}`} className="flex items-start gap-2 opacity-40">
                    <X className={`w-4 h-4 shrink-0 mt-0.5 ${(plan as { isDark?: boolean }).isDark ? "text-gray-500" : "text-gray-300"}`} />
                    <span className={`text-xs ${(plan as { isDark?: boolean }).isDark ? "text-gray-500" : "text-gray-400"}`}>{t(`pricing.plan.${plan.id}.noFeature.${i}`)}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* ── Add-on Quota ── */}
        <Reveal variant="scale" className="bg-[#0A1A12] rounded-2xl p-8 mb-16 flex items-center justify-between gap-6">
          <div>
            <span className="text-[10px] font-bold text-[#00D26A] uppercase tracking-widest border border-[#00D26A]/30 rounded px-2 py-0.5">
              {t("pricing.addon.badge")}
            </span>
            <h2 className="text-2xl font-extrabold text-white mt-3 mb-2">{t("pricing.addon.title")}</h2>
            <p className="text-sm text-gray-400 max-w-md">
              {t("pricing.addon.desc")}
            </p>
          </div>
          <div className="shrink-0 text-right">
            <p className="text-3xl font-extrabold text-white mb-1">
              {pricePerCreditVnd !== null ? new Intl.NumberFormat("vi-VN").format(pricePerCreditVnd) : "…"}
              {" "}<span className="text-lg text-gray-400">VND</span>
            </p>
            <p className="text-sm text-gray-400 mb-4">{t("pricing.addon.perUnit")}</p>
            <Link href="/checkout?plan=topup"
              className="inline-flex items-center gap-2 px-6 py-3 gradient-brand text-white font-bold rounded-xl hover:opacity-90 text-sm">
              <Zap className="w-4 h-4" /> {t("pricing.addon.cta")}
            </Link>
          </div>
        </Reveal>

        {/* ── Trust Signals ── */}
        <Reveal stagger className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-16">
          {[
            { icon: "🔒", key: "security" },
            { icon: "💯", key: "refund" },
            { icon: "🌏", key: "countries" },
            { icon: "⚡", key: "uptime" },
          ].map(({ icon, key }) => (
            <div key={key} className="bg-white border border-gray-100 rounded-2xl p-5 text-center shadow-sm">
              <p className="text-3xl mb-2">{icon}</p>
              <p className="text-sm font-bold text-gray-900 mb-0.5">{t(`pricing.trust.${key}.title`)}</p>
              <p className="text-xs text-gray-400">{t(`pricing.trust.${key}.desc`)}</p>
            </div>
          ))}
        </Reveal>

        {/* ── FAQ ── */}
        <Reveal className="max-w-2xl mx-auto">
          <h2 className="text-2xl font-extrabold text-gray-900 text-center mb-8">{t("pricing.faqTitle")}</h2>
          <div className="space-y-3">
            {FAQS.map((key) => (
              <FaqItem key={key} q={t(`pricing.faq.${key}.q`)} a={t(`pricing.faq.${key}.a`)} />
            ))}
          </div>
        </Reveal>

        {/* ── Bottom CTA ── */}
        <div className="mt-16 text-center animate-fade-in-up">
          <h2 className="text-3xl font-extrabold text-gray-900 mb-3">{t("pricing.bottomCta.title")}</h2>
          <p className="text-gray-500 mb-6">{t("pricing.bottomCta.subtitle")}</p>
          <div className="flex items-center justify-center gap-3">
            <Link href="/register"
              className="flex items-center gap-2 px-6 py-3 gradient-brand text-white font-bold rounded-xl hover:opacity-90 text-sm">
              <Zap className="w-4 h-4" /> {t("pricing.bottomCta.tryFree")}
            </Link>
            <a href="mailto:unviantruong26@gmail.com"
              className="flex items-center gap-2 px-6 py-3 border border-gray-200 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 text-sm">
              {t("pricing.bottomCta.contactSales")} <ArrowRight className="w-4 h-4" />
            </a>
          </div>
        </div>

      </main>

      {/* Footer */}
      <footer className="mt-16 border-t border-gray-100 py-8 px-6">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <p className="text-xs text-gray-400">{t("pricing.footer.copyright")}</p>
          <div className="flex items-center gap-4">
            {["terms", "privacy", "enterpriseSla"].map((key) => (
              <a key={key} href="#" className="text-xs text-gray-400 hover:text-gray-600 transition-colors">{t(`pricing.footer.${key}`)}</a>
            ))}
          </div>
        </div>
      </footer>

      {scheduleTarget && user?.planName && (
        <ScheduleChangeModal
          fromPlan={user.planName}
          toPlanId={scheduleTarget}
          onClose={() => setScheduleTarget(null)}
          onScheduled={refreshUser}
        />
      )}
    </div>
  );
}

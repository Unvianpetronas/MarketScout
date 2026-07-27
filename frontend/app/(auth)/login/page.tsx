"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { Eye, EyeOff, Mail, Lock, ArrowLeft, Globe } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { toast } from "sonner";
import { useAuth } from "@/providers/auth-provider";
import { useLanguage } from "@/providers/language-provider";
import { LoginRequest } from "@/types/auth";

// Google Identity Services, injected at runtime via the GSI <script>.
declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string;
            callback: (resp: { credential: string }) => void;
          }) => void;
          renderButton: (parent: HTMLElement, options: Record<string, unknown>) => void;
        };
      };
    };
  }
}

// Inlined at build time. Empty until a Google OAuth client ID is configured —
// keeps the Google button hidden so the page works without it.
const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

export default function LoginPage() {
  const { login, loginWithGoogle, isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const { t, lang, toggle } = useLanguage();
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const googleBtnRef = useRef<HTMLDivElement>(null);
  // Holds the latest credential handler so the GSI callback (registered once)
  // always calls the current loginWithGoogle without re-initializing GSI.
  const onGoogleCredential = useRef<(credential: string) => void>(() => {});

  useEffect(() => {
    if (!isAuthLoading && isAuthenticated) {
      router.replace("/dashboard");
    }
  }, [isAuthLoading, isAuthenticated, router]);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginRequest>();

  const onSubmit = async (data: LoginRequest) => {
    setIsLoading(true);
    try {
      await login(data, rememberMe);
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        t("auth.errInvalidCredentials");
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("verified") === "true") {
      toast.success(t("auth.emailVerifiedToast"));
    }
    // Mount-only: this one-shot toast must not re-fire when `t` changes on a
    // language toggle.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep the ref pointing at the latest handler (fresh loginWithGoogle / t)
  // without re-initializing Google Identity Services.
  useEffect(() => {
    onGoogleCredential.current = async (credential: string) => {
      setIsLoading(true);
      try {
        await loginWithGoogle(credential);
      } catch (err: unknown) {
        const message =
          (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
          t("auth.errInvalidCredentials");
        toast.error(message);
      } finally {
        setIsLoading(false);
      }
    };
  });

  // Load Google Identity Services and render its official Sign-In button.
  useEffect(() => {
    if (!googleClientId) return;

    const renderGoogleButton = () => {
      if (!window.google || !googleBtnRef.current) return;
      window.google.accounts.id.initialize({
        client_id: googleClientId,
        callback: (resp) => onGoogleCredential.current(resp.credential),
      });
      // Clear before (re)rendering so a language switch replaces the button
      // instead of appending a second one.
      googleBtnRef.current.innerHTML = "";
      window.google.accounts.id.renderButton(googleBtnRef.current, {
        type: "standard",
        theme: "outline",
        size: "large",
        text: "continue_with",
        width: 340,
        locale: lang === "vi" ? "vi" : "en",
      });
    };

    if (window.google) {
      renderGoogleButton();
      return;
    }
    const existing = document.getElementById("google-gsi");
    if (existing) {
      existing.addEventListener("load", renderGoogleButton);
      return () => existing.removeEventListener("load", renderGoogleButton);
    }
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.id = "google-gsi";
    script.onload = renderGoogleButton;
    document.body.appendChild(script);
  }, [lang]);

  if (isAuthLoading || isAuthenticated) return null;

  return (
    <div className="min-h-screen flex">
      {/* LEFT PANEL — 42% */}
      <div
        className="hidden lg:flex lg:w-[42%] flex-col justify-between p-10"
        style={{
          background: "linear-gradient(135deg, #0b1120 0%, #10162b 50%, #0b1120 100%)",
        }}
      >
        {/* Top section */}
        <div>
          {/* Logo */}
          <div className="flex items-center gap-3 mb-8">
            <Logo className="w-12 h-12" />
            <span className="font-display text-white font-bold text-xl tracking-tight">MarketScout</span>
          </div>

          {/* Badge */}
          <div className="inline-block mb-8">
            <span className="text-[10px] font-semibold tracking-widest text-[#5FD48A] uppercase border border-[#2A5A3A] rounded-full px-3 py-1">
              {t("auth.badge")}
            </span>
          </div>

          {/* Hero */}
          <h1 className="text-5xl font-extrabold text-white leading-tight mb-6">
            {t("auth.heroPrefix")}{" "}
            <span
              className="text-[#059669]"
              style={{
                textDecorationLine: "underline",
                textDecorationStyle: "wavy",
                textUnderlineOffset: "4px",
              }}
            >
              {t("auth.heroHighlight")}
            </span>
          </h1>

          <p className="text-[#8BAA98] text-base leading-relaxed mb-10">
            {t("auth.heroSubtitle")}
          </p>

          {/* Feature bullets */}
          <div className="space-y-5">
            {[
              {
                title: t("auth.feature1.title"),
                desc: t("auth.feature1.desc"),
              },
              {
                title: t("auth.feature2.title"),
                desc: t("auth.feature2.desc"),
              },
              {
                title: t("auth.feature3.title"),
                desc: t("auth.feature3.desc"),
              },
            ].map((item) => (
              <div key={item.title} className="flex items-start gap-3">
                <div className="bg-[#059669] rounded-full w-6 h-6 flex items-center justify-center shrink-0 mt-0.5">
                  <svg className="w-3.5 h-3.5 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div>
                  <p className="text-white font-semibold text-sm">{item.title}</p>
                  <p className="text-[#6A8A78] text-sm">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom navigator box */}
        <div className="bg-white/5 border border-white/10 rounded-xl p-5">
          <p className="text-[#5FD48A] text-xs font-semibold uppercase tracking-widest mb-3">
            {t("auth.navigatorLabel")}
          </p>
          <div className="flex gap-2 flex-wrap">
            {["Dashboard", "Verify", "Pricing"].map((label) => (
              <button
                key={label}
                className="px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-white/70 text-xs font-medium transition-colors"
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* RIGHT PANEL — 58% */}
      <div className="flex-1 flex flex-col items-center justify-center p-8 bg-[#E8EDE9]">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-10">
          <div className="flex items-center justify-between mb-6">
            <Link
              href="/"
              className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-600 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              {t("auth.backToHome")}
            </Link>

            <button
              type="button"
              onClick={toggle}
              title={t("lang.switchTo")}
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-gray-500 hover:text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Globe className="w-3.5 h-3.5" />
              {lang === "vi" ? "VI" : "EN"}
            </button>
          </div>

          {/* Mobile logo */}
          <div className="flex lg:hidden items-center gap-2 mb-8">
            <Logo className="w-10 h-10" />
            <span className="font-display font-bold text-gray-900">MarketScout</span>
          </div>

          <h1 className="text-4xl font-bold text-gray-900 mb-1">{t("auth.signInTitle")}</h1>
          <p className="text-gray-500 text-sm mb-8">{t("auth.signInSubtitle")}</p>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            {/* Email */}
            <div>
              <label className="block text-xs font-semibold tracking-wider text-gray-500 uppercase mb-2">
                {t("auth.emailLabel")}
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="email"
                  placeholder="you@corporate.com"
                  {...register("email", { required: t("auth.emailRequired") })}
                  className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#059669] focus:ring-2 focus:ring-[#059669]/20 transition-all"
                />
              </div>
              {errors.email && (
                <p className="mt-1 text-xs text-red-500">{errors.email.message}</p>
              )}
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-semibold tracking-wider text-gray-500 uppercase mb-2">
                {t("auth.passwordLabel")}
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  {...register("password", { required: t("auth.passwordRequired") })}
                  className="w-full pl-10 pr-10 py-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#059669] focus:ring-2 focus:ring-[#059669]/20 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && (
                <p className="mt-1 text-xs text-red-500">{errors.password.message}</p>
              )}
            </div>

            {/* Remember + Forgot */}
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 accent-[#059669]"
                />
                <span className="text-sm text-gray-600">{t("auth.rememberMe")}</span>
              </label>
              <Link href="/forgot-password" className="text-sm text-[#059669] hover:underline font-medium">
                {t("auth.forgotPassword")}
              </Link>
            </div>

            {/* CTA */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3.5 bg-[#059669] hover:bg-[#047857] text-white font-semibold rounded-lg transition-colors disabled:opacity-60 flex items-center justify-center gap-2 text-base"
            >
              {isLoading && (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              )}
              {t("auth.submitBtn")}
            </button>
          </form>

          {/* Google Sign-In — only shown once a Google OAuth client ID is
              configured; the button itself is rendered by Google Identity
              Services into the div below. */}
          {googleClientId && (
            <>
              <div className="my-6 flex items-center gap-3">
                <div className="flex-1 h-px bg-gray-200" />
                <span className="text-[10px] text-gray-400 font-semibold uppercase tracking-widest">
                  {t("auth.orConnectVia")}
                </span>
                <div className="flex-1 h-px bg-gray-200" />
              </div>
              <div ref={googleBtnRef} className="flex justify-center" />
            </>
          )}

          <p className="text-center text-sm text-gray-500 mt-8">
            {t("auth.noAccount")}{" "}
            <Link href="/register" className="text-[#059669] font-medium hover:underline">
              {t("auth.signUpFreeTrial")}
            </Link>
          </p>
        </div>

        {/* Footer */}
        <p className="text-xs text-gray-400 text-center mt-6 max-w-sm">
          {t("auth.footerCopyright")}
        </p>
      </div>
    </div>
  );
}

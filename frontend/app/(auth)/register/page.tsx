"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { CheckCircle2 } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { toast } from "sonner";
import { register as registerApi } from "@/services/auth.service";
import { useAuth } from "@/providers/auth-provider";

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

interface RegisterFormData {
  fullName: string;
  email: string;
  password: string;
  confirmPassword: string;
  companyName?: string;
}

export default function RegisterPage() {
  const { loginWithGoogle } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const googleBtnRef = useRef<HTMLDivElement>(null);
  // Holds the latest credential handler so the GSI callback (registered once)
  // always calls the current loginWithGoogle without re-initializing GSI.
  const onGoogleCredential = useRef<(credential: string) => void>(() => {});

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<RegisterFormData>();

  const onSubmit = async (data: RegisterFormData) => {
    setIsLoading(true);
    try {
      const res = await registerApi({
        fullName: data.fullName,
        email: data.email,
        password: data.password,
        companyName: data.companyName,
      });
      setSuccess(res.email);
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        "Registration failed. Please try again.";
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  // Keep the ref pointing at the latest handler (fresh loginWithGoogle) without
  // re-initializing Google Identity Services. loginWithGoogle auto-creates a
  // free-plan account on first sign-in, so this doubles as sign-up.
  useEffect(() => {
    onGoogleCredential.current = async (credential: string) => {
      setIsLoading(true);
      try {
        await loginWithGoogle(credential);
      } catch (err: unknown) {
        const message =
          (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
          "Google sign-up failed. Please try again.";
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
      googleBtnRef.current.innerHTML = "";
      window.google.accounts.id.renderButton(googleBtnRef.current, {
        type: "standard",
        theme: "outline",
        size: "large",
        text: "signup_with",
        width: 340,
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
  }, []);

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-10 max-w-md w-full text-center">
          <div className="w-16 h-16 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-8 h-8 text-[#059669]" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Check your email</h2>
          <p className="text-gray-500 mb-6">
            We&apos;ve sent a verification link to <strong>{success}</strong>. Please click the link
            to activate your MarketScout account.
          </p>
          <Link
            href="/login"
            className="inline-block w-full py-3 bg-[#059669] text-white font-semibold rounded-lg text-center hover:bg-[#047857] transition-colors"
          >
            Back to Sign In
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 w-full max-w-md">
        <div className="flex items-center gap-2 mb-6">
          <Logo className="w-8 h-8" />
          <span className="font-display font-bold text-gray-900">MarketScout</span>
        </div>

        <h1 className="text-2xl font-bold text-gray-900 mb-1">Create your account</h1>
        <p className="text-gray-500 text-sm mb-6">Start your free trial. No credit card required.</p>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
              Full Name
            </label>
            <input
              {...register("fullName", { required: "Full name is required" })}
              placeholder="John Smith"
              className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#059669] focus:ring-2 focus:ring-[#059669]/20 transition-all"
            />
            {errors.fullName && (
              <p className="mt-1 text-xs text-red-500">{errors.fullName.message}</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
              Email
            </label>
            <input
              type="email"
              {...register("email", { required: "Email is required" })}
              placeholder="you@company.com"
              className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#059669] focus:ring-2 focus:ring-[#059669]/20 transition-all"
            />
            {errors.email && (
              <p className="mt-1 text-xs text-red-500">{errors.email.message}</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
              Password
            </label>
            <input
              type="password"
              {...register("password", {
                required: "Password is required",
                minLength: { value: 8, message: "Minimum 8 characters" },
              })}
              placeholder="••••••••"
              className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#059669] focus:ring-2 focus:ring-[#059669]/20 transition-all"
            />
            {errors.password && (
              <p className="mt-1 text-xs text-red-500">{errors.password.message}</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
              Confirm Password
            </label>
            <input
              type="password"
              {...register("confirmPassword", {
                required: "Please confirm your password",
                validate: (val) => val === watch("password") || "Passwords do not match",
              })}
              placeholder="••••••••"
              className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#059669] focus:ring-2 focus:ring-[#059669]/20 transition-all"
            />
            {errors.confirmPassword && (
              <p className="mt-1 text-xs text-red-500">{errors.confirmPassword.message}</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
              Company Name <span className="text-gray-300 normal-case font-normal">(optional)</span>
            </label>
            <input
              {...register("companyName")}
              placeholder="Acme Corp"
              className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#059669] focus:ring-2 focus:ring-[#059669]/20 transition-all"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 bg-[#059669] text-white font-semibold rounded-lg hover:bg-[#047857] transition-colors disabled:opacity-60 flex items-center justify-center gap-2 mt-2"
          >
            {isLoading && (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            )}
            Create Account
          </button>
        </form>

        {/* Google Sign-Up — only shown once a Google OAuth client ID is
            configured; the button itself is rendered by Google Identity
            Services into the div below. Signing up with Google auto-creates a
            free-plan account, so no separate registration step is needed. */}
        {googleClientId && (
          <>
            <div className="my-6 flex items-center gap-3">
              <div className="flex-1 h-px bg-gray-200" />
              <span className="text-[10px] text-gray-400 font-semibold uppercase tracking-widest">
                Or sign up with
              </span>
              <div className="flex-1 h-px bg-gray-200" />
            </div>
            <div ref={googleBtnRef} className="flex justify-center" />
          </>
        )}

        <p className="text-center text-sm text-gray-500 mt-6">
          Already have an account?{" "}
          <Link href="/login" className="text-[#059669] font-medium hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}

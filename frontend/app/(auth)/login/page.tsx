"use client";

import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { Eye, EyeOff, Mail, Lock, Navigation } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/providers/auth-provider";
import { LoginRequest } from "@/types/auth";

export default function LoginPage() {
  const { login } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginRequest>();

  const onSubmit = async (data: LoginRequest) => {
    setIsLoading(true);
    try {
      await login(data);
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        "Invalid credentials. Please try again.";
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* LEFT PANEL — 42% */}
      <div
        className="hidden lg:flex lg:w-[42%] flex-col justify-between p-10"
        style={{
          background: "linear-gradient(135deg, #0A1A12 0%, #0D2218 50%, #0A1A12 100%)",
        }}
      >
        {/* Top section */}
        <div>
          {/* Logo */}
          <div className="flex items-center gap-3 mb-8">
            <div className="w-12 h-12 rounded-xl bg-[#1A3A28] flex items-center justify-center">
              <Navigation className="w-6 h-6 text-white" />
            </div>
            <span className="text-white font-bold text-xl tracking-tight">MarketScout</span>
          </div>

          {/* Badge */}
          <div className="inline-block mb-8">
            <span className="text-[10px] font-semibold tracking-widest text-[#5FD48A] uppercase border border-[#2A5A3A] rounded-full px-3 py-1">
              Intelligence Suite
            </span>
          </div>

          {/* Hero */}
          <h1 className="text-5xl font-extrabold text-white leading-tight mb-6">
            The quickest way to scout{" "}
            <span
              className="text-[#00D26A]"
              style={{
                textDecorationLine: "underline",
                textDecorationStyle: "wavy",
                textUnderlineOffset: "4px",
              }}
            >
              market shifts.
            </span>
          </h1>

          <p className="text-[#8BAA98] text-base leading-relaxed mb-10">
            MarketScout delivers real-time partner verification across 190+ countries
            using our AI-powered 8-pillar intelligence framework.
          </p>

          {/* Feature bullets */}
          <div className="space-y-5">
            {[
              {
                title: "End-to-End Encryption",
                desc: "All data secured with AES-256 enterprise-grade cryptography.",
              },
              {
                title: "Multi-Factor Compliance",
                desc: "8-pillar analysis across legal, financial, and operational domains.",
              },
              {
                title: "190+ Countries Covered",
                desc: "Global corporate registrar sync updated within 24 hours.",
              },
            ].map((item) => (
              <div key={item.title} className="flex items-start gap-3">
                <div className="bg-[#00D26A] rounded-full w-6 h-6 flex items-center justify-center shrink-0 mt-0.5">
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
            Fidelity Prototype Navigator
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
          {/* Mobile logo */}
          <div className="flex lg:hidden items-center gap-2 mb-8">
            <div className="w-10 h-10 rounded-xl bg-[#1A3A28] flex items-center justify-center">
              <Navigation className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-gray-900">MarketScout</span>
          </div>

          <h1 className="text-4xl font-bold text-gray-900 mb-1">Sign In</h1>
          <p className="text-gray-500 text-sm mb-8">Welcome back. Enter your credentials to continue.</p>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            {/* Email */}
            <div>
              <label className="block text-xs font-semibold tracking-wider text-gray-500 uppercase mb-2">
                Business Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="email"
                  placeholder="you@corporate.com"
                  {...register("email", { required: "Email is required" })}
                  className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#00D26A] focus:ring-2 focus:ring-[#00D26A]/20 transition-all"
                />
              </div>
              {errors.email && (
                <p className="mt-1 text-xs text-red-500">{errors.email.message}</p>
              )}
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-semibold tracking-wider text-gray-500 uppercase mb-2">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  {...register("password", { required: "Password is required" })}
                  className="w-full pl-10 pr-10 py-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#00D26A] focus:ring-2 focus:ring-[#00D26A]/20 transition-all"
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
                  className="w-4 h-4 rounded border-gray-300 accent-[#00D26A]"
                />
                <span className="text-sm text-gray-600">Remember Me</span>
              </label>
              <Link href="/forgot-password" className="text-sm text-[#00D26A] hover:underline font-medium">
                Forgot Password?
              </Link>
            </div>

            {/* CTA */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3.5 bg-[#00D26A] hover:bg-[#00B85D] text-white font-semibold rounded-lg transition-colors disabled:opacity-60 flex items-center justify-center gap-2 text-base"
            >
              {isLoading && (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              )}
              Sign In to Dashboard →
            </button>
          </form>

          {/* Divider */}
          <div className="my-6 flex items-center gap-3">
            <div className="flex-1 h-px bg-gray-200" />
            <span className="text-[10px] text-gray-400 font-semibold uppercase tracking-widest">
              Or Connect Via
            </span>
            <div className="flex-1 h-px bg-gray-200" />
          </div>

          {/* SSO buttons */}
          <div className="grid grid-cols-2 gap-3">
            <button className="py-2.5 border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">
              Corporate SSO
            </button>
            <button className="py-2.5 border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors flex items-center justify-center gap-2">
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Google Work
            </button>
          </div>

          <p className="text-center text-sm text-gray-500 mt-8">
            Don&apos;t have an account?{" "}
            <Link href="/register" className="text-[#00D26A] font-medium hover:underline">
              Sign up for a free trial
            </Link>
          </p>
        </div>

        {/* Footer */}
        <p className="text-xs text-gray-400 text-center mt-6 max-w-sm">
          Protected by enterprise grade cryptography. &copy; 2025 MarketScout Inc. All rights reserved.
        </p>
      </div>
    </div>
  );
}

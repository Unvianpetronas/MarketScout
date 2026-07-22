"use client";

import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { ArrowLeft, Mail, CheckCircle2 } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { toast } from "sonner";
import { forgotPassword } from "@/services/auth.service";

interface ForgotPasswordForm {
  email: string;
}

export default function ForgotPasswordPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors },
  } = useForm<ForgotPasswordForm>();

  const onSubmit = async (data: ForgotPasswordForm) => {
    setIsLoading(true);
    try {
      await forgotPassword({ email: data.email });
      setSent(true);
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        "Failed to send reset link. Please try again.";
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 w-full max-w-md">
        <div className="flex items-center gap-2 mb-8">
          <Logo className="w-8 h-8" />
          <span className="font-bold text-gray-900">MarketScout</span>
        </div>

        {sent ? (
          <div className="text-center">
            <div className="w-14 h-14 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-7 h-7 text-[#00D26A]" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Check your inbox</h2>
            <p className="text-gray-500 text-sm mb-6">
              We sent a password reset link to <strong>{getValues("email")}</strong>. Check your
              email and follow the instructions.
            </p>
            <Link
              href="/login"
              className="flex items-center justify-center gap-2 text-sm text-[#00D26A] hover:underline font-medium"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Sign In
            </Link>
          </div>
        ) : (
          <>
            <h1 className="text-2xl font-bold text-gray-900 mb-1">Forgot password?</h1>
            <p className="text-gray-500 text-sm mb-6">
              Enter your business email and we&apos;ll send you a reset link.
            </p>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                  Business Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="email"
                    {...register("email", { required: "Email is required" })}
                    placeholder="you@corporate.com"
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#00D26A] focus:ring-2 focus:ring-[#00D26A]/20 transition-all"
                  />
                </div>
                {errors.email && (
                  <p className="mt-1 text-xs text-red-500">{errors.email.message}</p>
                )}
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 bg-[#00D26A] text-white font-semibold rounded-lg hover:bg-[#00b85d] transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {isLoading && (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                )}
                Send Reset Link
              </button>
            </form>

            <Link
              href="/login"
              className="flex items-center justify-center gap-2 mt-6 text-sm text-gray-500 hover:text-gray-700"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Sign In
            </Link>
          </>
        )}
      </div>
    </div>
  );
}

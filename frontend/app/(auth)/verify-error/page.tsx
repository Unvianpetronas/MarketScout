"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { BarChart2, ArrowLeft, XCircle } from "lucide-react";

function VerifyErrorContent() {
  const searchParams = useSearchParams();
  const message = searchParams.get("message") || "Verification failed. The link may be invalid or expired.";

  return (
    <div className="text-center">
      <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
        <XCircle className="w-7 h-7 text-red-500" />
      </div>
      <h2 className="text-xl font-bold text-gray-900 mb-2">Verification Failed</h2>
      <p className="text-gray-500 text-sm mb-6">
        {message}
      </p>
      <Link
        href="/login"
        className="flex items-center justify-center gap-2 text-sm text-[#00D26A] hover:underline font-medium"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Sign In
      </Link>
    </div>
  );
}

export default function VerifyErrorPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 w-full max-w-md">
        <div className="flex items-center gap-2 mb-8">
          <div className="w-8 h-8 rounded-full bg-[#00D26A] flex items-center justify-center">
            <BarChart2 className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-gray-900">MarketScout</span>
        </div>

        <Suspense fallback={<div className="text-center">Loading...</div>}>
          <VerifyErrorContent />
        </Suspense>
      </div>
    </div>
  );
}

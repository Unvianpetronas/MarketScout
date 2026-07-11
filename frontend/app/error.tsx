"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";

// Route-segment error boundary — Next.js renders this instead of white-screening
// the whole app when a client component throws during render/an event handler.
export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Unhandled UI error:", error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FAFBFA] px-6">
      <div className="max-w-md w-full bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center">
        <div className="w-14 h-14 mx-auto mb-5 rounded-2xl bg-[#FFF1F0] flex items-center justify-center">
          <AlertTriangle className="w-7 h-7 text-red-500" />
        </div>
        <h1 className="text-lg font-extrabold text-gray-900 mb-2">Đã có lỗi xảy ra</h1>
        <p className="text-sm text-gray-500 mb-7">
          Trang này gặp sự cố ngoài dự kiến. Bạn có thể thử lại, hoặc quay về trang chủ nếu vẫn còn lỗi.
        </p>
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={reset}
            className="flex items-center gap-2 px-5 py-2.5 gradient-brand text-white text-sm font-semibold rounded-xl hover:opacity-90 transition-opacity"
          >
            <RefreshCw className="w-4 h-4" /> Thử lại
          </button>
          <Link
            href="/dashboard"
            className="flex items-center gap-2 px-5 py-2.5 border border-gray-200 text-gray-600 text-sm font-semibold rounded-xl hover:bg-gray-50 transition-colors"
          >
            <Home className="w-4 h-4" /> Về trang chủ
          </Link>
        </div>
      </div>
    </div>
  );
}

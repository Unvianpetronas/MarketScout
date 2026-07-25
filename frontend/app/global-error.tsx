"use client";

import { useEffect } from "react";

// Only fires if the ROOT layout itself throws (very rare — layout.tsx has no
// data fetching/complex logic today). Must render its own <html>/<body> since
// it replaces the root layout entirely when triggered.
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Unhandled root layout error:", error);
  }, [error]);

  return (
    <html lang="en">
      <body style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "sans-serif", background: "#faf9f6" }}>
        <div style={{ maxWidth: 420, textAlign: "center", padding: 24 }}>
          <h1 style={{ fontSize: 18, fontWeight: 800, color: "#111827", marginBottom: 8 }}>
            Ứng dụng gặp sự cố nghiêm trọng
          </h1>
          <p style={{ fontSize: 14, color: "#6B7280", marginBottom: 24 }}>
            Vui lòng tải lại trang. Nếu lỗi vẫn tiếp diễn, hãy liên hệ hỗ trợ.
          </p>
          <button
            onClick={reset}
            style={{
              padding: "10px 20px",
              background: "#059669",
              color: "#0b1120",
              fontWeight: 700,
              fontSize: 14,
              borderRadius: 12,
              border: "none",
              cursor: "pointer",
            }}
          >
            Tải lại
          </button>
        </div>
      </body>
    </html>
  );
}

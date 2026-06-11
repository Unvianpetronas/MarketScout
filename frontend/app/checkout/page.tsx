"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Copy, List, ArrowLeft, Shield, Lock } from "lucide-react";
import { toast } from "sonner";

function CheckoutContent() {
  const searchParams = useSearchParams();
  const planKey = searchParams.get("plan") || "starter";

  const [method, setMethod] = useState<"vietqr" | "card" | "momo">("vietqr");
  const [isPaying, setIsPaying] = useState(false);
  const [transferContent] = useState(`MSCOUT928374X`);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text).then(() => toast.success("Copied to clipboard!"));
  };

  const handlePay = async () => {
    setIsPaying(true);
    setTimeout(() => {
      setIsPaying(false);
      toast.success("Payment initiated. Please complete the transfer.");
    }, 1500);
  };

  const planName = planKey === "pro" ? "Scale Top-Up Quota" : planKey === "enterprise" ? "Enterprise Custom" : "Scale Top-Up Quota";

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
        <div className="flex items-center gap-4">
          <Link href="/dashboard" className="text-gray-400 text-sm flex items-center gap-1 hover:text-white transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </Link>
          <span className="bg-[#00D26A]/10 text-[#00D26A] border border-[#00D26A]/30 rounded font-mono text-xs px-2 py-1">
            Client ID: SCOUT-9482-VN
          </span>
        </div>
      </nav>

      {/* Info bar */}
      <div className="bg-[#1A1A0A] border-b border-yellow-900/30 py-2 px-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-yellow-500" />
          <span className="text-yellow-400 text-xs">Demo Mode Active — Payments are simulated in this environment.</span>
        </div>
        <button className="text-yellow-400 text-xs hover:underline">TOGGLE STATE SIMULATION</button>
      </div>

      <main className="max-w-6xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* LEFT COLUMN */}
          <div className="lg:col-span-2 space-y-6">
            <div>
              <h1 className="text-3xl font-bold text-white mb-1">Secure Checkout</h1>
              <p className="text-gray-400 text-sm">Complete your payment to activate your plan instantly.</p>
            </div>

            {/* Payment Method */}
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Select Payment Method</p>
              <div className="grid grid-cols-3 gap-3">
                {/* VietQR */}
                <button
                  onClick={() => setMethod("vietqr")}
                  className={`relative flex flex-col items-center gap-2 p-4 rounded-xl border transition-all ${
                    method === "vietqr"
                      ? "border-[#00D26A] bg-[#00D26A]/5"
                      : "border-white/10 bg-[#1A2035] hover:border-white/20"
                  }`}
                >
                  <div className={`w-3 h-3 rounded-full border-2 ${method === "vietqr" ? "border-[#00D26A] bg-[#00D26A]" : "border-gray-500"}`} />
                  <span className="text-white text-sm font-semibold">VietQR</span>
                  {method === "vietqr" && (
                    <span className="bg-[#00D26A] text-black text-[10px] font-bold px-1.5 py-0.5 rounded">INSTANT</span>
                  )}
                </button>

                {/* Visa/CC */}
                <button
                  onClick={() => setMethod("card")}
                  className={`relative flex flex-col items-center gap-2 p-4 rounded-xl border transition-all ${
                    method === "card"
                      ? "border-[#00D26A] bg-[#00D26A]/5"
                      : "border-white/10 bg-[#1A2035] hover:border-white/20"
                  }`}
                >
                  <div className={`w-3 h-3 rounded-full border-2 ${method === "card" ? "border-[#00D26A] bg-[#00D26A]" : "border-gray-500"}`} />
                  <span className="text-white text-sm font-semibold">Visa / Credit Card</span>
                  <div className="flex gap-1">
                    <span className="text-blue-400 text-xs font-bold">VISA</span>
                    <span className="text-red-400 text-xs font-bold">MC</span>
                  </div>
                </button>

                {/* MoMo */}
                <button
                  onClick={() => setMethod("momo")}
                  className={`relative flex flex-col items-center gap-2 p-4 rounded-xl border transition-all ${
                    method === "momo"
                      ? "border-[#00D26A] bg-[#00D26A]/5"
                      : "border-white/10 bg-[#1A2035] hover:border-white/20"
                  }`}
                >
                  <div className={`w-3 h-3 rounded-full border-2 ${method === "momo" ? "border-[#00D26A] bg-[#00D26A]" : "border-gray-500"}`} />
                  <span className="text-white text-sm font-semibold">MoMo</span>
                  <span className="text-pink-400 text-xs font-bold">MoMo</span>
                </button>
              </div>
            </div>

            {/* VietQR Panel */}
            {method === "vietqr" && (
              <div className="bg-[#1A2035] rounded-xl border border-white/10 p-6">
                <div className="flex gap-6">
                  {/* QR */}
                  <div className="shrink-0">
                    <div className="bg-white rounded-xl p-4 w-40 h-40 flex items-center justify-center">
                      <div className="w-full h-full bg-gray-200 rounded flex items-center justify-center">
                        <svg viewBox="0 0 100 100" className="w-24 h-24">
                          <rect x="10" y="10" width="30" height="30" fill="black" rx="2"/>
                          <rect x="15" y="15" width="20" height="20" fill="white" rx="1"/>
                          <rect x="20" y="20" width="10" height="10" fill="black"/>
                          <rect x="60" y="10" width="30" height="30" fill="black" rx="2"/>
                          <rect x="65" y="15" width="20" height="20" fill="white" rx="1"/>
                          <rect x="70" y="20" width="10" height="10" fill="black"/>
                          <rect x="10" y="60" width="30" height="30" fill="black" rx="2"/>
                          <rect x="15" y="65" width="20" height="20" fill="white" rx="1"/>
                          <rect x="20" y="70" width="10" height="10" fill="black"/>
                          <rect x="45" y="45" width="10" height="10" fill="black"/>
                          <rect x="60" y="45" width="10" height="10" fill="black"/>
                          <rect x="75" y="45" width="10" height="10" fill="black"/>
                          <rect x="45" y="60" width="10" height="10" fill="black"/>
                          <rect x="60" y="75" width="10" height="10" fill="black"/>
                          <rect x="75" y="60" width="10" height="10" fill="black"/>
                        </svg>
                      </div>
                    </div>
                    <p className="text-center text-xs text-gray-500 mt-2 font-semibold uppercase tracking-wider">NAPAS AUTOPAY</p>
                    <div className="mt-1 bg-[#00D26A]/10 rounded px-2 py-0.5 text-center">
                      <span className="text-[#00D26A] text-[10px] font-bold">VietQR</span>
                    </div>
                  </div>

                  {/* Transfer details */}
                  <div className="flex-1 space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Transfer Content</span>
                      <span className="bg-orange-500/20 text-orange-400 text-xs px-2 py-0.5 rounded font-medium">
                        Pending - Waiting for confirmation
                      </span>
                    </div>

                    <div>
                      <p className="text-xs text-gray-500 mb-1 uppercase tracking-wider font-semibold">Message Content</p>
                      <div className="bg-[#1A2035] rounded-lg p-4 border border-white/10 flex items-center justify-between">
                        <span className="font-mono text-white text-lg font-bold tracking-widest">{transferContent}</span>
                        <button
                          onClick={() => handleCopy(transferContent)}
                          className="text-gray-400 hover:text-[#00D26A] transition-colors"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-500">Bank</span>
                        <span className="text-white text-sm font-semibold">Techcombank (TCB)</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-500">Account Number</span>
                        <div className="flex items-center gap-2">
                          <span className="text-white text-sm font-mono font-bold">1903 5284 9110 88</span>
                          <button onClick={() => handleCopy("190352849110 88")} className="text-gray-500 hover:text-[#00D26A]">
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="bg-blue-950/50 border border-blue-800/30 rounded-lg p-3">
                      <p className="text-blue-300 text-xs">
                        Your account will be automatically activated within 2 minutes of confirmed transfer detection.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Card Panel */}
            {method === "card" && (
              <div className="bg-[#1A2035] rounded-xl border border-white/10 p-6">
                <h3 className="text-sm font-bold text-white mb-4">Card Details</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Card Number</label>
                    <input placeholder="1234 5678 9012 3456" className="w-full px-3 py-2.5 bg-[#0A0E1A] border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-[#00D26A]" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Expiry</label>
                      <input placeholder="MM / YY" className="w-full px-3 py-2.5 bg-[#0A0E1A] border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-[#00D26A]" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">CVV</label>
                      <input placeholder="•••" className="w-full px-3 py-2.5 bg-[#0A0E1A] border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-[#00D26A]" />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* MoMo Panel */}
            {method === "momo" && (
              <div className="bg-[#1A2035] rounded-xl border border-white/10 p-6">
                <h3 className="text-sm font-bold text-white mb-4">MoMo Wallet Transfer</h3>
                <div className="bg-pink-950/30 border border-pink-800/30 rounded-lg p-4">
                  <p className="text-sm font-semibold text-pink-400 mb-1">Transfer to MoMo Number</p>
                  <div className="flex items-center justify-between">
                    <p className="text-lg font-bold text-white font-mono">0901 234 567</p>
                    <button onClick={() => handleCopy("0901234567")} className="text-pink-400 hover:text-pink-300">
                      <Copy className="w-4 h-4" />
                    </button>
                  </div>
                  <p className="text-xs text-pink-300 mt-2">Include transfer content: <strong>{transferContent}</strong></p>
                </div>
              </div>
            )}

            {/* Bottom badges */}
            <div className="flex gap-4">
              <div className="flex items-center gap-2 bg-[#1A2035] border border-white/10 rounded-lg px-4 py-2.5">
                <div className="w-5 h-5 bg-[#00D26A] rounded-full flex items-center justify-center">
                  <svg className="w-3 h-3 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <span className="text-white text-xs font-semibold">100% REFUND POLICY</span>
              </div>
              <div className="flex items-center gap-2 bg-[#1A2035] border border-white/10 rounded-lg px-4 py-2.5">
                <Shield className="w-4 h-4 text-blue-400" />
                <span className="text-white text-xs font-semibold">ENTERPRISE GRADE SECURITY</span>
              </div>
              <div className="flex items-center gap-2 bg-[#1A2035] border border-white/10 rounded-lg px-4 py-2.5">
                <Lock className="w-4 h-4 text-gray-300" />
                <span className="text-white text-xs font-semibold">ISO 27001 &amp; PCI-DSS COMPLIANT</span>
              </div>
            </div>

            {/* Trust copy */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs text-gray-500 leading-relaxed">
              <p>
                Full refund within the first 24 hours if no verify quota has been consumed. Risk-free purchase.
              </p>
              <p>
                Payment processes securely through certified payment gateways. System checks transaction logs every 3 seconds.
              </p>
            </div>
          </div>

          {/* RIGHT COLUMN — Order Summary */}
          <div>
            <div className="bg-gradient-to-b from-[#1A2035] to-[#0F1629] rounded-2xl border border-white/10 p-6 sticky top-4">
              <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-4">Order Summary</p>

              <div className="bg-gradient-to-br from-[#1A2840] to-[#0F1A30] rounded-xl border border-white/10 p-5 mb-5">
                <div className="flex items-center justify-between mb-3">
                  <span className="bg-[#00D26A]/10 text-[#00D26A] text-xs font-bold px-2 py-1 rounded">B2B PLAN</span>
                  <List className="w-4 h-4 text-gray-400" />
                </div>
                <h3 className="text-white text-xl font-bold mb-1">{planName}</h3>
                <p className="text-[#00D26A] text-sm mb-4">MarketScout Verification API Access</p>

                <div className="space-y-2.5 mb-4">
                  {[
                    { label: "Included Quota", value: "200 queries/mo" },
                    { label: "Rate Limit", value: "60 req/min" },
                    { label: "Concurrent Keys", value: "3 API keys" },
                    { label: "SLA", value: "99.9% uptime" },
                  ].map((row) => (
                    <div key={row.label} className="flex items-center justify-between text-sm">
                      <span className="text-gray-400">{row.label}</span>
                      <span className="text-white font-medium">{row.value}</span>
                    </div>
                  ))}
                </div>

                <div className="border-t border-white/10 pt-4">
                  <div className="flex items-baseline justify-between">
                    <span className="text-gray-400 text-sm">Due Today</span>
                    <span className="text-white text-3xl font-bold">2.000.000 <span className="text-lg">VND</span></span>
                  </div>
                </div>
              </div>

              <button
                onClick={handlePay}
                disabled={isPaying}
                className="w-full py-4 bg-[#00D26A] text-black font-bold rounded-xl hover:bg-[#00b85d] transition-colors disabled:opacity-60 flex items-center justify-center gap-2 text-base"
              >
                {isPaying ? (
                  <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                ) : null}
                {!isPaying && "✓ "} Pay Now & Activate →
              </button>

              <p className="text-xs text-gray-500 text-center mt-3">
                Encrypted via TLS 1.3 · Powered by NAPAS
              </p>
              <p className="text-xs text-gray-600 text-center mt-1">
                By continuing, you agree to MarketScout&apos;s B2B Terms of Service.
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-12 border-t border-white/10 pt-6 flex items-center justify-between">
          <p className="text-gray-500 text-xs">&copy; 2025 MarketScout Inc. All rights reserved.</p>
          <div className="flex gap-4">
            {["Terms", "Privacy", "Enterprise SLA"].map((link) => (
              <a key={link} href="#" className="text-gray-500 hover:text-gray-300 text-xs transition-colors">
                {link}
              </a>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#0A0E1A] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#00D26A]/30 border-t-[#00D26A] rounded-full animate-spin" />
      </div>
    }>
      <CheckoutContent />
    </Suspense>
  );
}

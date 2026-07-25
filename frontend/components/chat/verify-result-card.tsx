"use client";

import Link from "next/link";
import {
  Building2, ShieldCheck, ShieldAlert, FileText, ChevronRight,
  CheckCircle2, XCircle, MapPin, Hash, AlertTriangle, Ban,
} from "lucide-react";

/**
 * The chat pipeline returns verification results as a single pipe-delimited
 * line (e.g. `Apple Inc | Điểm tổng: 52/100 | Mức rủi ro: Trung bình | LEI: ... | Xem chi tiết: /reports/<id>`).
 *
 * reportMeta is NOT persisted server-side, so on history reload only this text
 * survives. We therefore parse the text itself — that way the rich card renders
 * identically whether the message just streamed in or was loaded from history.
 */

export type ParsedResult =
  | {
      kind: "verify";
      companyName: string;
      score: number;
      riskLevel?: string;
      regType?: string;
      regId?: string;
      sanctionWarning?: string;
      reportId?: string;
    }
  | {
      kind: "lookup";
      companyName: string;
      regType?: string;
      regId?: string;
      status?: string;
      address?: string;
      sanctionWarning?: string;
      reportId?: string;
    }
  | {
      kind: "hardstop";
      companyName: string;
      reason?: string;
      regId?: string;
      reportId?: string;
    };

const field = (text: string, label: string): string | undefined => {
  const m = text.match(new RegExp(`${label}:\\s*([^|]+?)\\s*(?:\\||$)`));
  return m ? m[1].trim() : undefined;
};

const reportIdOf = (text: string): string | undefined => {
  const m = text.match(/\/reports\/([0-9a-fA-F-]{36})/);
  return m ? m[1] : undefined;
};

/** Returns a structured result if the text is a known result format, else null. */
export function parseResult(content: string): ParsedResult | null {
  const text = content.trim();

  // ── Hard stop ────────────────────────────────────────────────────────────
  if (text.startsWith("⚠️ HARD STOP") || text.startsWith("HARD STOP")) {
    const nameMatch = text.match(/HARD STOP\s*[—-]\s*(.+?)\s+nằm trong/);
    const reasonMatch = text.match(/nằm trong danh sách trừng phạt:\s*([^|]+?)\s*(?:\||$)/);
    return {
      kind: "hardstop",
      companyName: nameMatch ? nameMatch[1].trim() : "Đối tác",
      reason: reasonMatch ? reasonMatch[1].trim() : undefined,
      reportId: reportIdOf(text),
    };
  }

  const companyName = text.split("|")[0].trim();
  const sanctionWarning = field(text, "⚠️ CẢNH BÁO")
    ?? (text.includes("CẢNH BÁO: nằm trong danh sách trừng phạt") ? "Nằm trong danh sách trừng phạt" : undefined);

  // Registration id can be labelled LEI or MST.
  let regType: string | undefined;
  let regId: string | undefined;
  const lei = field(text, "LEI");
  const mst = field(text, "MST");
  if (lei) { regType = "LEI"; regId = lei; }
  else if (mst) { regType = "MST"; regId = mst; }

  // ── Verify (8-pillar) — has an overall score ─────────────────────────────
  const scoreMatch = text.match(/Điểm tổng:\s*(\d+)/);
  if (scoreMatch) {
    return {
      kind: "verify",
      companyName,
      score: parseInt(scoreMatch[1], 10),
      riskLevel: field(text, "Mức rủi ro"),
      regType,
      regId,
      sanctionWarning,
      reportId: reportIdOf(text),
    };
  }

  // ── Lookup — has a report link + registry/status info but no score ────────
  const hasReport = text.includes("/reports/");
  const status = field(text, "Trạng thái");
  const address = field(text, "Địa chỉ");
  if (hasReport && (status || address || regId)) {
    return {
      kind: "lookup",
      companyName,
      regType,
      regId,
      status,
      address,
      sanctionWarning,
      reportId: reportIdOf(text),
    };
  }

  return null;
}

// ── Visual helpers ──────────────────────────────────────────────────────────

function scoreStyle(score: number) {
  if (score >= 75) return { color: "#059669", track: "#D7F5E5", label: "Rủi ro thấp", chip: "bg-emerald-50 text-emerald-700 border-emerald-200" };
  if (score >= 50) return { color: "#65A30D", track: "#ECFCCB", label: "Rủi ro trung bình", chip: "bg-lime-50 text-lime-700 border-lime-200" };
  if (score >= 30) return { color: "#D97706", track: "#FEF3C7", label: "Rủi ro cao", chip: "bg-amber-50 text-amber-700 border-amber-200" };
  return { color: "#DC2626", track: "#FEE2E2", label: "Rủi ro nghiêm trọng", chip: "bg-red-50 text-red-700 border-red-200" };
}

function ScoreRing({ score }: { score: number }) {
  const { color, track } = scoreStyle(score);
  const r = 30;
  const c = 2 * Math.PI * r;
  const offset = c - (score / 100) * c;
  return (
    <div className="relative w-[76px] h-[76px] shrink-0">
      <svg width="76" height="76" viewBox="0 0 76 76">
        <circle cx="38" cy="38" r={r} fill="none" stroke={track} strokeWidth="6" />
        <circle
          cx="38" cy="38" r={r} fill="none" stroke={color} strokeWidth="6"
          strokeDasharray={c} strokeDashoffset={offset} strokeLinecap="round"
          transform="rotate(-90 38 38)"
          style={{ transition: "stroke-dashoffset 0.9s cubic-bezier(0.4,0,0.2,1)" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-xl font-extrabold leading-none" style={{ color }}>{score}</span>
        <span className="text-[9px] font-semibold text-gray-400 mt-0.5">/100</span>
      </div>
    </div>
  );
}

function CardShell({ children, accent }: { children: React.ReactNode; accent: string }) {
  return (
    <div
      className="w-full max-w-sm bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden"
      style={{ borderTop: `3px solid ${accent}` }}
    >
      {children}
    </div>
  );
}

function ReportButton({ reportId, danger }: { reportId?: string; danger?: boolean }) {
  if (!reportId) return null;
  return (
    <Link
      href={`/reports/${reportId}`}
      className={`flex items-center justify-center gap-1.5 w-full py-2.5 text-xs font-bold rounded-xl transition-colors ${
        danger
          ? "bg-red-600 text-white hover:bg-red-700"
          : "gradient-brand text-white hover:opacity-90"
      }`}
    >
      <FileText className="w-3.5 h-3.5" />
      Xem báo cáo chi tiết
      <ChevronRight className="w-3.5 h-3.5" />
    </Link>
  );
}

function InfoRow({ icon: Icon, label, value, valueClass }: {
  icon: React.ElementType; label: string; value: React.ReactNode; valueClass?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3 py-2">
      <span className="flex items-center gap-1.5 text-[11px] font-semibold text-gray-400 uppercase tracking-wide shrink-0">
        <Icon className="w-3.5 h-3.5" />
        {label}
      </span>
      <span className={`text-xs font-semibold text-right break-all ${valueClass ?? "text-gray-700"}`}>{value}</span>
    </div>
  );
}

export function VerifyResultCard({ result }: { result: ParsedResult }) {
  // ── Hard stop ──────────────────────────────────────────────────────────────
  if (result.kind === "hardstop") {
    return (
      <CardShell accent="#DC2626">
        <div className="p-4">
          <div className="flex items-start gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center shrink-0">
              <Ban className="w-5 h-5 text-red-600" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-bold text-red-600 uppercase tracking-widest">Hard Stop</p>
              <h4 className="text-sm font-bold text-gray-900 truncate">{result.companyName}</h4>
            </div>
          </div>
          <div className="bg-red-50 border border-red-100 rounded-xl p-3 mb-3">
            <p className="text-xs text-red-700 leading-relaxed">
              <span className="font-bold">Cảnh báo nghiêm trọng:</span> đối tác nằm trong danh sách trừng phạt
              {result.reason ? ` — ${result.reason}` : ""}. Khuyến nghị tạm dừng giao dịch để rà soát pháp lý.
            </p>
          </div>
          <ReportButton reportId={result.reportId} danger />
        </div>
      </CardShell>
    );
  }

  // ── Verify (8-pillar) ───────────────────────────────────────────────────────
  if (result.kind === "verify") {
    const s = scoreStyle(result.score);
    return (
      <CardShell accent={s.color}>
        <div className="p-4">
          <div className="flex items-start justify-between gap-3 mb-4">
            <div className="flex items-start gap-2.5 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-[#E7F6EF] flex items-center justify-center shrink-0">
                <Building2 className="w-4.5 h-4.5 text-[#047857]" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Thẩm định 8 trụ cột</p>
                <h4 className="text-sm font-bold text-gray-900 leading-tight">{result.companyName}</h4>
              </div>
            </div>
            <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border whitespace-nowrap shrink-0 ${s.chip}`}>
              {result.riskLevel || s.label}
            </span>
          </div>

          <div className="flex items-center gap-4 mb-4">
            <ScoreRing score={result.score} />
            <div className="min-w-0">
              <p className="text-xs font-bold text-gray-900 mb-0.5">Điểm tin cậy tổng</p>
              <p className="text-[11px] text-gray-400 leading-snug">
                Trung bình có trọng số của 8 trụ cột thẩm định.
              </p>
            </div>
          </div>

          {result.sanctionWarning && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-100 rounded-lg px-3 py-2 mb-3">
              <AlertTriangle className="w-3.5 h-3.5 text-red-500 shrink-0" />
              <span className="text-[11px] font-semibold text-red-700">{result.sanctionWarning}</span>
            </div>
          )}

          {result.regId && (
            <div className="border-t border-gray-50 mb-3">
              <InfoRow
                icon={Hash}
                label={result.regType || "Mã"}
                value={<span className="font-mono">{result.regId}</span>}
              />
            </div>
          )}

          <ReportButton reportId={result.reportId} />
        </div>
      </CardShell>
    );
  }

  // ── Lookup (quick scan) ─────────────────────────────────────────────────────
  const active = result.status?.toLowerCase().includes("đang hoạt động");
  const inactive = result.status?.toLowerCase().includes("ngừng");
  return (
    <CardShell accent="#0EA5E9">
      <div className="p-4">
        <div className="flex items-start gap-2.5 mb-3">
          <div className="w-9 h-9 rounded-xl bg-sky-50 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-4.5 h-4.5 text-sky-600" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Tra cứu nhanh</p>
            <h4 className="text-sm font-bold text-gray-900 leading-tight">{result.companyName}</h4>
          </div>
        </div>

        {result.sanctionWarning && (
          <div className="flex items-center gap-2 bg-red-50 border border-red-100 rounded-lg px-3 py-2 mb-3">
            <ShieldAlert className="w-3.5 h-3.5 text-red-500 shrink-0" />
            <span className="text-[11px] font-semibold text-red-700">{result.sanctionWarning}</span>
          </div>
        )}

        <div className="border-t border-gray-50 divide-y divide-gray-50 mb-3">
          {result.regId && (
            <InfoRow
              icon={Hash}
              label={result.regType || "Mã"}
              value={<span className="font-mono">{result.regId}</span>}
            />
          )}
          {result.status && (
            <InfoRow
              icon={active ? CheckCircle2 : inactive ? XCircle : ShieldCheck}
              label="Trạng thái"
              value={result.status}
              valueClass={active ? "text-emerald-600" : inactive ? "text-red-500" : "text-gray-700"}
            />
          )}
          {result.address && (
            <InfoRow icon={MapPin} label="Địa chỉ" value={result.address} />
          )}
        </div>

        <ReportButton reportId={result.reportId} />
      </div>
    </CardShell>
  );
}

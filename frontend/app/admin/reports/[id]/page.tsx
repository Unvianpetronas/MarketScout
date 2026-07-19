"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";
import {
  ArrowLeft, ShieldCheck, RotateCcw, Trash2, RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import { AuthGuard } from "@/components/shared/auth-guard";
import { AdminShell } from "@/components/admin/admin-shell";
import {
  getReportDetail, overrideReport, deleteReport, retryReport,
  getReportFlags, resolveReportFlag,
  ReportDetail as AdminReportDetail, ReportFlagDTO,
} from "@/services/admin.service";

interface Props { params: Promise<{ id: string }>; }

const RISK_LEVELS = ["Thấp", "Trung bình", "Cao", "Nghiêm trọng"];
const REASON_LABEL: Record<string, string> = {
  WRONG_SCORE: "Điểm/rủi ro sai",
  WRONG_INFO: "Thông tin công ty sai",
  SANCTIONS_FALSE_POSITIVE: "Báo nhầm trừng phạt",
  OTHER: "Khác",
};

export default function AdminReportDetailPage({ params }: Props) {
  const { id } = use(params);
  const [detail, setDetail] = useState<AdminReportDetail | null>(null);
  const [flags, setFlags] = useState<ReportFlagDTO[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [scoreInput, setScoreInput] = useState("");
  const [riskInput, setRiskInput] = useState("");
  const [hardStopInput, setHardStopInput] = useState<"unset" | "true" | "false">("unset");
  const [note, setNote] = useState("");

  const load = async () => {
    try {
      const [d, f] = await Promise.all([
        getReportDetail(id),
        getReportFlags(0, 50, undefined, id),
      ]);
      setDetail(d);
      setFlags(f.flags);
      setScoreInput(d.report.overrideScore != null ? String(d.report.overrideScore) : "");
      setRiskInput(d.report.overrideRiskLevel ?? "");
      setHardStopInput(d.report.overrideHardStop == null ? "unset" : d.report.overrideHardStop ? "true" : "false");
    } catch {
      toast.error("Không tải được báo cáo.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { load(); }, [id]);

  const handleSaveOverride = async () => {
    if (!note.trim()) { toast.error("Cần ghi lý do điều chỉnh."); return; }
    setSaving(true);
    try {
      await overrideReport(id, {
        overrideScore: scoreInput ? Number(scoreInput) : null,
        overrideRiskLevel: riskInput || null,
        overrideHardStop: hardStopInput === "unset" ? null : hardStopInput === "true",
        note: note.trim(),
        clear: false,
      });
      toast.success("Đã lưu điều chỉnh.");
      setNote("");
      load();
    } catch {
      toast.error("Không thể lưu điều chỉnh.");
    } finally {
      setSaving(false);
    }
  };

  const handleClearOverride = async () => {
    const reason = window.prompt("Lý do gỡ điều chỉnh (bắt buộc):");
    if (!reason || !reason.trim()) return;
    setSaving(true);
    try {
      await overrideReport(id, { note: reason.trim(), clear: true });
      toast.success("Đã gỡ điều chỉnh — quay về điểm gốc AI.");
      setScoreInput(""); setRiskInput(""); setHardStopInput("unset");
      load();
    } catch {
      toast.error("Không thể gỡ điều chỉnh.");
    } finally {
      setSaving(false);
    }
  };

  const handleResolveFlag = async (flagId: string, status: "resolved" | "dismissed") => {
    try {
      await resolveReportFlag(flagId, status);
      toast.success("Đã cập nhật.");
      load();
    } catch {
      toast.error("Không thể cập nhật flag.");
    }
  };

  const handleRetry = async () => {
    try { await retryReport(id); toast.success("Đã đưa vào hàng chờ chạy lại."); load(); }
    catch { toast.error("Không thể chạy lại."); }
  };

  const handleDelete = async () => {
    if (!window.confirm("Xoá vĩnh viễn báo cáo này?")) return;
    try { await deleteReport(id); toast.success("Đã xoá."); window.location.href = "/admin/reports"; }
    catch { toast.error("Không thể xoá."); }
  };

  return (
    <AuthGuard requiredRole="ADMIN">
      <AdminShell active="reports">
        <div className="flex items-center gap-3 mb-6">
          <Link href="/admin/reports" className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-700">
            <ArrowLeft className="w-4 h-4" /> Reports &amp; Flags
          </Link>
        </div>

        {isLoading || !detail ? (
          <div className="p-16 flex flex-col items-center">
            <div className="w-8 h-8 border-2 border-[#00D26A]/20 border-t-[#00D26A] rounded-full animate-spin" />
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              {/* Header */}
              <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h1 className="text-xl font-extrabold text-gray-900">{detail.report.entityName}</h1>
                    <p className="text-xs text-gray-400 mt-1">
                      {detail.report.userEmail} · {detail.report.countryIso2 || "—"} · {new Date(detail.report.createdAt).toLocaleString("vi-VN")}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={handleRetry} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 border border-blue-200">
                      <RefreshCw className="w-3.5 h-3.5" /> Chạy lại
                    </button>
                    <button onClick={handleDelete} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-red-50 text-red-700 rounded-lg hover:bg-red-100 border border-red-200">
                      <Trash2 className="w-3.5 h-3.5" /> Xoá
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-gray-50 rounded-xl p-3">
                    <p className="text-[10px] text-gray-400 uppercase font-bold mb-1">Điểm AI gốc</p>
                    <p className="text-lg font-extrabold text-gray-900">{detail.report.overallScore ?? "—"}</p>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-3">
                    <p className="text-[10px] text-gray-400 uppercase font-bold mb-1">Đánh giá gốc</p>
                    <p className="text-lg font-extrabold text-gray-900">{detail.report.riskLevel ?? "—"}</p>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-3">
                    <p className="text-[10px] text-gray-400 uppercase font-bold mb-1">Hard Stop gốc</p>
                    <p className="text-lg font-extrabold text-gray-900">{detail.report.hardStop ? "Có" : "Không"}</p>
                  </div>
                </div>

                {detail.report.overriddenAt && (
                  <div className="mt-4 flex items-start gap-2 p-3 bg-purple-50 border border-purple-200 rounded-xl">
                    <ShieldCheck className="w-4 h-4 text-purple-600 shrink-0 mt-0.5" />
                    <div className="text-xs">
                      <p className="text-purple-800 font-semibold">
                        Đã điều chỉnh bởi {detail.report.overriddenByEmail} lúc {new Date(detail.report.overriddenAt).toLocaleString("vi-VN")}
                      </p>
                      {detail.report.overrideNote && <p className="text-purple-700/80 mt-0.5">{detail.report.overrideNote}</p>}
                    </div>
                  </div>
                )}
              </div>

              {/* Pillars */}
              <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
                <h2 className="text-sm font-bold text-gray-900 mb-4">8 Trụ cột</h2>
                <div className="grid grid-cols-2 gap-3">
                  {detail.pillars.map((p) => (
                    <div key={p.id} className="flex items-center justify-between px-3 py-2 bg-gray-50 rounded-lg text-sm">
                      <span className="text-gray-600">P{p.pillarNo} {p.pillarName}</span>
                      <span className="font-bold text-gray-900">{p.score ?? "N/A"}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Flags for this report */}
              <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
                <h2 className="text-sm font-bold text-gray-900 mb-4">Báo cáo sai liên quan ({flags.length})</h2>
                {flags.length === 0 ? (
                  <p className="text-sm text-gray-400">Chưa có ai báo sai report này.</p>
                ) : (
                  <div className="space-y-3">
                    {flags.map((f) => (
                      <div key={f.id} className="flex items-start justify-between gap-3 p-3 bg-gray-50 rounded-xl">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-bold text-red-700 bg-red-50 border border-red-200 px-1.5 py-0.5 rounded uppercase">
                              {REASON_LABEL[f.reason] || f.reason}
                            </span>
                            <span className="text-[10px] text-gray-400">{f.status}</span>
                          </div>
                          {f.note && <p className="text-xs text-gray-600">{f.note}</p>}
                          <p className="text-[11px] text-gray-400 mt-1">{f.userEmail} · {new Date(f.createdAt).toLocaleString("vi-VN")}</p>
                        </div>
                        {f.status === "open" && (
                          <div className="flex gap-2 shrink-0">
                            <button onClick={() => handleResolveFlag(f.id, "resolved")} className="px-2.5 py-1 text-xs font-bold bg-emerald-50 text-emerald-700 rounded-lg border border-emerald-200">Đã xử lý</button>
                            <button onClick={() => handleResolveFlag(f.id, "dismissed")} className="px-2.5 py-1 text-xs font-bold bg-gray-100 text-gray-600 rounded-lg border border-gray-200">Bỏ qua</button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Override form */}
            <div>
              <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm sticky top-6">
                <h2 className="text-sm font-bold text-gray-900 mb-1">Điều chỉnh kết quả</h2>
                <p className="text-xs text-gray-400 mb-4">Không đổi dữ liệu AI gốc — chỉ ghi đè phần hiển thị cho người dùng.</p>

                <label className="text-xs text-gray-500 font-semibold block mb-1.5">Điểm ghi đè (0–100)</label>
                <input type="number" min={0} max={100} value={scoreInput}
                  onChange={(e) => setScoreInput(e.target.value)}
                  placeholder={String(detail.report.overallScore ?? "")}
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 mb-3" />

                <label className="text-xs text-gray-500 font-semibold block mb-1.5">Đánh giá rủi ro ghi đè</label>
                <select value={riskInput} onChange={(e) => setRiskInput(e.target.value)}
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 mb-3">
                  <option value="">— Giữ nguyên gốc —</option>
                  {RISK_LEVELS.map((r) => <option key={r} value={r}>{r}</option>)}
                </select>

                <label className="text-xs text-gray-500 font-semibold block mb-1.5">Hard Stop ghi đè</label>
                <select value={hardStopInput} onChange={(e) => setHardStopInput(e.target.value as typeof hardStopInput)}
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 mb-3">
                  <option value="unset">— Giữ nguyên gốc —</option>
                  <option value="true">Có Hard Stop</option>
                  <option value="false">Không Hard Stop</option>
                </select>

                <label className="text-xs text-gray-500 font-semibold block mb-1.5">Lý do điều chỉnh (bắt buộc)</label>
                <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3}
                  placeholder="Vd: Xác minh lại thủ công, sanctions false positive đã loại trừ..."
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 mb-4 resize-none" />

                <button onClick={handleSaveOverride} disabled={saving}
                  className="w-full py-2.5 gradient-brand text-white font-bold rounded-xl hover:opacity-90 text-sm disabled:opacity-60 mb-2">
                  {saving ? "Đang lưu..." : "Lưu điều chỉnh"}
                </button>
                {detail.report.overriddenAt && (
                  <button onClick={handleClearOverride} disabled={saving}
                    className="w-full flex items-center justify-center gap-1.5 py-2.5 border border-gray-200 text-gray-600 font-semibold rounded-xl hover:bg-gray-50 text-sm disabled:opacity-60">
                    <RotateCcw className="w-3.5 h-3.5" /> Gỡ điều chỉnh
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </AdminShell>
    </AuthGuard>
  );
}

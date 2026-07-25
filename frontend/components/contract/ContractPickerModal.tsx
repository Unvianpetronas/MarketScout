"use client";

import { useEffect, useRef, useState } from "react";
import {
  X, Search, UploadCloud, FileText, Loader2, CheckCircle2, AlertTriangle, Pencil,
} from "lucide-react";
import { toast } from "sonner";
import {
  uploadContract, listContracts, getContract, linkContract, updateFieldOverride, renameContract,
} from "@/services/contract.service";
import { ContractDetail, ContractSummary, ExtractedField, LinkResponse } from "@/types/contract";

interface Props {
  // Omit reportId when picking a contract BEFORE a report exists (pre-scan form
  // on /verify) — in that mode we only select a contract (no link/cross-check
  // yet, since there's nothing to check against) and hand its id back via
  // onSelected; the caller sends it along with the verify request and the
  // backend links+cross-checks it right after the report is created.
  reportId?: string;
  onClose: () => void;
  onLinked?: (result: LinkResponse, contract: ContractSummary) => void;
  onSelected?: (contractId: string, fileName: string) => void;
}

const FIELD_LABELS: Record<string, string> = {
  incoterms: "Incoterms",
  depositPercent: "Đặt cọc trước",
  paymentMethod: "Phương thức TT",
  hasArbitrationClause: "Điều khoản trọng tài",
  partyAName: "Bên A",
  partyATaxId: "MST Bên A",
  partyBName: "Bên B",
  partyBTaxId: "MST Bên B",
};

function fieldValueToInput(v: ExtractedField["value"]): string {
  if (v === null || v === undefined) return "";
  if (typeof v === "boolean") return v ? "Có" : "Không";
  return String(v);
}

export function ContractPickerModal({ reportId, onClose, onLinked, onSelected }: Props) {
  const [tab, setTab] = useState<"existing" | "upload">("existing");

  // ── Tab: existing ──
  const [search, setSearch] = useState("");
  const [contracts, setContracts] = useState<ContractSummary[] | null>(null);
  const [linkingId, setLinkingId] = useState<string | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");

  useEffect(() => {
    if (tab !== "existing") return;
    const handle = setTimeout(() => {
      listContracts(search || undefined).then(setContracts).catch(() => setContracts([]));
    }, 250);
    return () => clearTimeout(handle);
  }, [tab, search]);

  const startRename = (c: ContractSummary) => {
    setRenamingId(c.id);
    setRenameValue(c.fileName);
  };

  const saveRename = async (contractId: string) => {
    const trimmed = renameValue.trim();
    setRenamingId(null);
    if (!trimmed) return;
    try {
      const updated = await renameContract(contractId, trimmed);
      setContracts((prev) => prev?.map((c) => (c.id === contractId ? updated : c)) ?? prev);
    } catch {
      toast.error("Không thể đổi tên hợp đồng này. Vui lòng thử lại.");
    }
  };

  const chooseExisting = async (contractId: string) => {
    const contract = contracts?.find((c) => c.id === contractId);
    if (!contract) return;
    if (!reportId) {
      onSelected?.(contractId, contract.fileName);
      return;
    }
    setLinkingId(contractId);
    try {
      const result = await linkContract(reportId, contractId);
      onLinked?.(result, contract);
    } catch {
      toast.error("Không thể liên kết hợp đồng này. Vui lòng thử lại.");
    } finally {
      setLinkingId(null);
    }
  };

  // ── Tab: upload ──
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploaded, setUploaded] = useState<ContractDetail | null>(null);
  const [edited, setEdited] = useState<Record<string, string>>({});
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    if (!uploaded || uploaded.extractionStatus === "COMPLETED" || uploaded.extractionStatus === "FAILED") return;
    const interval = setInterval(async () => {
      try {
        const fresh = await getContract(uploaded.id);
        setUploaded(fresh);
      } catch { /* keep polling */ }
    }, 1500);
    return () => clearInterval(interval);
  }, [uploaded]);

  const handleFile = async (file: File) => {
    if (file.size > 10 * 1024 * 1024 || !["application/pdf", "image/jpeg", "image/png"].includes(file.type)) {
      toast.error("File vượt quá 10MB hoặc không đúng định dạng hỗ trợ (PDF, JPG, PNG).");
      return;
    }
    setUploading(true);
    try {
      const summary = await uploadContract(file);
      const detail = await getContract(summary.id);
      setUploaded(detail);
    } catch {
      toast.error("Không thể tải lên file này. Vui lòng thử lại.");
    } finally {
      setUploading(false);
    }
  };

  const confirmUse = async () => {
    if (!uploaded) return;
    if (!reportId) {
      onSelected?.(uploaded.id, uploaded.fileName);
      return;
    }
    setConfirming(true);
    try {
      let result = await linkContract(reportId, uploaded.id);
      for (const [field, value] of Object.entries(edited)) {
        result = await updateFieldOverride(reportId, uploaded.id, field, value);
      }
      onLinked?.(result, uploaded);
    } catch {
      toast.error("Không thể xác nhận hợp đồng này. Vui lòng thử lại.");
    } finally {
      setConfirming(false);
    }
  };

  const extractionDone = uploaded?.extractionStatus === "COMPLETED";
  const extractionFailed = uploaded?.extractionStatus === "FAILED";

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[85vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="shrink-0 flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-purple-50 rounded-xl flex items-center justify-center">
              <FileText className="w-4 h-4 text-purple-500" />
            </div>
            <h2 className="text-sm font-bold text-gray-900">Chọn hợp đồng</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="shrink-0 flex gap-1 px-6 pt-4">
          {(["existing", "upload"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${
                tab === t ? "bg-[#E7F6EF] text-[#047857]" : "text-gray-400 hover:text-gray-600"
              }`}
            >
              {t === "existing" ? "Hợp đồng có sẵn" : "Tải lên mới"}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-6 pt-4">
          {tab === "existing" ? (
            <div>
              <div className="relative mb-4">
                <Search className="w-4 h-4 text-gray-300 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Tìm kiếm theo tên file hoặc đối tác..."
                  className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#059669]/30"
                />
              </div>

              {contracts === null ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-5 h-5 text-gray-300 animate-spin" />
                </div>
              ) : contracts.length === 0 ? (
                <div className="text-center py-8 text-sm text-gray-400">
                  Chưa có hợp đồng nào trong thư viện. Tải lên hợp đồng đầu tiên của bạn.
                </div>
              ) : (
                <div className="space-y-2">
                  {contracts.map((c) => (
                    <div key={c.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <FileText className="w-5 h-5 text-gray-300 shrink-0" />
                        <div className="min-w-0 flex-1">
                          {renamingId === c.id ? (
                            <input
                              autoFocus
                              value={renameValue}
                              onChange={(e) => setRenameValue(e.target.value)}
                              onBlur={() => saveRename(c.id)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") saveRename(c.id);
                                if (e.key === "Escape") setRenamingId(null);
                              }}
                              className="w-full text-sm font-semibold text-gray-800 border border-[#059669]/40 rounded-lg px-2 py-0.5 focus:outline-none focus:ring-2 focus:ring-[#059669]/30"
                            />
                          ) : (
                            <div className="flex items-center gap-1.5 group">
                              <p className="text-sm font-semibold text-gray-800 truncate">{c.fileName}</p>
                              <button
                                onClick={() => startRename(c)}
                                className="text-gray-300 hover:text-gray-600 shrink-0"
                                title="Đổi tên"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}
                          <p className="text-xs text-gray-400">
                            Tải lên {new Date(c.uploadedAt).toLocaleDateString("vi-VN")}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => chooseExisting(c.id)}
                        disabled={linkingId === c.id}
                        className="shrink-0 px-3 py-1.5 text-xs font-bold text-white rounded-lg bg-gradient-to-r from-[#059669] to-[#047857] disabled:opacity-60"
                      >
                        {linkingId === c.id ? "Đang dùng..." : "Dùng →"}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div>
              {!uploaded ? (
                <div
                  onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setDragOver(false);
                    const file = e.dataTransfer.files?.[0];
                    if (file) handleFile(file);
                  }}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-2xl py-12 flex flex-col items-center justify-center gap-2 cursor-pointer transition-colors ${
                    dragOver ? "border-[#059669] bg-[#F0FAF4]" : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  {uploading ? (
                    <>
                      <Loader2 className="w-8 h-8 text-[#059669] animate-spin" />
                      <p className="text-sm text-gray-500">Đang tải lên...</p>
                    </>
                  ) : (
                    <>
                      <UploadCloud className="w-8 h-8 text-gray-300" />
                      <p className="text-sm font-semibold text-gray-600">Kéo thả file vào đây</p>
                      <p className="text-xs text-gray-400">hoặc bấm để chọn file</p>
                      <p className="text-xs text-gray-300">PDF, JPG, PNG · tối đa 10MB</p>
                    </>
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleFile(file);
                    }}
                  />
                </div>
              ) : !extractionDone && !extractionFailed ? (
                <div className="flex flex-col items-center justify-center gap-3 py-12">
                  <Loader2 className="w-8 h-8 text-[#059669] animate-spin" />
                  <p className="text-sm text-gray-500">AI đang đọc hợp đồng...</p>
                </div>
              ) : extractionFailed ? (
                <div className="flex flex-col items-center gap-3 py-8 text-center">
                  <AlertTriangle className="w-8 h-8 text-red-400" />
                  <p className="text-sm text-red-600">
                    Không thể đọc nội dung file này. Kiểm tra lại file có phải PDF/ảnh rõ nét, hoặc thử tải lên hợp đồng khác.
                  </p>
                  <button onClick={() => setUploaded(null)} className="text-xs font-semibold text-gray-500 hover:text-gray-700">
                    Thử lại
                  </button>
                </div>
              ) : (
                <div>
                  <div className="flex items-center gap-2 text-sm font-semibold text-emerald-700 mb-4">
                    <CheckCircle2 className="w-4 h-4" />
                    Đã đọc xong hợp đồng — kiểm tra lại thông tin
                  </div>
                  <div className="space-y-3">
                    {Object.entries(uploaded.extractedData).map(([field, data]) => (
                      <div key={field} className="flex items-center justify-between gap-3">
                        <label className="text-xs text-gray-500 w-32 shrink-0">{FIELD_LABELS[field] || field}</label>
                        <input
                          value={edited[field] ?? fieldValueToInput(data.value)}
                          onChange={(e) => setEdited((prev) => ({ ...prev, [field]: e.target.value }))}
                          disabled={!reportId}
                          className="flex-1 text-sm border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#059669]/30 disabled:bg-gray-50 disabled:text-gray-400"
                        />
                        {data.confidence != null && (
                          <span className="text-[11px] text-gray-400 shrink-0 w-10 text-right">
                            {Math.round(data.confidence * 100)}%
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                  <div className="flex items-start gap-2 mt-4 p-3 bg-amber-50 border border-amber-200 rounded-xl">
                    <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                    <p className="text-xs text-amber-700">
                      {reportId
                        ? "Sửa trường nào sẽ khiến trường đó không còn được tính là “đã xác minh”."
                        : "Có thể chỉnh sửa các trường này trên trang báo cáo sau khi thẩm định xong."}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Always-visible footer — never require scrolling the content area to reach it */}
        {tab === "upload" && uploaded && extractionDone && (
          <div className="shrink-0 flex justify-end gap-2 px-6 py-4 border-t border-gray-100">
            <button onClick={onClose} className="px-4 py-2 text-sm font-semibold text-gray-500 hover:text-gray-700">
              Huỷ
            </button>
            <button
              onClick={confirmUse}
              disabled={confirming}
              className="px-4 py-2 text-sm font-bold text-white rounded-xl bg-gradient-to-r from-[#059669] to-[#047857] disabled:opacity-60"
            >
              {confirming ? "Đang xác nhận..." : "Xác nhận & Dùng →"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

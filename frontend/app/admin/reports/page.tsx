"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Search, FileWarning, FileText, AlertTriangle,
  CheckCircle2, XCircle, ChevronRight,
} from "lucide-react";
import { toast } from "sonner";
import { AuthGuard } from "@/components/shared/auth-guard";
import { AdminShell } from "@/components/admin/admin-shell";
import { AdminPageHeader, RefreshButton } from "@/components/admin/admin-page-header";
import {
  getAdminReports, getReportFlags, resolveReportFlag,
  ReportSummary, ReportFlagDTO,
} from "@/services/admin.service";

const REASON_LABEL: Record<string, string> = {
  WRONG_SCORE: "Điểm/rủi ro sai",
  WRONG_INFO: "Thông tin công ty sai",
  SANCTIONS_FALSE_POSITIVE: "Báo nhầm trừng phạt",
  OTHER: "Khác",
};

function FlagsQueue() {
  const [flags, setFlags] = useState<ReportFlagDTO[]>([]);
  const [total, setTotal] = useState(0);
  const [statusFilter, setStatusFilter] = useState<"open" | "resolved" | "dismissed">("open");
  const [isLoading, setIsLoading] = useState(true);
  const [actingId, setActingId] = useState<string | null>(null);

  const fetchFlags = async () => {
    setIsLoading(true);
    try {
      const res = await getReportFlags(0, 50, statusFilter);
      setFlags(res.flags);
      setTotal(res.total);
    } catch {
      toast.error("Không tải được danh sách báo sai.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { Promise.resolve().then(fetchFlags); }, [statusFilter]);

  const handleResolve = async (id: string, status: "resolved" | "dismissed") => {
    setActingId(id);
    try {
      await resolveReportFlag(id, status);
      toast.success(status === "resolved" ? "Đã đánh dấu đã xử lý." : "Đã bỏ qua.");
      fetchFlags();
    } catch {
      toast.error("Không thể cập nhật flag.");
    } finally {
      setActingId(null);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileWarning className="w-4 h-4 text-red-500" />
          <h2 className="text-sm font-bold text-gray-900">Hàng chờ &ldquo;Báo kết quả sai&rdquo;</h2>
          <span className="text-xs font-bold text-gray-400 bg-gray-50 px-2 py-0.5 rounded-full">{total}</span>
        </div>
        <div className="flex items-center gap-2">
          {(["open", "resolved", "dismissed"] as const).map((s) => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                statusFilter === s ? "bg-gray-900 text-white border-gray-900" : "bg-white text-gray-500 border-gray-200 hover:border-gray-300"
              }`}>
              {s === "open" ? "Chưa xử lý" : s === "resolved" ? "Đã xử lý" : "Đã bỏ qua"}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="p-10 flex flex-col items-center">
          <div className="w-8 h-8 border-2 border-[#059669]/20 border-t-[#059669] rounded-full animate-spin" />
        </div>
      ) : flags.length === 0 ? (
        <div className="p-10 text-center text-sm text-gray-400">Không có mục nào.</div>
      ) : (
        <div className="divide-y divide-gray-50">
          {flags.map((f) => (
            <div key={f.id} className="px-5 py-4 flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <Link href={`/admin/reports/${f.reportId}`} className="text-sm font-semibold text-gray-900 hover:text-[#047857] truncate">
                    {f.reportEntityName}
                  </Link>
                  <span className="text-[10px] font-bold text-red-700 bg-red-50 border border-red-200 px-1.5 py-0.5 rounded uppercase shrink-0">
                    {REASON_LABEL[f.reason] || f.reason}
                  </span>
                </div>
                {f.note && <p className="text-xs text-gray-500 mb-1">{f.note}</p>}
                <p className="text-[11px] text-gray-400">
                  Báo bởi {f.userEmail} · {new Date(f.createdAt).toLocaleString("vi-VN")}
                  {f.resolvedByEmail && ` · xử lý bởi ${f.resolvedByEmail}`}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {statusFilter === "open" && (
                  <>
                    <button onClick={() => handleResolve(f.id, "resolved")} disabled={actingId === f.id}
                      className="px-3 py-1.5 text-xs font-bold bg-emerald-50 text-emerald-700 rounded-lg hover:bg-emerald-100 border border-emerald-200 disabled:opacity-50">
                      Đã xử lý
                    </button>
                    <button onClick={() => handleResolve(f.id, "dismissed")} disabled={actingId === f.id}
                      className="px-3 py-1.5 text-xs font-bold bg-gray-50 text-gray-600 rounded-lg hover:bg-gray-100 border border-gray-200 disabled:opacity-50">
                      Bỏ qua
                    </button>
                  </>
                )}
                <Link href={`/admin/reports/${f.reportId}`}
                  className="p-1.5 text-gray-400 hover:text-gray-700">
                  <ChevronRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ReportsTable() {
  const [reports, setReports] = useState<ReportSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  const fetchReports = async () => {
    setIsLoading(true);
    try {
      const res = await getAdminReports({ page, size: 20, entityName: search || undefined });
      setReports(res.reports);
      setTotal(res.total);
    } catch {
      toast.error("Không tải được danh sách báo cáo.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { Promise.resolve().then(fetchReports); }, [page, search]);

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-gray-500" />
          <h2 className="text-sm font-bold text-gray-900">Tất cả báo cáo</h2>
          <span className="text-xs font-bold text-gray-400 bg-gray-50 px-2 py-0.5 rounded-full">{total}</span>
        </div>
        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-300" />
          <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(0); }}
            placeholder="Tìm theo tên công ty..."
            className="w-full pl-8 pr-3 py-1.5 border border-gray-200 rounded-lg text-xs focus-ms" />
        </div>
      </div>

      {isLoading ? (
        <div className="p-10 flex flex-col items-center">
          <div className="w-8 h-8 border-2 border-[#059669]/20 border-t-[#059669] rounded-full animate-spin" />
        </div>
      ) : reports.length === 0 ? (
        <div className="p-10 text-center text-sm text-gray-400">Không có báo cáo.</div>
      ) : (
        <>
          <table className="w-full">
            <thead>
              <tr className="text-[10px] font-bold text-gray-400 uppercase tracking-wider bg-gray-50/80">
                <th className="px-5 py-3 text-left">Công ty</th>
                <th className="px-5 py-3 text-left">Điểm</th>
                <th className="px-5 py-3 text-left">Đánh giá</th>
                <th className="px-5 py-3 text-left">Trạng thái</th>
                <th className="px-5 py-3 text-left">Ngày tạo</th>
                <th className="px-5 py-3 text-left"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {reports.map((r) => (
                <tr key={r.id} className="hover:bg-[#faf9f6]">
                  <td className="px-5 py-3">
                    <p className="text-sm font-semibold text-gray-900">{r.entityName}</p>
                    <p className="text-[11px] text-gray-400">{r.userEmail}</p>
                  </td>
                  <td className="px-5 py-3 text-sm">
                    {r.overrideScore != null ? (
                      <span className="text-purple-700 font-bold">{r.overrideScore}<span className="text-gray-300 line-through ml-1 font-normal">{r.overallScore}</span></span>
                    ) : (r.overallScore ?? "—")}
                  </td>
                  <td className="px-5 py-3 text-sm text-gray-600">{r.overrideRiskLevel ?? r.riskLevel ?? "—"}</td>
                  <td className="px-5 py-3">
                    <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full border ${
                      r.status === "DONE" ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                        : r.status === "FAILED" || r.status === "HARD_STOP" ? "bg-red-50 text-red-700 border-red-200"
                        : "bg-blue-50 text-blue-700 border-blue-200"
                    }`}>
                      {r.status === "DONE" ? <CheckCircle2 className="w-3 h-3" /> : r.status === "FAILED" ? <XCircle className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />}
                      {r.status}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-xs text-gray-400">{new Date(r.createdAt).toLocaleDateString("vi-VN")}</td>
                  <td className="px-5 py-3">
                    <Link href={`/admin/reports/${r.id}`} className="text-xs font-semibold text-[#059669] hover:underline">
                      Xem →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="px-5 py-3 border-t border-gray-100 flex items-center justify-between">
            <p className="text-xs text-gray-400">Trang {page + 1}</p>
            <div className="flex gap-2">
              <button onClick={() => setPage(Math.max(0, page - 1))} disabled={page === 0}
                className="px-3 py-1 border border-gray-200 rounded-lg text-xs text-gray-500 disabled:opacity-40">Trước</button>
              <button onClick={() => setPage(page + 1)} disabled={reports.length < 20}
                className="px-3 py-1 bg-gray-900 text-white rounded-lg text-xs font-semibold disabled:opacity-40">Sau</button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default function AdminReportsPage() {
  const [refreshKey, setRefreshKey] = useState(0);

  return (
    <AuthGuard requiredRole="ADMIN">
      <AdminShell active="reports">
        <AdminPageHeader
          breadcrumb="GLOBAL OPERATIONS > REPORTS & FLAGS"
          title="Báo cáo & Khiếu nại"
          subtitle="Xử lý báo cáo sai từ người dùng và quản lý toàn bộ báo cáo."
          rightSlot={<RefreshButton onClick={() => setRefreshKey((k) => k + 1)} />}
        />

        <div className="space-y-6" key={refreshKey}>
          <FlagsQueue />
          <ReportsTable />
        </div>
      </AdminShell>
    </AuthGuard>
  );
}

"use client";

import { useEffect, useState } from "react";
import { History, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { AuthGuard } from "@/components/shared/auth-guard";
import { AdminShell } from "@/components/admin/admin-shell";
import { getAuditLogs, AuditLogEntry } from "@/services/admin.service";
import { useLanguage } from "@/providers/language-provider";

function getActionStyle(action: string) {
  const a = action.toUpperCase();
  if (a.includes("DELETE") || a.includes("DEACTIVATE")) return "text-red-700 bg-red-50 border-red-200";
  if (a.includes("ACTIVATE") || a.includes("RESOLVE")) return "text-emerald-700 bg-emerald-50 border-emerald-200";
  if (a.includes("QUOTA") || a.includes("PLAN")) return "text-blue-700 bg-blue-50 border-blue-200";
  return "text-gray-600 bg-gray-50 border-gray-200";
}

export default function AdminHistoryPage() {
  const { t } = useLanguage();
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const size = 30;

  const fetchLogs = async () => {
    try {
      const res = await getAuditLogs(page, size);
      setLogs(res.logs);
      setTotal(res.total);
    } catch {
      toast.error(t("admin.history.fetchError"));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { Promise.resolve().then(fetchLogs); }, [page]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchLogs();
    setTimeout(() => setIsRefreshing(false), 500);
  };

  return (
    <AuthGuard requiredRole="ADMIN">
      <AdminShell active="history">
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-widest mb-1">{t("admin.history.breadcrumb")}</p>
            <h1 className="text-2xl font-extrabold text-gray-900">{t("admin.history.title")}</h1>
          </div>
          <button onClick={handleRefresh} disabled={isRefreshing}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-sm font-medium text-gray-600 rounded-xl hover:bg-gray-50 shadow-sm">
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? "animate-spin" : ""}`} />
          </button>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {isLoading ? (
            <div className="p-12 flex flex-col items-center">
              <div className="w-10 h-10 border-2 border-[#059669]/20 border-t-[#059669] rounded-full animate-spin mb-3" />
              <p className="text-sm text-gray-400">{t("admin.history.loading")}</p>
            </div>
          ) : logs.length === 0 ? (
            <div className="p-16 text-center">
              <History className="w-10 h-10 text-gray-200 mx-auto mb-3" />
              <p className="text-gray-400 text-sm">{t("admin.history.empty")}</p>
            </div>
          ) : (
            <>
              <table className="w-full">
                <thead>
                  <tr className="text-[10px] font-bold text-gray-400 uppercase tracking-wider bg-gray-50/80">
                    <th className="px-5 py-4 text-left">{t("admin.history.colTime")}</th>
                    <th className="px-5 py-4 text-left">{t("admin.history.colActor")}</th>
                    <th className="px-5 py-4 text-left">{t("admin.history.colAction")}</th>
                    <th className="px-5 py-4 text-left">{t("admin.history.colTarget")}</th>
                    <th className="px-5 py-4 text-left">{t("admin.history.colIp")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {logs.map((log) => (
                    <tr key={log.id} className="hover:bg-[#faf9f6] transition-colors">
                      <td className="px-5 py-4 text-xs text-gray-500 whitespace-nowrap">
                        {new Date(log.createdAt).toLocaleString("vi-VN")}
                      </td>
                      <td className="px-5 py-4 text-sm text-gray-700">{log.actorEmail}</td>
                      <td className="px-5 py-4">
                        <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${getActionStyle(log.action)}`}>
                          {log.action}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-xs text-gray-500">
                        {log.targetType ? (
                          <span>
                            {log.targetType}
                            {log.targetId ? <span className="text-gray-300 font-mono"> · {log.targetId.slice(0, 8)}</span> : null}
                          </span>
                        ) : "—"}
                      </td>
                      <td className="px-5 py-4 text-xs text-gray-400 font-mono">{log.ipAddress ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="px-5 py-4 border-t border-gray-100 flex items-center justify-between bg-gray-50/50">
                <p className="text-xs text-gray-400">
                  {t("admin.history.showingPrefix")} <span className="font-semibold">{logs.length}</span> / {total} {t("admin.history.showingSuffix")}
                </p>
                <div className="flex items-center gap-2">
                  <button onClick={() => setPage(Math.max(0, page - 1))} disabled={page === 0}
                    className="px-3 py-1.5 border border-gray-200 rounded-xl text-xs text-gray-500 hover:bg-gray-50 disabled:opacity-40">
                    {t("admin.history.prevPage")}
                  </button>
                  <span className="text-xs font-semibold text-gray-600 bg-white border border-gray-200 px-3 py-1.5 rounded-xl">
                    {t("admin.history.page", { n: page + 1 })}
                  </span>
                  <button onClick={() => setPage(page + 1)} disabled={logs.length < size}
                    className="px-3 py-1.5 bg-gray-900 text-white rounded-xl text-xs font-semibold hover:bg-gray-700 disabled:opacity-40">
                    {t("admin.history.nextPage")}
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </AdminShell>
    </AuthGuard>
  );
}

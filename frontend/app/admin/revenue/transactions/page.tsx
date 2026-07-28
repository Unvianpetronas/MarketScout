"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { AuthGuard } from "@/components/shared/auth-guard";
import { AdminShell } from "@/components/admin/admin-shell";
import { AdminPageHeader, ExportButton } from "@/components/admin/admin-page-header";
import { SectionCard } from "@/components/admin/section-card";
import { InitialsAvatar } from "@/components/admin/charts/ranked-bar-list";
import {
  getTransactionPage,
  downloadRevenueReport,
  RecentTx,
} from "@/services/admin.service";
import { vnd, planColor, statusMeta } from "../revenue-format";

const PAGE_SIZE = 25;

export default function AdminTransactionsPage() {
  const [items, setItems] = useState<RecentTx[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);

  const fetchPage = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await getTransactionPage(page, PAGE_SIZE);
      setItems(res.items);
      setTotal(res.total);
    } catch {
      toast.error("Không tải được danh sách giao dịch.");
    } finally {
      setIsLoading(false);
    }
  }, [page]);

  useEffect(() => { Promise.resolve().then(fetchPage); }, [fetchPage]);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      await downloadRevenueReport();
      toast.success("Đã xuất báo cáo .xlsx.");
    } catch {
      toast.error("Không xuất được báo cáo. Thử lại sau.");
    } finally {
      setIsExporting(false);
    }
  };

  const lastPage = Math.max(0, Math.ceil(total / PAGE_SIZE) - 1);
  const from = total === 0 ? 0 : page * PAGE_SIZE + 1;
  const to = Math.min((page + 1) * PAGE_SIZE, total);

  return (
    <AuthGuard requiredRole="ADMIN">
      <AdminShell active="revenue">
        <AdminPageHeader
          breadcrumb="GLOBAL OPERATIONS > REVENUE > GIAO DỊCH"
          title="Tất cả giao dịch"
          subtitle="Toàn bộ lịch sử thanh toán — mới nhất trước."
          rightSlot={
            <>
              <Link href="/admin/revenue"
                className="flex items-center gap-2 px-4 h-11 rounded-xl bg-white border border-[rgba(16,22,43,0.08)] text-[13px] font-semibold text-[#10162b] shadow-sm hover:bg-[#faf9f6] transition-colors">
                <ArrowLeft className="w-4 h-4" />
                Về Doanh thu
              </Link>
              <ExportButton onClick={handleExport} busy={isExporting} />
            </>
          }
        />

        <SectionCard
          title={total > 0 ? `${total.toLocaleString("vi-VN")} giao dịch` : "Giao dịch"}
          headerRight={
            total > 0 ? (
              <span className="text-[13px] text-[#8b93a3]">
                {from}–{to} / {total.toLocaleString("vi-VN")}
              </span>
            ) : undefined
          }
        >
          {isLoading ? (
            <p className="text-sm text-[#8b93a3] py-4">Đang tải…</p>
          ) : items.length === 0 ? (
            <p className="text-sm text-[#8b93a3] py-4">Chưa có giao dịch.</p>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="text-[10px] font-bold text-[#a8adb8] uppercase tracking-wider">
                      <th className="text-left pb-3">Khách hàng</th>
                      <th className="text-left pb-3">Email</th>
                      <th className="text-left pb-3">Mua gì</th>
                      <th className="text-left pb-3">Số tiền</th>
                      <th className="text-left pb-3">Phương thức</th>
                      <th className="text-left pb-3">Trạng thái</th>
                      <th className="text-left pb-3">Ngày</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((tx, i) => {
                      const sm = statusMeta(tx.status);
                      return (
                        <tr key={`${tx.email}-${tx.date}-${i}`} className="border-t border-[#f0f1f4]">
                          <td className="py-3">
                            <div className="flex items-center gap-2.5">
                              <InitialsAvatar name={tx.customer} color={planColor(tx.plan)} size={28} />
                              <span className="text-[13px] font-semibold text-[#10162b] truncate max-w-[160px]">
                                {tx.customer}
                              </span>
                            </div>
                          </td>
                          <td className="py-3 text-[13px] text-[#5b6474] truncate max-w-[200px]">{tx.email}</td>
                          <td className="py-3">
                            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap"
                              style={{ background: `${planColor(tx.plan)}1a`, color: planColor(tx.plan) }}>
                              {tx.plan}
                            </span>
                          </td>
                          <td className="py-3 text-[13px] font-semibold text-[#10162b] whitespace-nowrap">
                            {vnd(tx.amount)}
                          </td>
                          <td className="py-3 text-[13px] text-[#5b6474] uppercase">{tx.provider}</td>
                          <td className="py-3">
                            <span className="inline-flex items-center gap-1.5 text-[13px] font-semibold"
                              style={{ color: sm.color }}>
                              <span className="w-1.5 h-1.5 rounded-full" style={{ background: sm.color }} />
                              {sm.label}
                            </span>
                          </td>
                          <td className="py-3 text-xs text-[#8b93a3] whitespace-nowrap">
                            {new Date(tx.date).toLocaleDateString("vi-VN")}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {lastPage > 0 && (
                <div className="flex items-center justify-between mt-5 pt-4 border-t border-[#f0f1f4]">
                  <button
                    onClick={() => setPage((p) => Math.max(0, p - 1))}
                    disabled={page === 0}
                    className="flex items-center gap-1.5 px-3 h-9 rounded-lg border border-[rgba(16,22,43,0.08)] text-[13px] font-semibold text-[#10162b] hover:bg-[#faf9f6] transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                    <ChevronLeft className="w-4 h-4" />
                    Trước
                  </button>
                  <span className="text-[13px] text-[#5b6474]">
                    Trang {page + 1} / {lastPage + 1}
                  </span>
                  <button
                    onClick={() => setPage((p) => Math.min(lastPage, p + 1))}
                    disabled={page >= lastPage}
                    className="flex items-center gap-1.5 px-3 h-9 rounded-lg border border-[rgba(16,22,43,0.08)] text-[13px] font-semibold text-[#10162b] hover:bg-[#faf9f6] transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                    Sau
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </>
          )}
        </SectionCard>
      </AdminShell>
    </AuthGuard>
  );
}

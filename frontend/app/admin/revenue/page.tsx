"use client";

import { useEffect, useState } from "react";
import {
  DollarSign, TrendingUp, Wallet, Clock, CheckCircle2, Percent, Users, AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";
import { AuthGuard } from "@/components/shared/auth-guard";
import { AdminShell } from "@/components/admin/admin-shell";
import { AdminPageHeader, SegmentedPills, RefreshButton, ExportButton } from "@/components/admin/admin-page-header";
import { StatCard } from "@/components/admin/stat-card";
import { SectionCard, TrendPill } from "@/components/admin/section-card";
import { TrendAreaChart } from "@/components/admin/charts/trend-area-chart";
import { DonutChart, DonutSegment } from "@/components/admin/charts/donut-chart";
import { RankedBarList, RankedItem, InitialsAvatar } from "@/components/admin/charts/ranked-bar-list";
import { getRevenueAnalytics, downloadRevenueReport, RevenueAnalytics } from "@/services/admin.service";
import Link from "next/link";
import { vnd, vndCompact, planColor, STATUS_META } from "./revenue-format";

function pctChange(cur: number, prev: number): number | null {
  if (prev === 0) return cur > 0 ? 100 : null;
  return ((cur - prev) / prev) * 100;
}

const PROVIDER_COLORS = ["#059669", "#2563eb", "#7c3aed", "#c98a2c"];

export default function AdminRevenuePage() {
  const [data, setData] = useState<RevenueAnalytics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [range, setRange] = useState<"month" | "quarter" | "year">("month");

  const fetchData = async () => {
    try {
      setData(await getRevenueAnalytics());
    } catch {
      toast.error("Không tải được dữ liệu doanh thu.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { Promise.resolve().then(fetchData); }, []);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchData();
    setTimeout(() => setIsRefreshing(false), 500);
  };

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

  return (
    <AuthGuard requiredRole="ADMIN">
      <AdminShell active="revenue">
        <AdminPageHeader
          breadcrumb="GLOBAL OPERATIONS > REVENUE"
          title="Doanh thu"
          subtitle="Doanh thu thực thu — bao nhiêu, tăng hay giảm, ai trả, khoản nào đang rủi ro."
          rightSlot={
            <>
              <SegmentedPills
                value={range}
                onChange={setRange}
                options={[
                  { value: "month", label: "Tháng này" },
                  { value: "quarter", label: "Quý này" },
                  { value: "year", label: "Năm nay" },
                ]}
              />
              <ExportButton onClick={handleExport} busy={isExporting} />
              <RefreshButton onClick={handleRefresh} spinning={isRefreshing} />
            </>
          }
        />

        {isLoading || !data ? (
          <div className="bg-white rounded-[22px] border border-[rgba(16,22,43,0.06)] p-16 flex flex-col items-center shadow-sm">
            <div className="w-10 h-10 border-2 border-[#059669]/20 border-t-[#059669] rounded-full animate-spin mb-3" />
            <p className="text-sm text-[#8b93a3]">Đang tải…</p>
          </div>
        ) : (
          <RevenueBody data={data} />
        )}
      </AdminShell>
    </AuthGuard>
  );
}

function RatioCard({
  icon: Icon, iconBg, iconColor, value, label, description,
}: {
  icon: React.ElementType; iconBg: string; iconColor: string;
  value: string; label: string; description: string;
}) {
  return (
    <div className="flex items-center gap-4 bg-white rounded-[18px] border border-[rgba(16,22,43,0.06)] p-4 shadow-[0_2px_20px_rgba(16,22,43,0.03)]">
      <div className="w-10 h-10 rounded-[11px] flex items-center justify-center shrink-0" style={{ background: iconBg }}>
        <Icon className="w-[18px] h-[18px]" style={{ color: iconColor }} />
      </div>
      <div className="min-w-0">
        <div className="flex items-baseline gap-1.5">
          <span className="text-xl font-extrabold text-[#10162b] font-display">{value}</span>
          <span className="text-[13px] font-semibold text-[#5b6474] truncate">{label}</span>
        </div>
        <p className="text-xs text-[#8b93a3] mt-0.5">{description}</p>
      </div>
    </div>
  );
}

function RevenueBody({ data }: { data: RevenueAnalytics }) {
  const mrrTrend = pctChange(data.revenueThisMonth, data.revenueLastMonth);
  const txThisMonth = data.completedCountThisMonth + data.failedCountThisMonth + data.pendingCountThisMonth;
  const successRate = txThisMonth > 0 ? Math.round((data.completedCountThisMonth / txThisMonth) * 100) : 0;
  const arpu = data.payingUsers > 0 ? data.revenueAllTime / data.payingUsers : 0;
  const conversion = data.totalUsers > 0 ? Math.round((data.payingUsers / data.totalUsers) * 100) : 0;

  const planTotal = data.revenueByPlan.reduce((s, p) => s + p.amount, 0);
  const planSegments: DonutSegment[] = data.revenueByPlan.map((p) => ({
    label: p.name, value: p.amount, color: planColor(p.name),
  }));
  const topPlanShare = planTotal > 0 ? Math.max(...data.revenueByPlan.map((p) => p.amount)) / planTotal : 0;

  const providerItems: RankedItem[] = data.revenueByProvider.map((p, i) => ({
    id: p.name,
    label: p.name.toUpperCase(),
    value: p.amount,
    valueText: vnd(p.amount),
    barColor: PROVIDER_COLORS[i % PROVIDER_COLORS.length],
  }));

  const payerItems: RankedItem[] = data.topPayers.map((p, i) => ({
    id: p.email,
    label: p.name,
    value: p.amount,
    valueText: vnd(p.amount),
    barColor: planColor(p.plan),
    leading: (
      <div className="flex items-center gap-2.5 shrink-0">
        <span className="text-xs font-bold text-[#c3c8d1] w-4 text-right">#{i + 1}</span>
        <InitialsAvatar name={p.name} color={planColor(p.plan)} />
      </div>
    ),
  }));

  return (
    <div className="space-y-5">
      {/* KPI row */}
      <div className="grid grid-cols-4 gap-5">
        <StatCard icon={DollarSign} iconBg="rgba(37,99,235,0.12)" iconColor="#2563eb"
          value={vnd(data.revenueThisMonth)} trend={mrrTrend != null ? { pct: mrrTrend } : undefined}
          label="Doanh thu tháng này" description="Thực thu từ giao dịch hoàn tất" />
        <StatCard icon={TrendingUp} iconBg="rgba(124,58,237,0.12)" iconColor="#7c3aed"
          value={vnd(data.revenueThisYear)} label="Doanh thu năm nay" description="Tổng thực thu từ đầu năm" />
        <StatCard icon={Wallet} iconBg="rgba(5,150,105,0.12)" iconColor="#059669"
          value={vnd(data.revenueAllTime)} label="Tổng thực thu" description="Toàn bộ lịch sử giao dịch" />
        <StatCard icon={Clock} iconBg="rgba(201,138,44,0.12)" iconColor="#c98a2c"
          value={vnd(data.pendingFailedAmount)} label="Tiền chưa thu được"
          description={`${data.pendingCountThisMonth} chờ · ${data.failedCountThisMonth} thất bại (tháng)`} />
      </div>

      {/* Ratio row */}
      <div className="grid grid-cols-3 gap-5">
        <RatioCard icon={CheckCircle2} iconBg="rgba(5,150,105,0.12)" iconColor="#059669"
          value={`${successRate}%`} label="Tỉ lệ thành công" description="Giao dịch hoàn tất trong tháng" />
        <RatioCard icon={Percent} iconBg="rgba(37,99,235,0.12)" iconColor="#2563eb"
          value={vnd(arpu)} label="ARPU" description="Bình quân mỗi khách trả phí" />
        <RatioCard icon={Users} iconBg="rgba(124,58,237,0.12)" iconColor="#7c3aed"
          value={`${conversion}%`} label="Free → Paid" description={`${data.payingUsers}/${data.totalUsers} người dùng đã trả phí`} />
      </div>

      {/* Analytics row */}
      <div className="grid gap-5" style={{ gridTemplateColumns: "1.3fr 1fr 1fr" }}>
        <SectionCard title="Doanh thu theo thời gian"
          headerRight={mrrTrend != null ? <TrendPill pct={mrrTrend} /> : undefined}>
          <TrendAreaChart values={data.revenueOverTime.map((m) => m.amount)} labels={data.revenueOverTime.map((m) => m.label)} />
        </SectionCard>

        <SectionCard title="Doanh thu theo gói & quota">
          {planSegments.length === 0 ? (
            <p className="text-sm text-[#8b93a3] py-4">Chưa có dữ liệu.</p>
          ) : (
            <>
              <DonutChart segments={planSegments} centerValue={vndCompact(planTotal)} centerLabel="tổng thu" />
              {topPlanShare >= 0.8 && (
                <p className="text-xs text-[#8b93a3] mt-4 leading-relaxed">
                  Doanh thu tập trung ở một nhóm nhỏ khách hàng — rủi ro phụ thuộc khách hàng cao.
                </p>
              )}
            </>
          )}
        </SectionCard>

        <SectionCard title="Doanh thu theo phương thức">
          <RankedBarList items={providerItems} />
        </SectionCard>
      </div>

      {/* Bottom row */}
      <div className="grid gap-5" style={{ gridTemplateColumns: "1.7fr 1fr" }}>
        <SectionCard title="Giao dịch gần đây"
          headerRight={
            <Link href="/admin/revenue/transactions"
              className="text-[13px] font-bold text-[#047857] hover:underline">
              Xem tất cả →
            </Link>
          }>
          {data.recentTransactions.length === 0 ? (
            <p className="text-sm text-[#8b93a3] py-4">Chưa có giao dịch.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-[10px] font-bold text-[#a8adb8] uppercase tracking-wider">
                    <th className="text-left pb-3">Khách hàng</th>
                    <th className="text-left pb-3">Gói</th>
                    <th className="text-left pb-3">Số tiền</th>
                    <th className="text-left pb-3">Phương thức</th>
                    <th className="text-left pb-3">Trạng thái</th>
                    <th className="text-left pb-3">Ngày</th>
                  </tr>
                </thead>
                <tbody>
                  {data.recentTransactions.map((tx, i) => {
                    const sm = STATUS_META[tx.status] ?? { label: tx.status, color: "#8b93a3" };
                    return (
                      <tr key={i} className="border-t border-[#f0f1f4]">
                        <td className="py-3">
                          <div className="flex items-center gap-2.5">
                            <InitialsAvatar name={tx.customer} color={planColor(tx.plan)} size={28} />
                            <span className="text-[13px] font-semibold text-[#10162b] truncate max-w-[160px]">{tx.customer}</span>
                          </div>
                        </td>
                        <td className="py-3">
                          <span className="text-[11px] font-bold px-2 py-0.5 rounded-full"
                            style={{ background: `${planColor(tx.plan)}1a`, color: planColor(tx.plan) }}>
                            {tx.plan}
                          </span>
                        </td>
                        <td className="py-3 text-[13px] font-semibold text-[#10162b] whitespace-nowrap">{vnd(tx.amount)}</td>
                        <td className="py-3 text-[13px] text-[#5b6474] uppercase">{tx.provider}</td>
                        <td className="py-3">
                          <span className="inline-flex items-center gap-1.5 text-[13px] font-semibold" style={{ color: sm.color }}>
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
          )}
        </SectionCard>

        <div className="space-y-5">
          {(data.failedCountThisMonth > 0 || data.pendingFailedAmount > 0) && (
            <div className="rounded-[22px] border p-[24px_26px]"
              style={{ background: "rgba(193,72,61,0.05)", borderColor: "rgba(193,72,61,0.15)" }}>
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-[11px] flex items-center justify-center shrink-0"
                  style={{ background: "rgba(193,72,61,0.12)" }}>
                  <AlertTriangle className="w-5 h-5 text-[#c1483d]" />
                </div>
                <div>
                  <p className="text-sm font-bold text-[#10162b]">{data.failedCountThisMonth} thanh toán thất bại</p>
                  <p className="text-xs text-[#5b6474] mt-0.5">{vnd(data.pendingFailedAmount)} chưa thu được</p>
                  <span className="text-[13px] font-bold text-[#c1483d] cursor-pointer mt-2 inline-block">Xem chi tiết →</span>
                </div>
              </div>
            </div>
          )}

          <SectionCard title="Khách hàng đóng góp nhiều nhất">
            <RankedBarList items={payerItems} showBar={false} />
          </SectionCard>
        </div>
      </div>
    </div>
  );
}

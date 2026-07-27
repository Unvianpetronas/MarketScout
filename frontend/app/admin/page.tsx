"use client";

import { useEffect, useState } from "react";
import { Users, Activity, FileText, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { AuthGuard } from "@/components/shared/auth-guard";
import { AdminShell } from "@/components/admin/admin-shell";
import { AdminPageHeader, SegmentedPills, RefreshButton } from "@/components/admin/admin-page-header";
import { StatCard } from "@/components/admin/stat-card";
import { SectionCard, TrendPill } from "@/components/admin/section-card";
import { TrendAreaChart } from "@/components/admin/charts/trend-area-chart";
import { DonutChart, DonutSegment } from "@/components/admin/charts/donut-chart";
import { RankedBarList, RankedItem, CodeBadge, InitialsAvatar } from "@/components/admin/charts/ranked-bar-list";
import { StackedSegmentBar, StackSegment } from "@/components/admin/charts/stacked-segment-bar";
import { getAnalyticsOverview, AnalyticsOverview } from "@/services/admin.service";

function pctChange(cur: number, prev: number): number | null {
  if (prev === 0) return cur > 0 ? 100 : null;
  return ((cur - prev) / prev) * 100;
}

const STATUS_META: Record<string, { label: string; color: string }> = {
  DONE: { label: "Hoàn tất", color: "#059669" },
  HARD_STOP: { label: "Dừng khẩn cấp", color: "#c1483d" },
  QUICK_SCANNING: { label: "Đang quét nhanh", color: "#c98a2c" },
  DEEP_SCANNING: { label: "Đang quét sâu", color: "#2563eb" },
  PENDING: { label: "Chờ xử lý", color: "#8b93a3" },
  FAILED: { label: "Thất bại", color: "#db2777" },
};
const FALLBACK = ["#6366f1", "#0ea5e9", "#14b8a6", "#f59e0b", "#a78bfa", "#ec4899"];
const AVATARS = ["#059669", "#2563eb", "#7c3aed", "#db2777", "#c98a2c"];

function riskMeta(key: string): { label: string; color: string } {
  const k = key.toLowerCase();
  if (k.includes("critical") || k.includes("nghiêm")) return { label: "Nghiêm trọng", color: "#c1483d" };
  if (k.includes("high") || k.includes("cao")) return { label: "Cao", color: "#c98a2c" };
  if (k.includes("medium") || k.includes("trung")) return { label: "Trung bình", color: "#2563eb" };
  if (k.includes("low") || k.includes("thấp")) return { label: "Thấp", color: "#059669" };
  return { label: key, color: "#8b93a3" };
}

function planColor(name: string): string {
  const p = name.toLowerCase();
  if (p.includes("enterprise")) return "#db2777";
  if (p.includes("pro")) return "#7c3aed";
  if (p.includes("starter")) return "#2563eb";
  return "#8b93a3";
}

const COUNTRY_NAME: Record<string, string> = {
  VN: "Việt Nam", SG: "Singapore", US: "Hoa Kỳ", CN: "Trung Quốc", JP: "Nhật Bản",
  KR: "Hàn Quốc", GB: "Anh", DE: "Đức", FR: "Pháp", TH: "Thái Lan", IN: "Ấn Độ",
};

export default function AdminOverviewPage() {
  const [data, setData] = useState<AnalyticsOverview | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [range, setRange] = useState<"today" | "7d" | "30d">("30d");

  const fetchOverview = async () => {
    try {
      setData(await getAnalyticsOverview());
    } catch {
      toast.error("Không tải được dữ liệu tổng quan.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { Promise.resolve().then(fetchOverview); }, []);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchOverview();
    setTimeout(() => setIsRefreshing(false), 500);
  };

  return (
    <AuthGuard requiredRole="ADMIN">
      <AdminShell active="overview">
        <AdminPageHeader
          breadcrumb="GLOBAL OPERATIONS > OVERVIEW"
          title="Tổng quan"
          subtitle="Sức khỏe toàn hệ thống — người dùng, báo cáo, rủi ro và phân bố."
          rightSlot={
            <>
              <SegmentedPills
                value={range}
                onChange={setRange}
                options={[
                  { value: "today", label: "Hôm nay" },
                  { value: "7d", label: "7 ngày" },
                  { value: "30d", label: "30 ngày" },
                ]}
              />
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
          <OverviewBody data={data} />
        )}
      </AdminShell>
    </AuthGuard>
  );
}

function OverviewBody({ data }: { data: AnalyticsOverview }) {
  const totalReports = data.totalReports;
  const usersTrend = pctChange(data.newUsersThisMonth, data.newUsersLastMonth);
  const reportsTrend = pctChange(data.reportsThisMonth, data.reportsLastMonth);
  const activePct = data.totalUsers > 0 ? Math.round((data.activeUsers / data.totalUsers) * 100) : 0;

  const statusEntries = Object.entries(data.reportsByStatus);
  const statusSegments: DonutSegment[] = statusEntries.map(([k, v], i) => {
    const meta = STATUS_META[k] ?? { label: k, color: FALLBACK[i % FALLBACK.length] };
    return { label: meta.label, value: v, color: meta.color };
  });

  const countryTotal = data.reportsByCountry.reduce((s, c) => s + c.count, 0) || 1;
  const countryItems: RankedItem[] = data.reportsByCountry.slice(0, 6).map((c) => ({
    id: c.code,
    label: COUNTRY_NAME[c.code] ?? c.code,
    value: c.count,
    valueText: `${Math.round((c.count / countryTotal) * 100)}%`,
    leading: <CodeBadge code={c.code} />,
  }));

  const riskSegments: StackSegment[] = Object.entries(data.reportsByRiskLevel).map(([k, v]) => {
    const m = riskMeta(k);
    return { label: m.label, value: v, color: m.color };
  });

  const companyItems: RankedItem[] = data.topCompanies.map((c, i) => ({
    id: `${c.name}-${i}`,
    label: c.name,
    value: c.count,
    valueText: `${c.count} lượt`,
    barColor: AVATARS[i % AVATARS.length],
    leading: (
      <div className="flex items-center gap-2.5 shrink-0">
        <span className="text-xs font-bold text-[#c3c8d1] w-4 text-right">#{i + 1}</span>
        <InitialsAvatar name={c.name} color={AVATARS[i % AVATARS.length]} />
      </div>
    ),
  }));

  const planItems: RankedItem[] = Object.entries(data.usersByPlan).map(([plan, count]) => ({
    id: plan,
    label: plan,
    value: count,
    valueText: String(count),
    barColor: planColor(plan),
    leading: <span className="w-2.5 h-2.5 rounded-[3px] shrink-0" style={{ background: planColor(plan) }} />,
  }));

  return (
    <div className="space-y-5">
      {/* KPI row */}
      <div className="grid grid-cols-4 gap-5">
        <StatCard icon={Users} iconBg="rgba(99,102,241,0.12)" iconColor="#6366f1"
          value={String(data.totalUsers)} trend={usersTrend != null ? { pct: usersTrend } : undefined}
          label="Tổng người dùng" description={`${data.newUsersThisMonth} mới tháng này`} />
        <StatCard icon={Activity} iconBg="rgba(5,150,105,0.12)" iconColor="#059669" live
          value={String(data.activeUsers)} label="Đang hoạt động" description={`${activePct}% tổng số`} />
        <StatCard icon={FileText} iconBg="rgba(37,99,235,0.12)" iconColor="#2563eb"
          value={String(data.totalReports)} trend={reportsTrend != null ? { pct: reportsTrend } : undefined}
          label="Tổng báo cáo" description={`${data.reportsThisMonth} tháng này`} />
        <StatCard icon={AlertTriangle} iconBg="rgba(201,138,44,0.12)" iconColor="#c98a2c"
          value={String(data.openAlerts)} label="Cảnh báo chưa xử lý"
          description={`${data.failedJobs} lỗi · ${data.runningJobs} job đang chạy`} />
      </div>

      {/* Analytics row 1 */}
      <div className="grid gap-5" style={{ gridTemplateColumns: "1.15fr 1fr 1fr" }}>
        <SectionCard title="Báo cáo theo thời gian"
          headerRight={reportsTrend != null ? <TrendPill pct={reportsTrend} /> : undefined}>
          <TrendAreaChart values={data.reportsOverTime.map((m) => m.count)} labels={data.reportsOverTime.map((m) => m.label)} />
        </SectionCard>

        <SectionCard title="Báo cáo theo trạng thái">
          {statusSegments.length === 0
            ? <p className="text-sm text-[#8b93a3] py-4">Chưa có dữ liệu.</p>
            : <DonutChart segments={statusSegments} centerValue={String(totalReports)} centerLabel="báo cáo" />}
        </SectionCard>

        <SectionCard title="Phân bố theo quốc gia">
          <RankedBarList items={countryItems} />
        </SectionCard>
      </div>

      {/* Analytics row 2 */}
      <div className="grid gap-5" style={{ gridTemplateColumns: "1fr 1.15fr 1fr" }}>
        <SectionCard title="Báo cáo theo mức rủi ro">
          {riskSegments.length === 0
            ? <p className="text-sm text-[#8b93a3] py-4">Chưa có dữ liệu.</p>
            : <StackedSegmentBar segments={riskSegments} />}
        </SectionCard>

        <SectionCard title="Doanh nghiệp được tra cứu nhiều nhất">
          <RankedBarList items={companyItems} />
        </SectionCard>

        <SectionCard title="Người dùng theo gói">
          <RankedBarList items={planItems} />
        </SectionCard>
      </div>
    </div>
  );
}

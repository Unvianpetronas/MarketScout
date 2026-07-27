"use client";

import { useEffect, useState } from "react";
import { Target, Edit3, Flag, Star } from "lucide-react";
import { toast } from "sonner";
import { AuthGuard } from "@/components/shared/auth-guard";
import { AdminShell } from "@/components/admin/admin-shell";
import { AdminPageHeader, RefreshButton } from "@/components/admin/admin-page-header";
import { StatCard } from "@/components/admin/stat-card";
import { SectionCard } from "@/components/admin/section-card";
import { StackedSegmentBar, StackSegment } from "@/components/admin/charts/stacked-segment-bar";
import { RankedBarList, RankedItem } from "@/components/admin/charts/ranked-bar-list";
import { getEvaluationAnalytics, EvaluationAnalytics, Bucket } from "@/services/admin.service";

const CONFIDENCE_META: Record<string, { label: string; color: string }> = {
  HIGH: { label: "Cao", color: "#059669" },
  MEDIUM: { label: "Trung bình", color: "#c98a2c" },
  LOW: { label: "Thấp", color: "#c1483d" },
};
const CONFIDENCE_ORDER = ["HIGH", "MEDIUM", "LOW"];

const REASON_LABEL: Record<string, string> = {
  WRONG_SCORE: "Điểm/rủi ro sai",
  WRONG_INFO: "Thông tin công ty sai",
  SANCTIONS_FALSE_POSITIVE: "Báo nhầm trừng phạt",
  OTHER: "Khác",
};

function bucketMap(buckets: Bucket[]): Record<string, number> {
  return Object.fromEntries(buckets.map((b) => [b.label, b.count]));
}

export default function AdminEvaluationPage() {
  const [data, setData] = useState<EvaluationAnalytics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchData = async () => {
    try {
      setData(await getEvaluationAnalytics());
    } catch {
      toast.error("Không tải được dữ liệu đánh giá.");
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

  return (
    <AuthGuard requiredRole="ADMIN">
      <AdminShell active="evaluation">
        <AdminPageHeader
          breadcrumb="GLOBAL OPERATIONS > EVALUATION"
          title="Đánh giá hệ thống"
          subtitle="Đo chất lượng thẩm định AI qua chỉnh sửa của admin, khiếu nại, độ tự tin và mức hài lòng của người dùng."
          rightSlot={<RefreshButton onClick={handleRefresh} spinning={isRefreshing} />}
        />

        {isLoading || !data ? (
          <div className="bg-white rounded-[22px] border border-[rgba(16,22,43,0.06)] p-16 flex flex-col items-center shadow-sm">
            <div className="w-10 h-10 border-2 border-[#059669]/20 border-t-[#059669] rounded-full animate-spin mb-3" />
            <p className="text-sm text-[#8b93a3]">Đang tải…</p>
          </div>
        ) : (
          <EvaluationBody data={data} />
        )}
      </AdminShell>
    </AuthGuard>
  );
}

function EvaluationBody({ data }: { data: EvaluationAnalytics }) {
  const confMap = bucketMap(data.confidenceDistribution);
  const confSegments: StackSegment[] = CONFIDENCE_ORDER
    .filter((k) => confMap[k])
    .map((k) => ({ label: CONFIDENCE_META[k].label, value: confMap[k], color: CONFIDENCE_META[k].color }));

  const starMap = bucketMap(data.starDistribution);
  const starItems: RankedItem[] = [5, 4, 3, 2, 1].map((n) => ({
    id: String(n),
    label: `${n} sao`,
    value: starMap[String(n)] ?? 0,
    valueText: String(starMap[String(n)] ?? 0),
    barColor: "#f59e0b",
    leading: <Star className="w-4 h-4 shrink-0" fill="#f59e0b" stroke="#f59e0b" />,
  }));

  const reasonItems: RankedItem[] = data.flagsByReason.map((b, i) => ({
    id: b.label,
    label: REASON_LABEL[b.label] ?? b.label,
    value: b.count,
    valueText: String(b.count),
    barColor: ["#c1483d", "#c98a2c", "#6366f1", "#8b93a3"][i % 4],
  }));

  const flagStatusSegments: StackSegment[] = [
    { label: "Chưa xử lý", value: data.flagsOpen, color: "#c98a2c" },
    { label: "Đã xử lý", value: data.flagsResolved, color: "#059669" },
    { label: "Đã bỏ qua", value: data.flagsDismissed, color: "#8b93a3" },
  ].filter((s) => s.value > 0);

  return (
    <div className="space-y-5">
      {/* KPI row */}
      <div className="grid grid-cols-4 gap-5">
        <StatCard icon={Target} iconBg="rgba(5,150,105,0.12)" iconColor="#059669"
          value={`${data.accuracyPct}%`} label="Độ chính xác (proxy)"
          description="1 − tỉ lệ báo cáo bị admin chỉnh sửa" />
        <StatCard icon={Edit3} iconBg="rgba(201,138,44,0.12)" iconColor="#c98a2c"
          value={`${data.overrideRatePct}%`} label="Tỉ lệ chỉnh sửa"
          description={`${data.overriddenCount}/${data.totalReports} báo cáo được sửa`} />
        <StatCard icon={Flag} iconBg="rgba(193,72,61,0.12)" iconColor="#c1483d"
          value={`${data.flagRatePct}%`} label="Tỉ lệ khiếu nại"
          description={`${data.flaggedTotal} lượt "báo kết quả sai"`} />
        <StatCard icon={Star} iconBg="rgba(37,99,235,0.12)" iconColor="#2563eb"
          value={data.avgStars != null ? `${data.avgStars.toFixed(1)} ★` : "—"}
          label="Điểm hài lòng" description={`${data.ratingCount} lượt đánh giá`} />
      </div>

      {/* Row 1 */}
      <div className="grid gap-5" style={{ gridTemplateColumns: "1fr 1fr" }}>
        <SectionCard title="Độ tự tin của AI (theo pillar)">
          {confSegments.length === 0
            ? <p className="text-sm text-[#8b93a3] py-4">Chưa có dữ liệu.</p>
            : <StackedSegmentBar segments={confSegments} />}
        </SectionCard>

        <SectionCard title="Phân bố điểm đánh giá của người dùng">
          {data.ratingCount === 0
            ? <p className="text-sm text-[#8b93a3] py-4">Chưa có đánh giá nào.</p>
            : <RankedBarList items={starItems} />}
        </SectionCard>
      </div>

      {/* Row 2 */}
      <div className="grid gap-5" style={{ gridTemplateColumns: "1fr 1fr" }}>
        <SectionCard title="Khiếu nại theo lý do">
          {reasonItems.length === 0
            ? <p className="text-sm text-[#8b93a3] py-4">Chưa có khiếu nại.</p>
            : <RankedBarList items={reasonItems} />}
        </SectionCard>

        <SectionCard title="Trạng thái xử lý khiếu nại">
          {flagStatusSegments.length === 0 ? (
            <p className="text-sm text-[#8b93a3] py-4">Chưa có khiếu nại.</p>
          ) : (
            <>
              <StackedSegmentBar segments={flagStatusSegments} />
              {data.sanctionsFalsePositive > 0 && (
                <p className="text-xs text-[#8b93a3] mt-4 leading-relaxed">
                  Có <span className="font-bold text-[#c1483d]">{data.sanctionsFalsePositive}</span> khiếu nại &quot;báo nhầm trừng phạt&quot; —
                  cần rà soát ngưỡng sàng lọc sanctions để giảm false-positive.
                </p>
              )}
            </>
          )}
        </SectionCard>
      </div>

      {/* Recent user ratings with comments */}
      <SectionCard title="Đánh giá gần đây của người dùng">
        {data.recentRatings.length === 0 ? (
          <p className="text-sm text-[#8b93a3] py-4">Chưa có đánh giá nào.</p>
        ) : (
          <div className="divide-y divide-[#f0f1f4]">
            {data.recentRatings.map((r, i) => (
              <div key={i} className="py-3">
                <div className="flex items-center gap-1 mb-1">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <Star key={n} className="w-3.5 h-3.5"
                      fill={n <= r.stars ? "#f59e0b" : "none"}
                      stroke={n <= r.stars ? "#f59e0b" : "#cbd2dc"} strokeWidth={1.8} />
                  ))}
                  <span className="ml-2 text-[13px] font-semibold text-[#10162b] truncate">{r.reportEntity}</span>
                </div>
                {r.comment && <p className="text-[13px] text-[#5b6474] mb-1">{r.comment}</p>}
                <p className="text-[11px] text-[#8b93a3]">{r.userEmail} · {new Date(r.createdAt).toLocaleString("vi-VN")}</p>
              </div>
            ))}
          </div>
        )}
      </SectionCard>
    </div>
  );
}

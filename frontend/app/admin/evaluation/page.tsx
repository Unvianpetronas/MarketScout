"use client";

import { useEffect, useState } from "react";
import { Target, Edit3, Flag, Star, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import { AuthGuard } from "@/components/shared/auth-guard";
import { AdminShell } from "@/components/admin/admin-shell";
import { AdminPageHeader, RefreshButton } from "@/components/admin/admin-page-header";
import { StatCard } from "@/components/admin/stat-card";
import { SectionCard } from "@/components/admin/section-card";
import { StackedSegmentBar, StackSegment } from "@/components/admin/charts/stacked-segment-bar";
import { RankedBarList, RankedItem } from "@/components/admin/charts/ranked-bar-list";
import { getEvaluationAnalytics, EvaluationAnalytics, Bucket, SusEntry } from "@/services/admin.service";

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

/** Green at or above the published SUS average, amber below, red well below. */
function susColor(score: number, benchmark: number): string {
  if (score >= benchmark) return "#059669";
  if (score >= benchmark - 15) return "#c98a2c";
  return "#c1483d";
}

// The 10 SUS statements, shortened for the chart axis. Order is fixed by the
// instrument — item N here must stay item N in SystemRating.susScore.
const SUS_ITEM_LABEL = [
  "1. Muốn dùng thường xuyên",
  "2. Phức tạp không cần thiết",
  "3. Dễ sử dụng",
  "4. Cần hỗ trợ kỹ thuật",
  "5. Chức năng gắn kết tốt",
  "6. Thiếu nhất quán",
  "7. Học dùng rất nhanh",
  "8. Cồng kềnh khi dùng",
  "9. Tự tin khi sử dụng",
  "10. Phải học nhiều mới dùng được",
];

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

  // contributionPct is already normalised so higher is always better, which is
  // what makes these ten bars comparable despite half the items being worded
  // negatively. Colour by the same threshold as the headline score.
  const susItems: RankedItem[] = data.sus.itemAverages.map((it) => ({
    id: `sus-${it.item}`,
    label: SUS_ITEM_LABEL[it.item - 1] ?? `Câu ${it.item}`,
    value: it.contributionPct,
    valueText: `${it.contributionPct.toFixed(0)}/100 (TB ${it.avgAnswer.toFixed(1)}/5)`,
    barColor: susColor(it.contributionPct, data.sus.benchmark),
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

      {/* SUS — kept in its own section, never averaged with the star ratings
          above: those measure whether a report was correct, this measures
          whether the software is usable. */}
      <div className="grid gap-5" style={{ gridTemplateColumns: "1fr 1fr" }}>
        <SectionCard title="Khả dụng hệ thống — SUS">
          {data.sus.avgScore == null ? (
            <p className="text-sm text-[#8b93a3] py-4">
              Chưa có phản hồi nào. Khảo sát hiện với người dùng đã tạo từ 3 báo cáo trở lên.
              {data.sus.dismissedCount > 0 && ` Đã có ${data.sus.dismissedCount} người bỏ qua.`}
            </p>
          ) : (
            <>
              <div className="flex items-end gap-3 mb-1">
                <span className="text-4xl font-extrabold" style={{ color: susColor(data.sus.avgScore, data.sus.benchmark) }}>
                  {data.sus.avgScore.toFixed(1)}
                </span>
                <span className="text-sm text-[#8b93a3] mb-1.5">/ 100</span>
              </div>
              <p className="text-[13px] text-[#5b6474] mb-4">
                Mốc trung bình ngành là <span className="font-bold">{data.sus.benchmark}</span> —{" "}
                <span className="font-bold" style={{ color: susColor(data.sus.avgScore, data.sus.benchmark) }}>
                  {data.sus.avgScore >= data.sus.benchmark ? "trên" : "dưới"} mốc{" "}
                  {Math.abs(data.sus.avgScore - data.sus.benchmark).toFixed(1)} điểm
                </span>.
              </p>
              {/* Sample size is stated next to the score on purpose: a SUS mean
                  over a handful of responses is a weak claim and should read
                  that way rather than being quoted bare. */}
              <p className="text-xs text-[#8b93a3] leading-relaxed">
                {data.sus.responseCount} phản hồi · {data.sus.dismissedCount} bỏ qua.
                {data.sus.responseCount < 5 && " Cỡ mẫu còn nhỏ — con số này chưa đủ vững để kết luận."}
                <br />
                SUS (Brooke, 1996) là thang đo chuẩn 10 câu, quy về 0–100. Đây không phải phần trăm.
              </p>
            </>
          )}
        </SectionCard>

        <SectionCard title="SUS theo từng câu hỏi">
          {susItems.length === 0
            ? <p className="text-sm text-[#8b93a3] py-4">Chưa có phản hồi nào.</p>
            : <RankedBarList items={susItems} max={100} />}
        </SectionCard>
      </div>

      {/* Recent SUS responses — each one expands to the respondent's ten
          answers, so a bad score can be traced to the questions that caused it
          rather than only being read as an aggregate. */}
      {data.sus.recentResponses.length > 0 && (
        <SectionCard title="Phản hồi SUS gần đây">
          <div className="divide-y divide-[#f0f1f4]">
            {data.sus.recentResponses.map((r, i) => (
              <SusResponseRow key={i} entry={r} benchmark={data.sus.benchmark} />
            ))}
          </div>
        </SectionCard>
      )}

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

/**
 * One SUS respondent, collapsed to their score until clicked. Expanding shows
 * all ten answers with each item's normalised contribution, which is the only
 * way to tell *why* someone scored the product low — the aggregate can't.
 */
function SusResponseRow({ entry, benchmark }: { entry: SusEntry; benchmark: number }) {
  const [open, setOpen] = useState(false);
  const hasAnswers = entry.answers.length === SUS_ITEM_LABEL.length;

  return (
    <div className="py-3">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        disabled={!hasAnswers}
        aria-expanded={open}
        className="w-full flex items-center gap-2 text-left disabled:cursor-default"
      >
        <span className="text-[13px] font-bold" style={{ color: susColor(entry.score ?? 0, benchmark) }}>
          {/* One decimal, matching the headline average — rounding to a whole
              number here made a single response read as 58 next to a 57.5 mean. */}
          {entry.score != null ? entry.score.toFixed(1) : "—"}/100
        </span>
        <span className="text-[11px] text-[#8b93a3]">
          {entry.userEmail} · {new Date(entry.createdAt).toLocaleString("vi-VN")}
        </span>
        {hasAnswers && (
          <ChevronDown
            className={`w-3.5 h-3.5 text-[#8b93a3] ml-auto shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
          />
        )}
      </button>

      {entry.comment && <p className="text-[13px] text-[#5b6474] mt-1">{entry.comment}</p>}

      {open && hasAnswers && (
        <div className="mt-3 space-y-1.5 border-l-2 border-[#f0f1f4] pl-3">
          {SUS_ITEM_LABEL.map((label, idx) => {
            const answer = entry.answers[idx];
            // Odd items (index 0, 2, …) are positively worded and contribute
            // answer-1; even ones are negative and contribute 5-answer.
            const contribution = (idx % 2 === 0 ? answer - 1 : 5 - answer) / 4 * 100;
            return (
              <div key={label} className="flex items-center gap-2">
                <span className="text-[12px] text-[#5b6474] flex-1 min-w-0 truncate">{label}</span>
                <span
                  className="text-[11px] font-bold w-11 h-6 rounded-md flex items-center justify-center shrink-0"
                  style={{
                    color: susColor(contribution, benchmark),
                    background: `${susColor(contribution, benchmark)}1a`,
                  }}
                >
                  {answer}/5
                </span>
                <span className="text-[11px] text-[#8b93a3] w-14 text-right shrink-0">
                  {contribution.toFixed(0)}/100
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

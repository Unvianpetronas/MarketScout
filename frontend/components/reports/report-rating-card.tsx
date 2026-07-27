"use client";

import { useEffect, useState } from "react";
import { Star } from "lucide-react";
import { toast } from "sonner";
import { getReportRating, upsertReportRating } from "@/services/report.service";

export function ReportRatingCard({ reportId }: { reportId: string }) {
  const [stars, setStars] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState("");
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getReportRating(reportId)
      .then((r) => {
        if (cancelled || !r) return;
        setStars(r.stars);
        setComment(r.comment ?? "");
        setSaved(true);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [reportId]);

  const handleSubmit = async () => {
    if (stars < 1) {
      toast.error("Hãy chọn số sao trước khi gửi.");
      return;
    }
    setSaving(true);
    try {
      await upsertReportRating(reportId, stars, comment.trim() || null);
      setSaved(true);
      toast.success("Cảm ơn đánh giá của bạn!");
    } catch {
      toast.error("Không gửi được đánh giá. Thử lại sau.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-[rgba(16,22,43,0.06)] p-6 shadow-[0_2px_20px_rgba(16,22,43,0.03)]">
      <div className="flex items-center justify-between mb-1">
        <h3 className="text-base font-bold text-gray-900">Đánh giá báo cáo này</h3>
        {saved && <span className="text-xs font-semibold text-emerald-600">Đã đánh giá ✓</span>}
      </div>
      <p className="text-sm text-gray-500 mb-4">
        Báo cáo này có chính xác và hữu ích với bạn không? Phản hồi giúp chúng tôi cải thiện chất lượng thẩm định.
      </p>

      <div className="flex items-center gap-1.5 mb-4" onMouseLeave={() => setHover(0)}>
        {[1, 2, 3, 4, 5].map((n) => {
          const active = n <= (hover || stars);
          return (
            <button key={n} type="button"
              onMouseEnter={() => setHover(n)}
              onClick={() => setStars(n)}
              aria-label={`${n} sao`}
              className="p-0.5 transition-transform hover:scale-110">
              <Star className="w-7 h-7" fill={active ? "#f59e0b" : "none"}
                stroke={active ? "#f59e0b" : "#cbd2dc"} strokeWidth={1.8} />
            </button>
          );
        })}
        {stars > 0 && <span className="ml-2 text-sm font-semibold text-gray-500">{stars}/5</span>}
      </div>

      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        rows={2}
        placeholder="Nhận xét thêm (tùy chọn)…"
        className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus-ms resize-none mb-3"
      />

      <button onClick={handleSubmit} disabled={saving}
        className="px-5 py-2.5 gradient-brand text-white text-sm font-bold rounded-xl hover:opacity-90 transition-opacity disabled:opacity-60">
        {saving ? "Đang gửi…" : saved ? "Cập nhật đánh giá" : "Gửi đánh giá"}
      </button>
    </div>
  );
}

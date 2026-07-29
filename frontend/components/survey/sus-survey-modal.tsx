"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useLanguage } from "@/providers/language-provider";
import {
  getSurveyEligibility,
  submitSystemSurvey,
  dismissSystemSurvey,
} from "@/services/survey.service";

const ITEM_COUNT = 10;
const QUESTIONS = Array.from({ length: ITEM_COUNT }, (_, i) => `sus.q${i + 1}`);

/**
 * One-time System Usability Scale survey.
 *
 * Mounted on the dashboard, but only renders once the server says this user is
 * eligible (enough reports, never asked before). Skipping is recorded server
 * side, so "Để sau" means never again rather than "next page load" — nagging a
 * paying customer costs more than the extra response is worth.
 */
export function SusSurveyModal() {
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  const [answers, setAnswers] = useState<(number | null)[]>(Array(ITEM_COUNT).fill(null));
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getSurveyEligibility()
      .then((r) => {
        if (!cancelled && r.eligible) setOpen(true);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  if (!open) return null;

  const answered = answers.filter((a) => a !== null).length;

  const handleSkip = async () => {
    setOpen(false);
    // Fire-and-forget: the modal is already gone, and a failed dismissal only
    // means the user gets asked once more rather than losing anything.
    dismissSystemSurvey().catch(() => {});
  };

  const handleSubmit = async () => {
    if (answered < ITEM_COUNT) {
      toast.error(t("sus.incomplete"));
      return;
    }
    setSubmitting(true);
    try {
      await submitSystemSurvey(answers as number[], comment.trim() || null);
      toast.success(t("sus.thanks"));
      setOpen(false);
    } catch {
      toast.error(t("sus.error"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-8">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-full overflow-y-auto p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-1">{t("sus.title")}</h3>
        <p className="text-sm text-gray-500 mb-5">{t("sus.subtitle")}</p>

        <div className="space-y-5 mb-5">
          {QUESTIONS.map((key, i) => (
            <div key={key}>
              <p className="text-sm text-gray-800 mb-2">
                <span className="font-semibold text-gray-400 mr-1.5">{i + 1}.</span>
                {t(key)}
              </p>
              <div className="flex items-center gap-2">
                <span className="hidden sm:block text-[10px] text-gray-400 w-24 shrink-0">
                  {t("sus.scaleLow")}
                </span>
                <div className="flex gap-1.5">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button
                      key={n}
                      type="button"
                      aria-label={`${i + 1}: ${n}`}
                      aria-pressed={answers[i] === n}
                      onClick={() =>
                        setAnswers((prev) => prev.map((a, idx) => (idx === i ? n : a)))
                      }
                      className={`w-9 h-9 rounded-lg border text-sm font-semibold transition-colors ${
                        answers[i] === n
                          ? "bg-[#059669] border-[#059669] text-white"
                          : "bg-white border-gray-200 text-gray-500 hover:border-[#059669] hover:text-[#059669]"
                      }`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
                <span className="hidden sm:block text-[10px] text-gray-400 w-24 shrink-0 text-right">
                  {t("sus.scaleHigh")}
                </span>
              </div>
            </div>
          ))}
        </div>

        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          rows={2}
          placeholder={t("sus.comment")}
          className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus-ms resize-none mb-4"
        />

        <div className="flex items-center gap-3">
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="flex-1 py-3 gradient-brand text-white font-bold rounded-xl hover:opacity-90 text-sm disabled:opacity-60"
          >
            {submitting ? t("sus.submitting") : t("sus.submit")}
          </button>
          <button
            onClick={handleSkip}
            disabled={submitting}
            className="px-5 py-3 border border-gray-200 text-gray-600 font-semibold rounded-xl hover:bg-gray-50 text-sm"
          >
            {t("sus.skip")}
          </button>
          <span className="text-xs text-gray-400 shrink-0">
            {t("sus.progress", { done: answered })}
          </span>
        </div>
      </div>
    </div>
  );
}

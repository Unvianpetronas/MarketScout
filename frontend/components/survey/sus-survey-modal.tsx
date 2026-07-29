"use client";

import { useEffect, useState } from "react";
import { Globe } from "lucide-react";
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
 *
 * Carries its own language toggle: a respondent who misreads a question gives a
 * wrong answer, and half the items are negatively worded, so a misread doesn't
 * just add noise — it pushes the score in the opposite direction.
 */
export function SusSurveyModal() {
  const { t, lang, toggle } = useLanguage();
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
  const complete = answered === ITEM_COUNT;

  const handleSkip = () => {
    setOpen(false);
    // Fire-and-forget: the modal is already gone, and a failed dismissal only
    // means the user gets asked once more rather than losing anything.
    dismissSystemSurvey().catch(() => {});
  };

  const handleSubmit = async () => {
    if (!complete) {
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
    <div className="fixed inset-0 z-50 overflow-y-auto bg-[#faf9f6]">
      <div className="max-w-2xl mx-auto px-6 py-10">

        {/* ── Language toggle ── */}
        <div className="flex justify-end mb-6">
          <button
            onClick={toggle}
            title={t("lang.switchTo")}
            className="flex items-center gap-1.5 px-3 py-2 text-sm text-gray-600 hover:text-gray-900 border border-gray-200 bg-white rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Globe className="w-4 h-4" />
            <span className="font-medium">{lang === "vi" ? "VI" : "EN"}</span>
          </button>
        </div>

        {/* ── Header ── */}
        <div className="text-center mb-8">
          <p className="text-xs font-bold text-[#059669] uppercase tracking-widest mb-3">
            {t("sus.eyebrow")}
          </p>
          <h2 className="font-display text-4xl font-extrabold text-gray-900 mb-4 leading-tight">
            {t("sus.title")}
          </h2>
          <p className="text-base text-gray-500 leading-relaxed max-w-lg mx-auto mb-5">
            {t("sus.subtitle")}
          </p>
          <span className="inline-block text-sm text-gray-500 bg-gray-100 rounded-full px-4 py-2">
            {t("sus.duration")}
          </span>
        </div>

        {/* ── Progress ── Sticky so the remaining count stays visible while
            scrolling through ten cards. */}
        <div className="sticky top-0 z-10 bg-[#faf9f6] pt-2 pb-4 mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-bold text-gray-900">{t("sus.progressLabel")}</span>
            <span className="text-sm text-gray-500">{t("sus.progress", { done: answered })}</span>
          </div>
          <div className="h-1.5 rounded-full bg-gray-200 overflow-hidden">
            <div
              className="h-full rounded-full bg-[#059669] transition-all duration-300"
              style={{ width: `${(answered / ITEM_COUNT) * 100}%` }}
            />
          </div>
        </div>

        {/* ── Questions ── */}
        <div className="space-y-4 mb-6">
          {QUESTIONS.map((key, i) => (
            <div
              key={key}
              className="bg-white rounded-2xl border border-[rgba(16,22,43,0.06)] p-6 shadow-[0_2px_20px_rgba(16,22,43,0.03)]"
            >
              <div className="flex items-start gap-4">
                <span
                  className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold shrink-0 transition-colors ${
                    answers[i] !== null
                      ? "bg-[#059669] text-white"
                      : "bg-[#E7F6EF] text-[#059669]"
                  }`}
                >
                  {i + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-[15px] font-bold text-gray-900 leading-snug mb-5">{t(key)}</p>
                  <div className="flex items-center justify-between gap-3">
                    <span className="hidden sm:block text-[13px] text-gray-400 shrink-0">
                      {t("sus.scaleLow")}
                    </span>
                    <div className="flex gap-2 sm:gap-3 mx-auto">
                      {[1, 2, 3, 4, 5].map((n) => (
                        <button
                          key={n}
                          type="button"
                          aria-label={`${i + 1}: ${n}`}
                          aria-pressed={answers[i] === n}
                          onClick={() =>
                            setAnswers((prev) => prev.map((a, idx) => (idx === i ? n : a)))
                          }
                          className={`w-11 h-11 rounded-full border text-sm font-semibold transition-colors ${
                            answers[i] === n
                              ? "bg-[#059669] border-[#059669] text-white"
                              : "bg-white border-gray-200 text-gray-600 hover:border-[#059669] hover:text-[#059669]"
                          }`}
                        >
                          {n}
                        </button>
                      ))}
                    </div>
                    <span className="hidden sm:block text-[13px] text-gray-400 shrink-0">
                      {t("sus.scaleHigh")}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* ── Comment ── */}
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          rows={3}
          placeholder={t("sus.comment")}
          className="w-full px-4 py-3 border border-gray-200 rounded-2xl bg-white text-sm focus-ms resize-none mb-5"
        />

        {/* ── Actions ── */}
        <div className="flex items-center gap-3 pb-4">
          <button
            onClick={handleSubmit}
            disabled={submitting || !complete}
            className="flex-1 py-3.5 gradient-brand text-white font-bold rounded-xl hover:opacity-90 text-sm disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
          >
            {submitting ? t("sus.submitting") : t("sus.submit")}
          </button>
          <button
            onClick={handleSkip}
            disabled={submitting}
            className="px-6 py-3.5 border border-gray-200 bg-white text-gray-600 font-semibold rounded-xl hover:bg-gray-50 text-sm"
          >
            {t("sus.skip")}
          </button>
        </div>
        <p className="text-center text-xs text-gray-400 pb-8">{t("sus.askedOnce")}</p>

      </div>
    </div>
  );
}

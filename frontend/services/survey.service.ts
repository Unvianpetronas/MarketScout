import { api } from "@/lib/api";

export interface SurveyEligibility {
  eligible: boolean;
  reportsNeeded: number;
}

export const getSurveyEligibility = () =>
  api.get<SurveyEligibility>("/system-survey/eligibility").then((r) => r.data);

/** @param answers exactly 10 SUS responses, each 1–5, in question order. */
export const submitSystemSurvey = (answers: number[], comment: string | null) =>
  api.post<{ score: number }>("/system-survey", { answers, comment }).then((r) => r.data);

/** Records the skip so the survey is never shown to this user again. */
export const dismissSystemSurvey = () => api.post("/system-survey/dismiss").then((r) => r.data);

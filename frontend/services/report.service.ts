import { api } from "@/lib/api";
import {
  VerificationReport,
  ReportListItem,
  ReportStatusResponse,
  ReportRecommendations,
  SelfReportDealInfoRequest,
} from "@/types/report";

export const getReports = async (): Promise<ReportListItem[]> => {
  const response = await api.get<ReportListItem[]>("/reports");
  return response.data;
};

export const getReport = async (id: string): Promise<VerificationReport> => {
  const response = await api.get<VerificationReport>(`/reports/${id}`);
  return response.data;
};

export const getReportStatus = async (id: string): Promise<ReportStatusResponse> => {
  const response = await api.get<ReportStatusResponse>(`/reports/${id}/status`);
  return response.data;
};

// AI next-step recommendations (what to do / provide / verify) for a report.
export const getReportRecommendations = async (id: string): Promise<ReportRecommendations> => {
  const response = await api.get<ReportRecommendations>(`/reports/${id}/recommendations`);
  return response.data;
};

// Self-reported deal info — always reference-only, never affects scoring.
export const patchDealInfo = async (
  reportId: string,
  body: SelfReportDealInfoRequest
): Promise<VerificationReport> => {
  const response = await api.patch<VerificationReport>(`/reports/${reportId}/deal-info`, body);
  return response.data;
};

// Quick scan via the pipeline: sessionId + leadIndex identify the lead from a Find Partners chat result
export const quickScan = async (sessionId: string, leadIndex: number): Promise<ReportListItem> => {
  const response = await api.post<ReportListItem>(
    `/reports/quick-scan`,
    null,
    { params: { sessionId, leadIndex } }
  );
  return response.data;
};

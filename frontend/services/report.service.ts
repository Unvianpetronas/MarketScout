import { api } from "@/lib/api";
import {
  VerificationReport,
  ReportListItem,
  ReportStatusResponse,
  ReportRecommendations,
  SelfReportDealInfoRequest,
  FlagReportRequest,
  FlagReportResponse,
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

// Downloads the report as a PDF and triggers a browser save — filename comes
// from the backend's Content-Disposition header.
export const exportReportPdf = async (id: string): Promise<void> => {
  const response = await api.get(`/reports/${id}/export`, { responseType: "blob" });
  const disposition: string = response.headers["content-disposition"] || "";
  const match = disposition.match(/filename\*?=(?:UTF-8'')?"?([^;"]+)"?/i);
  const filename = match ? decodeURIComponent(match[1]) : `report-${id.slice(0, 8)}.pdf`;

  const url = window.URL.createObjectURL(new Blob([response.data], { type: "application/pdf" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
};

// "Báo kết quả sai" — owner-only, opens a flag for admin review. Never
// touches scoring itself.
export const flagReport = async (id: string, body: FlagReportRequest): Promise<FlagReportResponse> => {
  const response = await api.post<FlagReportResponse>(`/reports/${id}/flag`, body);
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

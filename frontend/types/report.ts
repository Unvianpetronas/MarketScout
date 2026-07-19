// Matches ScoringRubric.getRiskLevel() on the backend exactly — it returns
// these Vietnamese strings directly, not an enum.
export type RiskLevel = "Thấp" | "Trung bình" | "Cao" | "Nghiêm trọng";

// Matches Report.status on the backend exactly (see Report.java's comment:
// PENDING | QUICK_SCANNING | DEEP_SCANNING | DONE | HARD_STOP | FAILED).
export type ReportStatus = "PENDING" | "QUICK_SCANNING" | "DEEP_SCANNING" | "DONE" | "HARD_STOP" | "FAILED";

/** True while the pipeline is still running (any pre-terminal status). */
export function isProcessingStatus(status?: string | null): boolean {
  return status === "PENDING" || status === "QUICK_SCANNING" || status === "DEEP_SCANNING";
}

/** True once the report has a final result (success, sanctions hard-stop, or failure). */
export function isTerminalStatus(status?: string | null): boolean {
  return status === "DONE" || status === "HARD_STOP" || status === "FAILED";
}

export function isHighRiskLevel(riskLevel?: string | null): boolean {
  return riskLevel === "Cao" || riskLevel === "Nghiêm trọng";
}

// Backend returns findings/sourcesUsed as a single JSON string, not an array
export interface PillarResult {
  pillarNo: number;
  pillarName: string;
  score: number | null;
  status?: string;
  confidence?: string;
  findings?: string;       // raw JSON string from backend
  sourcesUsed?: string;    // raw JSON string from backend
  evidences?: Evidence[];
}

// Matches backend Evidence: { type: PASS|WARN|FAIL, text, source }
export interface Evidence {
  type?: string;
  text?: string;
  source?: string;
}

export interface VerificationReport {
  id: string;
  entityName: string;
  countryIso2?: string;
  overallScore: number;
  riskLevel: RiskLevel;
  hardStop: boolean;
  status?: ReportStatus;
  source?: string;
  quickScanDone?: boolean;
  website?: string;
  taxId?: string;
  lei?: string;
  pillars?: PillarResult[];
  dealSafetyAnalysis?: string;  // raw JSON string from backend
  createdAt?: string;
  updatedAt?: string;

  // Self-reported "Thông tin giao dịch" — reference only, never scored.
  selfReportPaymentMethodSafety?: "SAFE" | "MODERATE" | "RISKY" | null;
  selfReportDepositPercentage?: number | null;
  selfReportDealValueUsd?: number | null;
  selfReportHasWrittenContract?: boolean | null;
  // Set only when a contract has been uploaded and cross-check-verified — this is what actually moves P7's score.
  p7VerifiedContractId?: string | null;

  // True once an admin has corrected this report — overallScore/riskLevel/
  // hardStop above already reflect the correction, never the raw AI output.
  corrected?: boolean;
  correctionNote?: string | null;
  correctedAt?: string | null;
}

export type FlagReason = "WRONG_SCORE" | "WRONG_INFO" | "SANCTIONS_FALSE_POSITIVE" | "OTHER";

export interface FlagReportRequest {
  reason: FlagReason;
  note?: string;
}

export interface FlagReportResponse {
  id: string;
  reportId: string;
  reason: FlagReason;
  note: string | null;
  status: "open" | "resolved" | "dismissed";
  createdAt: string;
}

export interface SelfReportDealInfoRequest {
  paymentMethodSafety?: "SAFE" | "MODERATE" | "RISKY" | null;
  depositPercentage?: number | null;
  dealValueUsd?: number | null;
  hasWrittenContract?: boolean | null;
}

// AI next-step recommendations for a report (what to do / provide / verify).
export interface ReportRecommendations {
  summary?: string;
  actionItems?: string[];
  infoToProvide?: string[];
  infoToVerify?: string[];
}

export interface ReportListItem {
  id: string;
  entityName: string;
  countryIso2?: string;
  overallScore: number;
  riskLevel: RiskLevel;
  hardStop: boolean;
  status: ReportStatus;
  source?: string;
  quickScanDone?: boolean;
  createdAt: string;
  updatedAt?: string;
  corrected?: boolean;
  correctionNote?: string | null;
}

export interface ReportStatusResponse {
  id: string;
  status: ReportStatus;
  overallScore: number;
  riskLevel: RiskLevel;
  hardStop: boolean;
}

export interface DeepVerifyRequest {
  entityName: string;
  countryIso2: string;
}

export interface DeepVerifyResponse {
  verificationId: string;
  status: string;
}

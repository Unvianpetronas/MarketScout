export type RiskLevel = "LOW" | "MEDIUM" | "HIGH";

export type ReportStatus = "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED";

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

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

export interface Evidence {
  source: string;
  snippet?: string;
  url?: string;
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

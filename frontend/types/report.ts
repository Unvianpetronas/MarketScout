export type RiskLevel =
  | "LOW"
  | "MEDIUM"
  | "HIGH";

export interface PillarResult {
  pillarNo: number;
  pillarName: string;
  score: number;
  maxScore: number;
  findings: string[];
  redFlags: string[];
  hardStop: boolean;
}

export interface VerificationReport {
  reportId: string;
  entityName: string;
  overallScore: number;
  riskLevel: RiskLevel;
  hardStop: boolean;
  pillarResults: PillarResult[];
}
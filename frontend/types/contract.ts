export type ExtractionStatus = "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED";

export type VerificationStatus = "PENDING" | "VERIFIED" | "MISMATCH" | "MANUALLY_EDITED";

// Matches backend ContractDTO.ExtractedField — value/confidence/sourceText
// for each README §2 field (incoterms, depositPercent, paymentMethod,
// hasArbitrationClause, signatoryName, signatoryTaxId).
export interface ExtractedField {
  value: string | number | boolean | null;
  confidence: number | null;
  sourceText: string | null;
}

export interface ContractSummary {
  id: string;
  fileName: string;
  uploadedAt: string;
  extractionStatus: ExtractionStatus;
  extractedData: Record<string, ExtractedField>;
}

export interface ContractDetail extends ContractSummary {
  fileSizeBytes?: number;
}

export interface LinkResponse {
  contractId: string;
  reportId: string;
  verificationStatus: VerificationStatus;
  matchDetails: Record<string, unknown>;
  newOverallScore: number;
  newP7Score: number | null;
}

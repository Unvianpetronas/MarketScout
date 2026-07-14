export type ExtractionStatus = "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED";

export type VerificationStatus = "PENDING" | "VERIFIED" | "MISMATCH" | "MANUALLY_EDITED";

// Matches backend ContractDTO.ExtractedField — value/confidence/sourceText
// for each README §2 field (incoterms, depositPercent, paymentMethod,
// hasArbitrationClause, partyAName, partyATaxId, partyBName, partyBTaxId).
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

// One link attempt for a report — including MISMATCH ones, so the report page
// can tell "no contract attached" apart from "attached but didn't match".
export interface LinkSummary {
  contractId: string;
  fileName: string;
  verificationStatus: VerificationStatus;
  createdAt: string;
}

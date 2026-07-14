export interface LeadResult {
  companyName: string;
  website?: string;
  description?: string;
  source?: string;
  // Market the search was scoped to — not independently verified per company.
  country?: string;
  sanctionHit: boolean;
  sanctionNote?: string;
  // Real registry lookup (masothue.vn MST / GLEIF LEI) — absent if not found, never guessed.
  taxId?: string;
}

export type PartnerRole = "buyer" | "seller";

export interface PartnerSearchParams {
  q?: string;
  country?: string;
  role?: PartnerRole;
}

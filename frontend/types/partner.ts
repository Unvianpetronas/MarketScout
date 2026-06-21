export interface LeadResult {
  companyName: string;
  website?: string;
  description?: string;
  source?: string;
  country?: string;
  sanctionHit: boolean;
  sanctionNote?: string;
}

export type PartnerRole = "buyer" | "seller";

export interface PartnerSearchParams {
  q?: string;
  country?: string;
  role?: PartnerRole;
}

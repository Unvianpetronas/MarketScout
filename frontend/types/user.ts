export interface User {
  id: string;
  email: string;
  fullName: string;
  companyName?: string;
  role: string;
  quotaRemaining: number;
  emailVerified: boolean;
  phone?: string;
  taxId?: string;
  planName?: string;
  // Deferred plan change — both unset when there's no pending change.
  pendingPlanName?: string | null;
  pendingPlanEffectiveAt?: string | null;
}

export interface MeResponse extends User {
  companyWebsite?: string;
  headquartersAddr?: string;
  industry?: string;
  annualRevenue?: string;
  businessDesc?: string;
  targetMarkets?: string;
  certifications?: string;
  theme?: string;
  language?: string;
  aiOptimization?: boolean;
}

export interface UpdateProfileRequest {
  fullName?: string;
  companyName?: string;
  phone?: string;
  taxId?: string;
  companyWebsite?: string;
  headquartersAddr?: string;
  industry?: string;
  annualRevenue?: string;
  businessDesc?: string;
  targetMarkets?: string;
  certifications?: string;
  theme?: string;
  language?: string;
  aiOptimization?: boolean;
}

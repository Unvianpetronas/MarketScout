export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  refreshToken: string;
  id: string;
  email: string;
  fullName: string;
  role: string;
  quotaRemaining: number;
  phone?: string;
  taxId?: string;
  companyName?: string;
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

export interface RegisterRequest {
  email: string;
  password: string;
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
}

export interface RegisterResponse {
  message: string;
  email: string;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ResetPasswordRequest {
  token: string;
  newPassword: string;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface RefreshTokenResponse {
  token: string;
  refreshToken: string;
}

export interface ResendVerificationRequest {
  email: string;
}

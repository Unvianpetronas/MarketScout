import { api } from "@/lib/api";
import {
  LoginRequest,
  LoginResponse,
  RegisterRequest,
  RegisterResponse,
  ForgotPasswordRequest,
  ResetPasswordRequest,
  ChangePasswordRequest,
  RefreshTokenRequest,
  RefreshTokenResponse,
  ResendVerificationRequest,
} from "@/types/auth";
import { MeResponse, UpdateProfileRequest } from "@/types/user";

export const login = async (data: LoginRequest): Promise<LoginResponse> => {
  const response = await api.post<LoginResponse>("/auth/login", data);
  return response.data;
};

export const register = async (data: RegisterRequest): Promise<RegisterResponse> => {
  const response = await api.post<RegisterResponse>("/auth/users", data);
  return response.data;
};

export const logout = async (): Promise<void> => {
  const refreshToken = typeof window !== "undefined" ? localStorage.getItem("refresh_token") : null;
  await api.post("/auth/logout", refreshToken ? { refreshToken } : undefined);
};

export const refreshToken = async (data: RefreshTokenRequest): Promise<RefreshTokenResponse> => {
  const response = await api.post<RefreshTokenResponse>("/auth/refresh", data);
  return response.data;
};

export const getMe = async (): Promise<MeResponse> => {
  const response = await api.get<MeResponse>("/auth/me");
  return response.data;
};

export const updateProfile = async (data: UpdateProfileRequest): Promise<MeResponse> => {
  const response = await api.put<MeResponse>("/auth/me", data);
  return response.data;
};

export const forgotPassword = async (data: ForgotPasswordRequest): Promise<{ message: string }> => {
  const response = await api.post("/auth/forgot-password", data);
  return response.data;
};

export const resetPassword = async (data: ResetPasswordRequest): Promise<{ message: string }> => {
  const response = await api.post("/auth/reset-password", data);
  return response.data;
};

export const changePassword = async (data: ChangePasswordRequest): Promise<{ message: string }> => {
  const response = await api.post("/auth/change-password", data);
  return response.data;
};

export const resendVerification = async (data: ResendVerificationRequest): Promise<{ message: string }> => {
  const response = await api.post("/auth/resend-verification", data);
  return response.data;
};

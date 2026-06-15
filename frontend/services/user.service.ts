import { api } from "@/lib/api";
import { MeResponse, UpdateProfileRequest } from "@/types/user";

export const getMe = async (): Promise<MeResponse> => {
  const response = await api.get<MeResponse>("/auth/me");
  return response.data;
};

export const updateProfile = async (data: UpdateProfileRequest): Promise<MeResponse> => {
  const response = await api.put<MeResponse>("/auth/me", data);
  return response.data;
};

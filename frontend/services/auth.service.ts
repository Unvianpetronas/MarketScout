import { api } from "@/lib/api";
import { LoginRequest } from "@/types/auth";

export const login = async (
  data: LoginRequest
) => {
  const response = await api.post(
    "/auth/login",
    data
  );

  return response.data;
};
import { api } from "@/lib/api";

export const startVerification = async (
  data: DeepVerifyRequest
) => {
  const response = await api.post(
    "/reports/deep-verify",
    data
  );

  return response.data;
};
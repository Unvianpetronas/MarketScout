import { api } from "@/lib/api";
import { QuotaStatus } from "@/types/quota";

export const getMyQuota = async (): Promise<QuotaStatus> => {
  const response = await api.get<QuotaStatus>("/quota/me");
  return response.data;
};

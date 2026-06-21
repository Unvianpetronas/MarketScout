import { api } from "@/lib/api";
import { LeadResult, PartnerSearchParams } from "@/types/partner";

export const searchPartners = async (params: PartnerSearchParams): Promise<LeadResult[]> => {
  const response = await api.get<LeadResult[]>("/partners/search", { params });
  return response.data;
};

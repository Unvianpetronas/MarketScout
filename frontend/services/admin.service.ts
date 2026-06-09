import { api } from "@/lib/api";

export interface QuotaResponse {
  userId: string;
  quotaRemaining: number;
  message: string;
}

// PATCH /api/v1/admin/users/{id}/quota — set exact quota value
export const setUserQuota = async (userId: string, quota: number): Promise<QuotaResponse> => {
  const response = await api.patch<QuotaResponse>(`/admin/users/${userId}/quota`, { quota });
  return response.data;
};

// POST /api/v1/admin/users/{id}/quota/refund — refund 1 quota (no body needed)
export const refundUserQuota = async (userId: string): Promise<QuotaResponse> => {
  const response = await api.post<QuotaResponse>(`/admin/users/${userId}/quota/refund`);
  return response.data;
};

// NOTE: GET /admin/users does not exist in the backend yet.
// The admin customers page uses mock data until the backend adds this endpoint.

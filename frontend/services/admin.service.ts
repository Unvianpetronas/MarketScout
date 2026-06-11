import { api } from "@/lib/api";

export interface QuotaResponse {
  userId: string;
  quotaRemaining: number;
  message: string;
}

export interface AdminUser {
  id: string;
  email: string;
  fullName: string;
  role: string;
  planName: string;
  quotaRemaining: number;
  quotaUsed: number;
  monthlyQuota: number;
  isActive: boolean;
  emailVerified: boolean;
  createdAt: string;
}

export interface AdminUsersResponse {
  users: AdminUser[];
  total: number;
  page: number;
  size: number;
}

// GET /api/v1/admin/users — list all users (paginated, searchable)
export const getAdminUsers = async (
  page = 0,
  size = 20,
  search = ""
): Promise<AdminUsersResponse> => {
  const response = await api.get<AdminUsersResponse>("/admin/users", {
    params: { page, size, search },
  });
  return response.data;
};

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

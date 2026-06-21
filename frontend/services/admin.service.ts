import { api } from "@/lib/api";

// ── Shared ────────────────────────────────────────────────────────────────
export interface AdminUser {
  id: string;
  email: string;
  fullName: string;
  role: string;
  planName: string;
  monthlyQuota: number;
  quotaRemaining: number;
  quotaUsed: number;
  isActive: boolean;
  emailVerified: boolean;
  createdAt: string;
  lastLoginAt: string | null;
}

export interface QuotaResponse {
  userId: string;
  quotaRemaining: number;
  message: string;
}

export interface AdminUsersResponse {
  users: AdminUser[];
  total: number;
  page: number;
  size: number;
}

// ── Analytics ─────────────────────────────────────────────────────────────
export interface TopCompany { name: string; count: number; }
export interface AnalyticsOverview {
  totalUsers: number;
  activeUsers: number;
  newUsersThisMonth: number;
  newUsersLastMonth: number;
  totalReports: number;
  reportsThisMonth: number;
  reportsLastMonth: number;
  reportsByStatus: Record<string, number>;
  reportsByRiskLevel: Record<string, number>;
  topCompanies: TopCompany[];
  usersByPlan: Record<string, number>;
  totalJobs: number;
  failedJobs: number;
  runningJobs: number;
  openAlerts: number;
}

// ── Reports ───────────────────────────────────────────────────────────────
export interface ReportSummary {
  id: string;
  entityName: string;
  countryIso2: string | null;
  tier: string;
  status: string;
  riskLevel: string | null;
  overallScore: number | null;
  hardStop: boolean;
  source: string;
  website: string | null;
  taxId: string | null;
  userEmail: string | null;
  userId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PillarDTO {
  id: string;
  pillarNo: number;
  pillarName: string | null;
  score: number | null;
  status: string | null;
  confidence: string | null;
  findings: string | null;
  latencyMs: number | null;
}

export interface ReportDetail {
  report: ReportSummary;
  pillars: PillarDTO[];
}

export interface ReportsResponse {
  reports: ReportSummary[];
  total: number;
  page: number;
  size: number;
  totalPages: number;
}

// ── Jobs ──────────────────────────────────────────────────────────────────
export interface JobSummary {
  id: string;
  status: string;
  currentPillar: number | null;
  attemptCount: number;
  errorMessage: string | null;
  startedAt: string | null;
  completedAt: string | null;
  updatedAt: string;
}

export interface JobsResponse {
  jobs: JobSummary[];
  total: number;
  page: number;
  size: number;
}

// ── Audit logs ────────────────────────────────────────────────────────────
export interface AuditLogEntry {
  id: string;
  actorEmail: string;
  action: string;
  targetType: string | null;
  targetId: string | null;
  ipAddress: string | null;
  createdAt: string;
}

export interface AuditLogsResponse {
  logs: AuditLogEntry[];
  total: number;
  page: number;
  size: number;
}

// ── Alerts ────────────────────────────────────────────────────────────────
export interface AlertEntry {
  id: string;
  alertType: string;
  severity: string;
  message: string;
  isResolved: boolean;
  createdAt: string;
  resolvedAt: string | null;
}

// ── Plans ─────────────────────────────────────────────────────────────────
export interface PlanDTO {
  id: number;
  name: string;
  billingCycle: string;
  priceUsd: number | null;
  priceVnd: number | null;
  monthlyQuota: number;
  features: string | null;
  isActive: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════
// API CALLS
// ═══════════════════════════════════════════════════════════════════════════

export const getAnalyticsOverview = () =>
  api.get<AnalyticsOverview>("/admin/analytics/overview").then(r => r.data);

export const getAdminUsers = (page = 0, size = 20, search = "") =>
  api.get<AdminUsersResponse>("/admin/users", { params: { page, size, search } }).then(r => r.data);

export const getUserDetail = (id: string) =>
  api.get<AdminUser>(`/admin/users/${id}`).then(r => r.data);

export const toggleUserActive = (id: string, active: boolean) =>
  api.patch(`/admin/users/${id}/active`, { active }).then(r => r.data);

export const changeUserRole = (id: string, role: string) =>
  api.patch(`/admin/users/${id}/role`, { role }).then(r => r.data);

export const setUserQuota = (userId: string, quota: number) =>
  api.patch<QuotaResponse>(`/admin/users/${userId}/quota`, { quota }).then(r => r.data);

export const refundUserQuota = (userId: string) =>
  api.post<QuotaResponse>(`/admin/users/${userId}/quota/refund`).then(r => r.data);

export const getAdminReports = (params: {
  page?: number; size?: number;
  entityName?: string; status?: string;
  riskLevel?: string; userId?: string;
}) => api.get<ReportsResponse>("/admin/reports", { params }).then(r => r.data);

export const getReportDetail = (id: string) =>
  api.get<ReportDetail>(`/admin/reports/${id}`).then(r => r.data);

export const deleteReport = (id: string) =>
  api.delete(`/admin/reports/${id}`).then(r => r.data);

export const retryReport = (id: string) =>
  api.post(`/admin/reports/${id}/retry`).then(r => r.data);

export const getAdminJobs = (page = 0, size = 20, status?: string) =>
  api.get<JobsResponse>("/admin/jobs", { params: { page, size, status } }).then(r => r.data);

export const retryJob = (id: string) =>
  api.post(`/admin/jobs/${id}/retry`).then(r => r.data);

export const getAuditLogs = (page = 0, size = 30) =>
  api.get<AuditLogsResponse>("/admin/audit-logs", { params: { page, size } }).then(r => r.data);

export const getAlerts = (unresolvedOnly = false) =>
  api.get<{ alerts: AlertEntry[]; total: number }>("/admin/alerts", { params: { unresolvedOnly } }).then(r => r.data);

export const resolveAlert = (id: string) =>
  api.patch(`/admin/alerts/${id}/resolve`).then(r => r.data);

export const getPlans = () =>
  api.get<PlanDTO[]>("/admin/plans").then(r => r.data);

export const updatePlan = (id: number, data: Partial<Pick<PlanDTO, "monthlyQuota" | "priceVnd" | "priceUsd" | "features" | "isActive">>) =>
  api.patch<PlanDTO>(`/admin/plans/${id}`, data).then(r => r.data);

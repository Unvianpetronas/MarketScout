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
export interface MonthlyCount { label: string; count: number; }
export interface CountryCount { code: string; count: number; }
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
  reportsOverTime: MonthlyCount[];
  reportsByCountry: CountryCount[];
}

// ── Revenue ───────────────────────────────────────────────────────────────
export interface MonthlyRevenue { label: string; amount: number; }
export interface NamedAmount { name: string; amount: number; }
export interface TopPayer { name: string; email: string; amount: number; plan: string; }
export interface RecentTx {
  customer: string; email: string; plan: string;
  amount: number; provider: string; status: string; date: string;
}
export interface RevenueAnalytics {
  revenueThisMonth: number;
  revenueLastMonth: number;
  revenueThisYear: number;
  revenueAllTime: number;
  pendingFailedAmount: number;
  completedCountThisMonth: number;
  failedCountThisMonth: number;
  pendingCountThisMonth: number;
  payingUsers: number;
  totalUsers: number;
  revenueOverTime: MonthlyRevenue[];
  revenueByPlan: NamedAmount[];
  revenueByProvider: NamedAmount[];
  topPayers: TopPayer[];
  recentTransactions: RecentTx[];
}

// ── System evaluation ───────────────────────────────────────────────────────
export interface Bucket { label: string; count: number; }
export interface RatingEntry {
  stars: number;
  comment: string | null;
  reportEntity: string;
  userEmail: string;
  createdAt: string;
}
export interface EvaluationAnalytics {
  totalReports: number;
  overriddenCount: number;
  flaggedTotal: number;
  flagsOpen: number;
  flagsResolved: number;
  flagsDismissed: number;
  sanctionsFalsePositive: number;
  accuracyPct: number;
  overrideRatePct: number;
  flagRatePct: number;
  avgStars: number | null;
  ratingCount: number;
  starDistribution: Bucket[];
  confidenceDistribution: Bucket[];
  flagsByReason: Bucket[];
  recentRatings: RatingEntry[];
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
  overrideScore: number | null;
  overrideRiskLevel: string | null;
  overrideHardStop: boolean | null;
  overrideNote: string | null;
  overriddenByEmail: string | null;
  overriddenAt: string | null;
}

export interface ReportOverrideRequest {
  overrideScore?: number | null;
  overrideRiskLevel?: string | null;
  overrideHardStop?: boolean | null;
  note: string;
  clear: boolean;
}

export interface ReportFlagDTO {
  id: string;
  reportId: string;
  reportEntityName: string;
  userId: string;
  userEmail: string;
  reason: string;
  note: string | null;
  status: "open" | "resolved" | "dismissed";
  resolvedByEmail: string | null;
  resolvedAt: string | null;
  createdAt: string;
}

export interface ReportFlagsResponse {
  flags: ReportFlagDTO[];
  total: number;
  page: number;
  size: number;
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

// ── Payment settings ────────────────────────────────────────────────────────
export interface PaymentSettingsDTO {
  pricePerCreditVnd: number;
  updatedAt: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// API CALLS
// ═══════════════════════════════════════════════════════════════════════════

export const getAnalyticsOverview = () =>
  api.get<AnalyticsOverview>("/admin/analytics/overview").then(r => r.data);

export const getRevenueAnalytics = () =>
  api.get<RevenueAnalytics>("/admin/analytics/revenue").then(r => r.data);

export interface TransactionPage { items: RecentTx[]; total: number; }

/** Full transaction history — the dashboard card only shows the latest 8. */
export const getTransactionPage = (page = 0, size = 25) =>
  api.get<TransactionPage>("/admin/analytics/transactions", { params: { page, size } })
    .then(r => r.data);

/**
 * Downloads the revenue report as .xlsx. The workbook is built server-side so
 * it covers every transaction, not just the page currently loaded, and so no
 * spreadsheet library has to ship to the browser.
 */
export async function downloadRevenueReport(): Promise<void> {
  const res = await api.get("/admin/analytics/revenue/export", { responseType: "blob" });

  // Prefer the filename the server chose; fall back to a dated one.
  const disposition = res.headers["content-disposition"] as string | undefined;
  const match = disposition?.match(/filename\*?=(?:UTF-8'')?"?([^";]+)"?/i);
  const filename = match ? decodeURIComponent(match[1])
    : `marketscout-doanh-thu-${new Date().toISOString().slice(0, 10)}.xlsx`;

  const url = URL.createObjectURL(res.data as Blob);
  try {
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
  } finally {
    // Revoking immediately can cancel the download in some browsers.
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
  }
}

export const getEvaluationAnalytics = () =>
  api.get<EvaluationAnalytics>("/admin/analytics/evaluation").then(r => r.data);

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

export const overrideReport = (id: string, body: ReportOverrideRequest) =>
  api.patch<ReportSummary>(`/admin/reports/${id}/override`, body).then(r => r.data);

export const getReportFlags = (page = 0, size = 20, status?: string, reportId?: string) =>
  api.get<ReportFlagsResponse>("/admin/report-flags", { params: { page, size, status, reportId } }).then(r => r.data);

export const resolveReportFlag = (id: string, status: "resolved" | "dismissed", resolutionNote?: string) =>
  api.patch<ReportFlagDTO>(`/admin/report-flags/${id}`, { status, resolutionNote }).then(r => r.data);

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

export const getPaymentSettings = () =>
  api.get<PaymentSettingsDTO>("/admin/payment-settings").then(r => r.data);

export const updatePaymentSettings = (pricePerCreditVnd: number) =>
  api.patch<PaymentSettingsDTO>("/admin/payment-settings", { pricePerCreditVnd }).then(r => r.data);

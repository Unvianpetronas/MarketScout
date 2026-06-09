export interface QuotaStatus {
  quotaRemaining: number;
  quotaUsedThisCycle: number;
  monthlyQuota: number;
  planName: string;
  cycleResetAt: string;
}

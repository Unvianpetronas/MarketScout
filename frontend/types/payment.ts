export type TopupStatus = "pending" | "paid" | "expired";

export interface TopupRequest {
  quantity: number;
}

export interface TopupResponse {
  invoiceId: string;
  quantity: number;
  amountVnd: number;
  qrUrl: string;
  transferContent: string;
  bankCode: string;
  accountNo: string;
  accountName: string;
  status: TopupStatus;
  // Backend may serialize Instant as ISO string or epoch number — parse defensively.
  expiresAt: string | number;
}

export interface TopupStatusResponse {
  invoiceId: string;
  status: TopupStatus;
  quotaRemaining: number;
}

/** Admin-editable plan, fetched live from the backend `plans` table. */
export interface PublicPlan {
  id: number;
  name: string;
  billingCycle: string;
  priceVnd: number;
  priceUsd: number;
  monthlyQuota: number;
}

export interface InvoiceSummary {
  invoiceId: string;
  invoiceNo: string;
  status: string;
  totalVnd: number;
  paidAt: string | number | null;
  createdAt: string | number;
  itemLabel: string;
}

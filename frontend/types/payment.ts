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

/** Price of a single verification credit, in VND. Mirrors backend config. */
export const PRICE_PER_CREDIT_VND = 200_000;

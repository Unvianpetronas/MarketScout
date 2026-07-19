import { api } from "@/lib/api";
import { InvoiceSummary, PublicPlan, TopupRequest, TopupResponse, TopupStatusResponse } from "@/types/payment";

/** Public pricing — active plans with live admin-configured prices. No auth required. */
export const getPublicPlans = async (): Promise<PublicPlan[]> => {
  const { data } = await api.get<PublicPlan[]>("/payments/plans");
  return data;
};

/** Public — current admin-configured price per quota credit. No auth required. */
export const getPricePerCredit = async (): Promise<number> => {
  const { data } = await api.get<{ pricePerCreditVnd: number }>("/payments/price-per-credit");
  return data.pricePerCreditVnd;
};

/** Creates a pending quota top-up and returns VietQR transfer instructions. */
export const createTopup = async (quantity: number): Promise<TopupResponse> => {
  const payload: TopupRequest = { quantity };
  const { data } = await api.post<TopupResponse>("/payments/topups", payload);
  return data;
};

/** Polls the payment state for a top-up invoice (owner-only on the backend). */
export const getTopupStatus = async (invoiceId: string): Promise<TopupStatusResponse> => {
  const { data } = await api.get<TopupStatusResponse>(`/payments/topups/${invoiceId}/status`);
  return data;
};

/** Creates a one-time VietQR checkout to buy a subscription plan (starter/pro). */
export const createPlanCheckout = async (plan: string): Promise<TopupResponse> => {
  const { data } = await api.post<TopupResponse>("/payments/plans", { plan });
  return data;
};

/** Real billing history for the authenticated user, newest first. */
export const getMyInvoices = async (): Promise<InvoiceSummary[]> => {
  const { data } = await api.get<InvoiceSummary[]>("/payments/invoices");
  return data;
};

export interface ChatSession {
  id: string;
  title: string;
  createdAt: string;
  updatedAt?: string;
}

// Matches backend MessageResponse
export interface ChatMessage {
  id: string;
  sessionId?: string;
  role: "user" | "assistant";
  content: string;
  modelUsed?: string;
  createdAt: string;
  // Populated client-side from the final SSE "done" event of a VERIFY_PARTNER
  // run — not persisted on the backend, so history reloads won't have these.
  reportId?: string;
  reportMeta?: {
    overallScore?: number;
    riskLevel?: string;
    hardStop?: boolean;
    taxId?: string;
  };
  // Populated client-side when this assistant message is asking the user to
  // confirm a Deep Verify / Compare run before quota gets spent (see
  // ChatService's confirm-before-run gate). Only meaningful on the latest message.
  pendingConfirm?: {
    quotaCost: number;
    quotaRemaining: number;
  };
  // Populated client-side when the company name was ambiguous and ChatService ran
  // a real web search for candidates (see ChatService.buildClarifyData) — lets the
  // user pick the actual company from a list instead of typing more details.
  candidates?: CompanyCandidate[];
}

export interface CompanyCandidate {
  companyName: string;
  website?: string;
  description?: string;
  source?: string;
  country?: string;
  taxId?: string;
}

// Matches backend ConversationResponse
export interface ConversationResponse {
  sessionId: string;
  title: string;
  messages: ChatMessage[];
}

// Used by the pipeline SSE endpoint POST /chat/message
export interface SseMessageRequest {
  message: string;
  sessionId: string;
  reportId?: string;
  // Self-reported "Thông tin giao dịch" (optional) — reference only, saved to
  // Report.selfReport* columns, never scored. Only contractId below (a
  // library contract picked/uploaded before the report exists) can move the
  // real P7 score, via cross-check right after the report is created.
  depositPercentage?: number;
  hasWrittenContract?: boolean;
  paymentMethodSafety?: "SAFE" | "MODERATE" | "RISKY";
  dealValueUsd?: number;
  contractId?: string;
  // true = this call confirms a pending VERIFY_PARTNER/COMPARE_PARTNERS request
  // (see ChatService's confirm-before-run gate) instead of a fresh message.
  confirmVerify?: boolean;
  // Optional — known company website, lets P2 skip its own auto-discovery search.
  website?: string;
}

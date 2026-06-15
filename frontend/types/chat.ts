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
}

// Matches backend ConversationResponse
export interface ConversationResponse {
  sessionId: string;
  title: string;
  messages: ChatMessage[];
}

// Matches backend ChatResponse { userMessage, assistantMessage }
export interface ChatPairResponse {
  userMessage: ChatMessage;
  assistantMessage: ChatMessage;
}

// Used by the pipeline SSE endpoint POST /chat/message
export interface SseMessageRequest {
  message: string;
  sessionId: string;
  reportId?: string;
}

// Used by per-session REST endpoint POST /chat/sessions/{id}/messages
export interface SendMessageRequest {
  content: string;  // backend field name is "content", not "message"
}

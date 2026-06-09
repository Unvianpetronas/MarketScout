import { api } from "@/lib/api";
import {
  ChatSession,
  ChatMessage,
  ConversationResponse,
  ChatPairResponse,
  SseMessageRequest,
  SendMessageRequest,
} from "@/types/chat";

// ── Sessions ──────────────────────────────────────────────────────────────────

export const createSession = async (title?: string): Promise<ChatSession> => {
  const response = await api.post<ChatSession>("/chat/sessions", { title });
  return response.data;
};

export const getSessions = async (): Promise<ChatSession[]> => {
  const response = await api.get<ChatSession[]>("/chat/sessions");
  return response.data;
};

export const deleteSession = async (id: string): Promise<void> => {
  await api.delete(`/chat/sessions/${id}`);
};

// ── Messages ──────────────────────────────────────────────────────────────────

/**
 * Get full conversation history for a session.
 * Backend returns ConversationResponse { sessionId, title, messages }.
 */
export const getSessionHistory = async (sessionId: string): Promise<ConversationResponse> => {
  const response = await api.get<ConversationResponse>(`/chat/sessions/${sessionId}/messages`);
  return response.data;
};

/**
 * Send a message to a specific session (non-streaming).
 * Backend field is "content", not "message".
 * Returns both user + assistant messages.
 */
export const sendMessage = async (
  sessionId: string,
  data: SendMessageRequest
): Promise<ChatPairResponse> => {
  const response = await api.post<ChatPairResponse>(
    `/chat/sessions/${sessionId}/messages`,
    data
  );
  return response.data;
};

// ── SSE Pipeline (POST + fetch ReadableStream) ────────────────────────────────

/**
 * Stream a message via the AI pipeline endpoint.
 * Backend: POST /chat/message — produces text/event-stream.
 * Native EventSource only supports GET, so we use fetch() + ReadableStream.
 */
export const streamPipelineMessage = (
  data: SseMessageRequest,
  onChunk: (chunk: string) => void,
  onDone: () => void,
  onError: (err: Error) => void
): AbortController => {
  const controller = new AbortController();
  const token = typeof window !== "undefined" ? localStorage.getItem("access_token") : null;
  const baseUrl = process.env.NEXT_PUBLIC_API_URL ?? "";

  fetch(`${baseUrl}/chat/message`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(data),
    signal: controller.signal,
  })
    .then(async (res) => {
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      if (!res.body) throw new Error("No response body");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        // SSE lines look like: "data: <payload>\n\n"
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (line.startsWith("data:")) {
            const payload = line.slice(5).trim();
            if (payload === "[DONE]") {
              onDone();
              return;
            }
            if (payload) onChunk(payload);
          }
        }
      }
      onDone();
    })
    .catch((err: Error) => {
      if (err.name !== "AbortError") onError(err);
    });

  return controller;
};

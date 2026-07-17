import { api } from "@/lib/api";
import { getAccessToken } from "@/lib/token-storage";
import {
  ChatSession,
  ConversationResponse,
  SseMessageRequest,
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

// ── SSE Pipeline (POST + fetch ReadableStream) ────────────────────────────────

/**
 * Stream a message via the AI pipeline endpoint.
 * Backend: POST /chat/message — produces text/event-stream.
 * Native EventSource only supports GET, so we use fetch() + ReadableStream.
 */
export const streamPipelineMessage = (
    data: SseMessageRequest,
    // status mirrors the backend AgentEvent.status: "thinking" | "done" | "error".
    // Plain-text / untyped payloads arrive with status undefined (treated as final).
    onChunk: (chunk: string, status?: string) => void,
    onDone: () => void,
    onError: (err: Error) => void,
    onMeta?: (meta: Record<string, unknown>) => void
): AbortController => {
  const controller = new AbortController();
  const token = typeof window !== "undefined" ? getAccessToken() : null;
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
        let dataLines: string[] = [];

        // Called on each blank line (event boundary). Returns true once
        // the [DONE] sentinel has been seen.
        const flushEvent = (): boolean => {
          if (dataLines.length === 0) return false;
          const payload = dataLines.join("\n");
          dataLines = [];

          if (!payload) return false;
          if (payload === "[DONE]") {
            onDone();
            return true;
          }

          try {
            let parsed: unknown = JSON.parse(payload);
            // The backend may serialize the event twice, leaving a JSON string
            // that itself needs a second parse to reach the {message} object.
            if (typeof parsed === "string") {
              try {
                parsed = JSON.parse(parsed);
              } catch {
                // not double-encoded — fall through and treat as plain text
              }
            }
            if (typeof parsed === "string") {
              onChunk(parsed);
            } else {
              const event = parsed as { message?: string; status?: string; data?: unknown };
              // Meta events carry either a reportId (verify/lookup result) or a
              // "pending" flag (clarify question / confirm-before-run gate).
              if (
                  onMeta &&
                  event.data &&
                  typeof event.data === "object" &&
                  !Array.isArray(event.data) &&
                  ("reportId" in (event.data as Record<string, unknown>)
                      || "pending" in (event.data as Record<string, unknown>))
              ) {
                onMeta(event.data as Record<string, unknown>);
              }
              if (event.message) {
                onChunk(event.message, event.status);
              }
            }
          } catch {
            onChunk(payload);
          }
          return false;
        };

        while (true) {
          const { done, value } = await reader.read();

          if (value) {
            buffer += decoder.decode(value, { stream: true });
          }

          let newlineIndex;
          while ((newlineIndex = buffer.indexOf("\n")) !== -1) {
            let line = buffer.slice(0, newlineIndex);
            buffer = buffer.slice(newlineIndex + 1);
            if (line.endsWith("\r")) line = line.slice(0, -1);

            if (line === "") {
              if (flushEvent()) return;
            } else if (line.startsWith("data:")) {
              dataLines.push(line.slice(5).trimStart());
            }
            // other SSE fields (event:, id:, retry:, comments) are ignored
          }

          if (done) {
            // Flush a trailing event that never received its terminating blank line.
            if (flushEvent()) return;
            break;
          }
        }
        onDone();
      })
      .catch((err: Error) => {
        if (err.name !== "AbortError") onError(err);
      });

  return controller;
};
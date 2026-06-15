import { api } from "@/lib/api";
import {
  ChatSession,
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
    onError: (err: Error) => void,
    onMeta?: (meta: Record<string, unknown>) => void
): AbortController => {
  const controller = new AbortController();
  const token = typeof window !== "undefined" ? localStorage.getItem("access_token") : null;
  const baseUrl = process.env.NEXT_PUBLIC_API_URL ?? "";

  console.log("[SSE] PARSER VERSION 2026-06-11 — starting request", data); // DEBUG

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
        console.log("[SSE] response status:", res.status, "| content-type:", res.headers.get("content-type")); // 🔍 DEBUG

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

          console.log("[SSE] flushEvent payload:", JSON.stringify(payload)); //  DEBUG

          if (!payload) return false;
          if (payload === "[DONE]") {
            console.log("[SSE] [DONE] received → calling onDone()"); //  DEBUG
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
              console.log("[SSE] → onChunk (string):", parsed.slice(0, 80)); //  DEBUG
              onChunk(parsed);
            } else {
              const event = parsed as { message?: string; data?: unknown };
              console.log("[SSE] parsed event:", parsed); //  DEBUG
              if (
                  onMeta &&
                  event.data &&
                  typeof event.data === "object" &&
                  !Array.isArray(event.data) &&
                  "reportId" in (event.data as Record<string, unknown>)
              ) {
                onMeta(event.data as Record<string, unknown>);
              }
              if (event.message) {
                console.log("[SSE] → onChunk (message):", event.message.slice(0, 80)); //  DEBUG
                onChunk(event.message);
              } else {
                console.warn("[SSE] ⚠️ event KHÔNG có field message — bị bỏ qua:", parsed); //  DEBUG
              }
            }
          } catch (e) {
            console.log("[SSE] → onChunk (raw, JSON.parse failed):", payload.slice(0, 80), e); // 🔍 DEBUG
            onChunk(payload);
          }
          return false;
        };

        while (true) {
          const { done, value } = await reader.read();

          if (value) {
            const text = decoder.decode(value, { stream: true });
            console.log("[SSE] RAW chunk:", JSON.stringify(text)); //  DEBUG
            buffer += text;
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
            console.log("[SSE] stream closed by server (done=true)"); //  DEBUG
            // Flush a trailing event that never received its terminating blank line.
            if (flushEvent()) return;
            break;
          }
        }
        console.log("[SSE] stream ended WITHOUT [DONE] → calling onDone() fallback"); //  DEBUG
        onDone();
      })
      .catch((err: Error) => {
        console.error("[SSE] ❌ fetch/stream error:", err); //  DEBUG
        if (err.name !== "AbortError") onError(err);
      });

  return controller;
};
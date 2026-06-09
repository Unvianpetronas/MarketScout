"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Send, Plus, Trash2, FileText, Loader2, Paperclip, RefreshCw, MoreHorizontal } from "lucide-react";
import { toast } from "sonner";
import { AuthGuard } from "@/components/shared/auth-guard";
import {
  getSessions,
  createSession,
  deleteSession,
  getSessionHistory,
  streamPipelineMessage,
} from "@/services/chat.service";
import { ChatSession, ChatMessage } from "@/types/chat";

function ChatContent() {
  const searchParams = useSearchParams();
  const reportId = searchParams.get("reportId") || undefined;

  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSession, setActiveSession] = useState<ChatSession | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState("");
  const streamingContentRef = useRef("");
  const [isLoadingSessions, setIsLoadingSessions] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    getSessions()
      .then((s) => {
        setSessions(s);
        if (s.length > 0) setActiveSession(s[0]);
        setIsLoadingSessions(false);
      })
      .catch(() => setIsLoadingSessions(false));
  }, []);

  useEffect(() => {
    if (activeSession) {
      getSessionHistory(activeSession.id)
        .then((conv) => setMessages(conv.messages))
        .catch(() => setMessages([]));
    }
  }, [activeSession]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingContent]);

  // Handle preMessage from search params (coming from verify page)
  useEffect(() => {
    const preMessage = searchParams.get("preMessage");
    if (preMessage) {
      setInput(decodeURIComponent(preMessage));
    }
  }, [searchParams]);

  const handleNewSession = async () => {
    try {
      const session = await createSession("New Conversation");
      setSessions((prev) => [session, ...prev]);
      setActiveSession(session);
      setMessages([]);
    } catch {
      toast.error("Failed to create session.");
    }
  };

  const handleDeleteSession = async (sessionId: string) => {
    try {
      await deleteSession(sessionId);
      setSessions((prev) => prev.filter((s) => s.id !== sessionId));
      if (activeSession?.id === sessionId) {
        const remaining = sessions.filter((s) => s.id !== sessionId);
        setActiveSession(remaining[0] || null);
        setMessages([]);
      }
    } catch {
      toast.error("Failed to delete session.");
    }
  };

  const handleSend = async () => {
    if (!input.trim() || isStreaming) return;

    let session = activeSession;
    if (!session) {
      try {
        session = await createSession("New Conversation");
        setSessions((prev) => [session!, ...prev]);
        setActiveSession(session);
      } catch {
        toast.error("Failed to create session.");
        return;
      }
    }

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: "user",
      content: input,
      createdAt: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    const sentInput = input;
    setInput("");
    setIsStreaming(true);
    setStreamingContent("");
    streamingContentRef.current = "";

    streamPipelineMessage(
      { message: sentInput, sessionId: session.id, reportId },
      (chunk) => {
        streamingContentRef.current += chunk;
        setStreamingContent(streamingContentRef.current);
      },
      () => {
        setIsStreaming(false);
        setMessages((prev) => [
          ...prev,
          {
            id: (Date.now() + 1).toString(),
            role: "assistant",
            content: streamingContentRef.current,
            createdAt: new Date().toISOString(),
          },
        ]);
        setStreamingContent("");
        streamingContentRef.current = "";
      },
      () => {
        setIsStreaming(false);
        setStreamingContent("");
        toast.error("Streaming failed. Please try again.");
      }
    );
  };

  return (
    <AuthGuard>
      <div className="flex flex-col h-screen bg-[#F9F8F4]">
        {/* TOP BAR */}
        <header className="bg-white border-b border-gray-100 h-14 flex items-center px-6 gap-4 shrink-0">
          {/* Left: Logo */}
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded bg-[#00D26A] flex items-center justify-center">
              <span className="text-black font-bold text-xs">M</span>
            </div>
            <div>
              <span className="font-bold text-gray-900 text-sm">MarketScout</span>
              <p className="text-gray-400 text-[10px] leading-none">Intelligence Platform</p>
            </div>
          </div>

          {/* Center: Dataset badge */}
          <div className="flex-1 flex justify-center">
            <div className="bg-white border border-gray-200 rounded-full px-4 py-1.5 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[#00D26A]" />
              <span className="text-sm text-gray-600">Active Dataset: VN_Retail_Expansion_Q3_2024.pdf</span>
            </div>
          </div>

          {/* Right */}
          <div className="flex items-center gap-3">
            <button className="flex items-center gap-1.5 bg-yellow-400 text-black text-xs font-bold px-3 py-1.5 rounded-full hover:bg-yellow-300 transition-colors">
              👑 UPGRADE TO PRO
            </button>
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-xs font-bold">
              MD
            </div>
          </div>
        </header>

        {/* MAIN LAYOUT */}
        <div className="flex flex-1 overflow-hidden">
          {/* LEFT SIDEBAR */}
          <aside className="w-72 bg-white border-r border-gray-100 p-5 flex flex-col overflow-y-auto shrink-0">
            {/* Report Source */}
            <div className="mb-5">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs text-[#B8860B] font-semibold uppercase tracking-wider">Report Source</p>
                <span className="text-xs text-gray-400">● Updated 2h ago</span>
              </div>
              <h3 className="text-base font-bold text-gray-900 mb-1 leading-snug">
                Báo cáo Nhượng quyền &amp; Chuỗi Bán lẻ Việt Nam 2024
              </h3>
              <p className="text-gray-500 text-sm mb-4 leading-relaxed">
                Phân tích toàn diện về thị trường nhượng quyền thương mại và chuỗi bán lẻ tại Việt Nam Q3 2024.
              </p>

              {/* Resource cards */}
              <div className="space-y-2">
                {[
                  {
                    icon: "📋",
                    title: "CHẾ ĐỊNH PHÁP LÝ MỚI",
                    desc: "Nghị định 120/2024 về nhượng quyền thương mại",
                  },
                  {
                    icon: "📈",
                    title: "DỰ BÁO TĂNG TRƯỞNG",
                    desc: "CAGR 18.5% giai đoạn 2024-2027",
                  },
                  {
                    icon: "📎",
                    title: "PHỤ LỤC TẬP ĐÍNH KÈM",
                    desc: "Danh sách 47 thương hiệu nhượng quyền hàng đầu",
                  },
                ].map((item) => (
                  <div key={item.title} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                    <span className="text-base">{item.icon}</span>
                    <div>
                      <p className="text-xs font-bold text-gray-700">{item.title}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-3 flex items-center gap-2 text-xs text-gray-400">
                <span>Metadata Status: Fully Indexed</span>
                <span>•</span>
                <button className="text-[#00D26A] hover:underline font-medium">Browse PDF Data</button>
              </div>
            </div>

            {/* Sessions */}
            <div className="border-t border-gray-100 pt-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Sessions</p>
                <button
                  onClick={handleNewSession}
                  className="w-6 h-6 bg-[#00D26A] rounded flex items-center justify-center hover:bg-[#00b85d]"
                >
                  <Plus className="w-3.5 h-3.5 text-white" />
                </button>
              </div>
              {isLoadingSessions ? (
                <div className="flex justify-center py-4">
                  <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                </div>
              ) : sessions.length === 0 ? (
                <p className="text-xs text-gray-400">No sessions yet.</p>
              ) : (
                <div className="space-y-0.5">
                  {sessions.map((session) => (
                    <div
                      key={session.id}
                      onClick={() => setActiveSession(session)}
                      className={`flex items-center justify-between rounded-lg px-3 py-2 cursor-pointer group transition-colors ${
                        activeSession?.id === session.id
                          ? "bg-green-50 text-green-700"
                          : "hover:bg-gray-50 text-gray-600"
                      }`}
                    >
                      <span className="text-xs font-medium truncate">{session.title}</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteSession(session.id);
                        }}
                        className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 transition-all"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </aside>

          {/* MAIN CHAT AREA */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Chat header */}
            <div className="bg-white border-b border-gray-100 p-4 flex items-center gap-3 shrink-0">
              <div className="w-9 h-9 rounded-full bg-[#1A3A28] flex items-center justify-center">
                <span className="text-white font-bold text-sm">M</span>
              </div>
              <div>
                <p className="font-semibold text-gray-900 text-sm">MarketScout AI</p>
                <span className="text-xs font-semibold bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                  INTELLIGENCE COPILOT
                </span>
              </div>
              <p className="text-xs text-gray-400 ml-2">■ Synced to 2024 Corporate Regulatory Index</p>
              <div className="ml-auto flex items-center gap-2">
                <button className="w-7 h-7 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-400">
                  <RefreshCw className="w-4 h-4" />
                </button>
                <button className="w-7 h-7 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-400">
                  <MoreHorizontal className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-[#F9F8F4]">
              {messages.length === 0 && !isStreaming && (
                <div className="flex flex-col items-center justify-center h-full text-center pb-20">
                  <div className="w-16 h-16 rounded-full bg-[#1A3A28] flex items-center justify-center mb-4">
                    <span className="text-[#00D26A] font-bold text-xl">M</span>
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 mb-2">Intelligence Copilot Ready</h3>
                  <p className="text-gray-500 text-sm max-w-md">
                    Ask me anything about regulations, trade partners, financial estimates, or export criteria.
                  </p>
                  <div className="grid grid-cols-2 gap-3 mt-6 max-w-sm w-full">
                    {[
                      "Summarize the risk findings",
                      "What are the red flags?",
                      "Compare with similar companies",
                      "Recommend due diligence steps",
                    ].map((prompt) => (
                      <button
                        key={prompt}
                        onClick={() => setInput(prompt)}
                        className="text-xs text-gray-600 border border-gray-200 rounded-lg px-3 py-2 hover:bg-white hover:border-[#00D26A]/50 text-left transition-colors"
                      >
                        {prompt}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {messages.map((msg) => (
                <div key={msg.id} className={`flex flex-col ${msg.role === "user" ? "items-end" : "items-start"}`}>
                  <p className={`text-xs text-gray-400 mb-1.5 font-semibold uppercase tracking-wider ${msg.role === "user" ? "text-right" : ""}`}>
                    {msg.role === "user" ? "You • Senior Advisor" : "MarketScout AI • Deep Analytics Agent"}
                  </p>
                  <div
                    className={`rounded-2xl p-4 text-sm leading-relaxed shadow-sm ${
                      msg.role === "user"
                        ? "bg-white rounded-tr-sm max-w-lg text-gray-800"
                        : "bg-white rounded-tl-sm max-w-2xl text-gray-800 italic"
                    }`}
                  >
                    <p style={{ whiteSpace: "pre-wrap" }}>{msg.content}</p>
                  </div>
                  {msg.role === "assistant" && (
                    <p className="text-xs text-gray-400 mt-1.5">
                      Delivered instantly • Confidence Score: 94%
                    </p>
                  )}
                </div>
              ))}

              {/* Streaming */}
              {isStreaming && (
                <div className="flex flex-col items-start">
                  <p className="text-xs text-gray-400 mb-1.5 font-semibold uppercase tracking-wider">
                    MarketScout AI • Deep Analytics Agent
                  </p>
                  <div className="bg-white rounded-2xl rounded-tl-sm p-4 shadow-sm max-w-2xl">
                    {streamingContent ? (
                      <p className="text-sm text-gray-800 italic" style={{ whiteSpace: "pre-wrap" }}>{streamingContent}</p>
                    ) : (
                      <div className="flex items-center gap-1.5">
                        <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                        <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                        <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                        <span className="text-xs text-gray-400 italic ml-1">Analyzing data...</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input bar */}
            <div className="bg-white border-t border-gray-100 p-4 shrink-0">
              <div className="flex items-center gap-3">
                <button className="text-gray-400 hover:text-gray-600 shrink-0">
                  <Paperclip className="w-5 h-5" />
                </button>
                <div className="flex-1 relative">
                  <input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleSend();
                      }
                    }}
                    placeholder="Ask about regulations, finance estimates, or export criteria..."
                    disabled={isStreaming}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#1A3A28] focus:ring-2 focus:ring-[#1A3A28]/10 disabled:opacity-60 bg-gray-50"
                  />
                </div>
                {reportId && (
                  <div className="flex items-center gap-1.5 bg-emerald-50 text-emerald-700 text-xs rounded-full px-2 py-1 border border-emerald-100 shrink-0">
                    <FileText className="w-3 h-3" />
                    <span>Attached Report Active</span>
                  </div>
                )}
                <button
                  onClick={handleSend}
                  disabled={isStreaming || !input.trim()}
                  className="px-4 py-2.5 bg-[#1A3A28] text-white rounded-lg hover:bg-[#0D2218] transition-colors disabled:opacity-60 flex items-center gap-1.5 text-sm font-semibold shrink-0"
                >
                  {isStreaming ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  Analyze
                </button>
              </div>
              <p className="text-xs text-gray-400 text-center mt-2">
                🔒 Nội dung mang tính tham khảo. MarketScout AI không thay thế tư vấn pháp lý chuyên nghiệp.
              </p>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="bg-white border-t border-gray-100 px-6 py-2 flex items-center justify-between shrink-0">
          <p className="text-xs text-gray-400">&copy; 2024 MarketScout Inc. | Terms of Platform Services | Privacy Assurance</p>
          <div className="flex items-center gap-1.5 text-xs text-gray-400">
            <span className="w-1.5 h-1.5 rounded-full bg-[#00D26A]" />
            MarketScout Central Data Node: Fully Connected
          </div>
        </div>
      </div>
    </AuthGuard>
  );
}

export default function ChatPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#F9F8F4] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#00D26A]/30 border-t-[#00D26A] rounded-full animate-spin" />
      </div>
    }>
      <ChatContent />
    </Suspense>
  );
}

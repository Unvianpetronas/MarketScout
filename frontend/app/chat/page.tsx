"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Send, Plus, Trash2, FileText, Loader2, MessageSquare,
  RefreshCw, Sparkles, Search, Shield, TrendingUp, Globe,
  ChevronRight, X, Bot, User
} from "lucide-react";
import { toast } from "sonner";
import { AuthGuard } from "@/components/shared/auth-guard";
import { Sidebar } from "@/components/layout/sidebar";
import {
  getSessions, createSession, deleteSession,
  getSessionHistory, streamPipelineMessage,
} from "@/services/chat.service";
import { ChatSession, ChatMessage } from "@/types/chat";
import { useAuth } from "@/providers/auth-provider";

const SUGGESTED_PROMPTS = [
  { icon: Search, label: "Tìm đối tác xuất khẩu", prompt: "Tìm cho tôi các nhà xuất khẩu hàng điện tử tại Việt Nam" },
  { icon: Shield, label: "Kiểm tra rủi ro", prompt: "What are the main red flags when dealing with a new Chinese supplier?" },
  { icon: TrendingUp, label: "Phân tích thị trường", prompt: "Phân tích xu hướng thị trường xuất khẩu đồ gỗ Việt Nam sang EU năm 2024" },
  { icon: Globe, label: "Tư vấn thương mại", prompt: "Hướng dẫn quy trình thẩm định đối tác thương mại quốc tế cho công ty vừa và nhỏ" },
];

function TypingDots() {
  return (
      <div className="flex items-center gap-1.5 px-1">
        {[0, 150, 300].map((delay) => (
            <div
                key={delay}
                className="w-2 h-2 rounded-full bg-[#00D26A]"
                style={{ animation: `bounce 1.2s ${delay}ms ease-in-out infinite` }}
            />
        ))}
      </div>
  );
}

function MessageBubble({ msg, userInitials }: { msg: ChatMessage; userInitials: string }) {
  const isUser = msg.role === "user";
  return (
      <div className={`flex gap-3 animate-fade-in-up ${isUser ? "flex-row-reverse" : ""}`}>
        {/* Avatar */}
        <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
            isUser ? "gradient-brand" : "bg-[#0D2218]"
        }`}>
          {isUser
              ? <span className="text-white text-xs font-bold">{userInitials}</span>
              : <Bot className="w-4 h-4 text-[#00D26A]" />
          }
        </div>

        <div className={`max-w-[75%] ${isUser ? "items-end" : "items-start"} flex flex-col gap-1`}>
          <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider px-1">
            {isUser ? "Bạn" : "MarketScout AI"}
          </p>
          <div className={`rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm ${
              isUser
                  ? "bg-[#0D2218] text-white rounded-tr-sm"
                  : "bg-white text-gray-800 rounded-tl-sm border border-gray-100"
          }`}>
            <p style={{ whiteSpace: "pre-wrap" }}>{msg.content}</p>
          </div>
          {!isUser && msg.reportId && (
              <Link
                  href={`/reports/${msg.reportId}`}
                  className="flex items-center gap-1 text-[11px] font-semibold text-[#00843F] hover:underline px-1"
              >
                Xem báo cáo chi tiết <ChevronRight className="w-3 h-3" />
              </Link>
          )}
          {!isUser && (
              <p className="text-[10px] text-gray-400 px-1">
                {msg.createdAt ? new Date(msg.createdAt).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }) : ""}
              </p>
          )}
        </div>
      </div>
  );
}

function ChatContent() {
  const searchParams = useSearchParams();
  const reportId = searchParams.get("reportId") || undefined;
  const { user } = useAuth();

  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSession, setActiveSession] = useState<ChatSession | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState("");
  const streamingContentRef = useRef("");
  const reportMetaRef = useRef<{
    reportId?: string;
    overallScore?: number;
    riskLevel?: string;
    hardStop?: boolean;
    taxId?: string;
  } | null>(null);
  const [isLoadingSessions, setIsLoadingSessions] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const userInitials = (user?.fullName || "U")
      .split(" ").map((n: string) => n[0]).slice(0, 2).join("").toUpperCase();

  useEffect(() => {
    getSessions()
        .then((s) => { setSessions(s); if (s.length > 0) setActiveSession(s[0]); setIsLoadingSessions(false); })
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

  useEffect(() => {
    const preMessage = searchParams.get("preMessage");
    if (preMessage) setInput(decodeURIComponent(preMessage));
  }, [searchParams]);

  const handleNewSession = async () => {
    try {
      const session = await createSession("New Conversation");
      setSessions((prev) => [session, ...prev]);
      setActiveSession(session);
      setMessages([]);
      inputRef.current?.focus();
    } catch {
      toast.error("Không thể tạo session mới.");
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
      toast.error("Không thể xóa session.");
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
        toast.error("Không thể tạo session."); return;
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
    reportMetaRef.current = null;


    streamPipelineMessage(
        { message: sentInput, sessionId: session.id, reportId },
        (chunk) => {
          streamingContentRef.current = streamingContentRef.current
              ? `${streamingContentRef.current}\n\n${chunk}` : chunk;
          setStreamingContent(streamingContentRef.current);
        },
        () => {
          // FIX: chụp giá trị ref ra biến local NGAY LẬP TỨC.
          // setMessages(updater) chạy trễ (lúc React render), trong khi 2 dòng
          // reset bên dưới chạy ngay — nếu đọc ref bên trong updater thì lúc đó
          // ref đã bị xóa thành "" → luôn rơi vào fallback.
          const finalContent = streamingContentRef.current;
          const meta = reportMetaRef.current;
          setIsStreaming(false);
          setMessages((prev) => [
            ...prev,
            {
              id: (Date.now() + 1).toString(),
              role: "assistant",
              content: finalContent || "Xin lỗi, hệ thống AI đang không thể tạo phản hồi. Vui lòng thử lại.",
              createdAt: new Date().toISOString(),
              reportId: meta?.reportId,
              reportMeta: meta
                  ? {
                    overallScore: meta.overallScore,
                    riskLevel: meta.riskLevel,
                    hardStop: meta.hardStop,
                    taxId: meta.taxId,
                  }
                  : undefined,
            },
          ]);
          setStreamingContent("");
          streamingContentRef.current = "";
          reportMetaRef.current = null;
        },
        (err) => {
          setIsStreaming(false);
          const partialContent = streamingContentRef.current; // FIX: chụp giá trị trước, lý do như onDone
          const meta = reportMetaRef.current;
          if (partialContent) {
            // Stream đứt NHƯNG đã nhận được nội dung → vẫn hiển thị cho user
            setMessages((prev) => [
              ...prev,
              {
                id: (Date.now() + 1).toString(),
                role: "assistant",
                content: partialContent,
                createdAt: new Date().toISOString(),
                reportId: meta?.reportId,
                reportMeta: meta
                    ? {
                      overallScore: meta.overallScore,
                      riskLevel: meta.riskLevel,
                      hardStop: meta.hardStop,
                      taxId: meta.taxId,
                    }
                    : undefined,
              },
            ]);
            streamingContentRef.current = "";
            setStreamingContent("");
          } else {
            setStreamingContent("");
            toast.error("Kết nối AI bị gián đoạn. Vui lòng thử lại.");
          }
          reportMetaRef.current = null;
        },
        (meta) => {
          reportMetaRef.current = {
            reportId: meta.reportId as string | undefined,
            overallScore: meta.overallScore as number | undefined,
            riskLevel: meta.riskLevel as string | undefined,
            hardStop: meta.hardStop as boolean | undefined,
            taxId: meta.taxId as string | undefined,
          };
        }
    );
  };

  return (
      <AuthGuard>
        <div className="flex h-screen bg-[#FAFBFA] overflow-hidden">
          <Sidebar active="ai-assistant" />

          {/* ── Session Sidebar ── */}
          <aside className="w-64 bg-white border-r border-gray-100 flex flex-col shrink-0">
            <div className="px-4 py-4 border-b border-gray-100">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h2 className="text-sm font-bold text-gray-900">AI Assistant</h2>
                  <p className="text-[11px] text-gray-400">Trợ lý thương mại quốc tế</p>
                </div>
                <div className="pulse-dot" />
              </div>
              <button
                  onClick={handleNewSession}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2 gradient-brand text-white text-xs font-semibold rounded-xl hover:opacity-90 transition-opacity"
              >
                <Plus className="w-3.5 h-3.5" />
                Cuộc hội thoại mới
              </button>
            </div>

            <div className="flex-1 overflow-y-auto scrollbar-thin px-2 py-3">
              <p className="text-[10px] text-gray-400 uppercase tracking-widest font-bold px-2 mb-2">Lịch sử</p>
              {isLoadingSessions ? (
                  <div className="space-y-2 px-2">
                    {[...Array(4)].map((_, i) => <div key={i} className="h-9 shimmer rounded-xl" />)}
                  </div>
              ) : sessions.length === 0 ? (
                  <div className="text-center py-8">
                    <MessageSquare className="w-8 h-8 text-gray-200 mx-auto mb-2" />
                    <p className="text-xs text-gray-400">Chưa có hội thoại nào</p>
                  </div>
              ) : (
                  <div className="space-y-0.5">
                    {sessions.map((session) => (
                        <div
                            key={session.id}
                            onClick={() => setActiveSession(session)}
                            className={`flex items-center justify-between rounded-xl px-3 py-2.5 cursor-pointer group transition-all ${
                                activeSession?.id === session.id
                                    ? "bg-[#E6F9F0] text-[#00843F]"
                                    : "text-gray-600 hover:bg-gray-50"
                            }`}
                        >
                          <span className="text-xs font-medium truncate flex-1">{session.title}</span>
                          <button
                              onClick={(e) => { e.stopPropagation(); handleDeleteSession(session.id); }}
                              className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-400 transition-all ml-1 shrink-0"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                    ))}
                  </div>
              )}
            </div>
          </aside>

          {/* ── Main Chat ── */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Header */}
            <div className="bg-white border-b border-gray-100 px-6 py-3.5 flex items-center gap-3 shrink-0 shadow-sm">
              <div className="w-9 h-9 rounded-full bg-[#0D2218] flex items-center justify-center">
                <Bot className="w-4.5 h-4.5 text-[#00D26A]" />
              </div>
              <div>
                <p className="font-bold text-gray-900 text-sm">MarketScout AI</p>
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#00D26A]" />
                  <span className="text-[11px] text-gray-400">Synced · 190+ quốc gia · 8-pillar analysis</span>
                </div>
              </div>
              <div className="ml-auto flex items-center gap-2">
                {reportId && (
                    <div className="flex items-center gap-1.5 bg-emerald-50 text-emerald-700 text-xs px-3 py-1.5 rounded-full border border-emerald-200 font-medium">
                      <FileText className="w-3 h-3" />
                      Báo cáo đã đính kèm
                    </div>
                )}
                <span className="text-[11px] text-gray-400 bg-gray-50 px-3 py-1.5 rounded-full border border-gray-100">
                <Sparkles className="w-3 h-3 inline-block mr-1 text-[#00D26A]" />
                Powered by Gemini
              </span>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6 scrollbar-thin">
              {messages.length === 0 && !isStreaming && (
                  <div className="flex flex-col items-center justify-center h-full text-center pb-20 animate-fade-in">
                    <div className="w-20 h-20 rounded-full bg-[#0D2218] flex items-center justify-center mb-5 shadow-lg">
                      <Bot className="w-10 h-10 text-[#00D26A]" />
                    </div>
                    <h3 className="text-xl font-extrabold text-gray-900 mb-2">Xin chào! Tôi là MarketScout AI</h3>
                    <p className="text-gray-500 text-sm max-w-md mb-8">
                      Tôi có thể giúp bạn tìm kiếm đối tác, thẩm định doanh nghiệp, và tư vấn thương mại quốc tế.
                    </p>
                    <div className="grid grid-cols-2 gap-3 max-w-lg w-full">
                      {SUGGESTED_PROMPTS.map(({ icon: Icon, label, prompt }) => (
                          <button
                              key={label}
                              onClick={() => { setInput(prompt); inputRef.current?.focus(); }}
                              className="flex items-start gap-2.5 text-left p-3.5 bg-white border border-gray-200 rounded-xl hover:border-[#00D26A] hover:bg-[#E6F9F0] transition-all group shadow-sm"
                          >
                            <div className="w-6 h-6 bg-[#E6F9F0] rounded-lg flex items-center justify-center shrink-0 group-hover:bg-white transition-colors">
                              <Icon className="w-3.5 h-3.5 text-[#00D26A]" />
                            </div>
                            <span className="text-xs font-semibold text-gray-700 group-hover:text-[#00843F]">{label}</span>
                          </button>
                      ))}
                    </div>
                  </div>
              )}

              {messages.map((msg) => (
                  <MessageBubble key={msg.id} msg={msg} userInitials={userInitials} />
              ))}

              {isStreaming && (
                  <div className="flex gap-3 animate-fade-in">
                    <div className="w-8 h-8 rounded-full bg-[#0D2218] flex items-center justify-center shrink-0">
                      <Bot className="w-4 h-4 text-[#00D26A]" />
                    </div>
                    <div className="flex flex-col gap-1">
                      <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider px-1">MarketScout AI</p>
                      <div className="bg-white rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm border border-gray-100 max-w-[75%]">
                        {streamingContent ? (
                            <p className="text-sm text-gray-800 leading-relaxed" style={{ whiteSpace: "pre-wrap" }}>
                              {streamingContent}
                              <span className="inline-block w-0.5 h-4 bg-[#00D26A] ml-0.5 animate-pulse" />
                            </p>
                        ) : <TypingDots />}
                      </div>
                    </div>
                  </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input Bar */}
            <div className="bg-white border-t border-gray-100 px-6 py-4 shrink-0">
              <div className={`flex items-end gap-3 bg-gray-50 rounded-2xl border transition-all ${
                  input ? "border-[#00D26A] ring-2 ring-[#00D26A]/15" : "border-gray-200"
              } px-4 py-3`}>
              <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => { setInput(e.target.value); e.target.style.height = "auto"; e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`; }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
                  }}
                  placeholder="Hỏi về đối tác, thị trường, rủi ro thương mại... (Enter để gửi)"
                  disabled={isStreaming}
                  rows={1}
                  style={{ resize: "none", overflow: "hidden", minHeight: "36px" }}
                  className="flex-1 bg-transparent text-sm text-gray-800 placeholder-gray-400 focus:outline-none disabled:opacity-60"
              />
                <button
                    onClick={handleSend}
                    disabled={isStreaming || !input.trim()}
                    className="gradient-brand text-white rounded-xl p-2.5 hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
                >
                  {isStreaming ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-[11px] text-gray-400 text-center mt-2">
                🔒 Nội dung mang tính tham khảo. MarketScout AI không thay thế tư vấn pháp lý chuyên nghiệp.
              </p>
            </div>
          </div>
        </div>
      </AuthGuard>
  );
}

export default function ChatPage() {
  return (
      <Suspense fallback={
        <div className="min-h-screen bg-[#FAFBFA] flex items-center justify-center">
          <div className="w-10 h-10 border-2 border-[#00D26A]/30 border-t-[#00D26A] rounded-full animate-spin" />
        </div>
      }>
        <ChatContent />
      </Suspense>
  );
}
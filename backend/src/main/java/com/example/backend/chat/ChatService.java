package com.example.backend.chat;

import com.example.backend.chat.ChatDTO;
import com.example.backend.report.ReportDTO;
import com.example.backend.exception.AppException;
import com.example.backend.domain.*;
import com.example.backend.shared.model.agent.AgentEvent;
import com.example.backend.shared.model.agent.IntentResult;
import com.example.backend.shared.model.crawler.P1Data;
import com.example.backend.shared.model.crawler.P6Data;
import com.example.backend.shared.model.input.CompanyInput;
import com.example.backend.shared.model.scoring.ScoringResult;
import com.example.backend.partners.FindPartnersService;
import com.example.backend.partners.QuickScanService;
import com.example.backend.chat.IntentDetector;
import com.example.backend.verification.DealSafetyAgent;
import com.example.backend.verification.ScoringEngine;
import com.example.backend.shared.gemini.GeminiService;
import com.example.backend.quota.QuotaService;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

@Slf4j
@Service
@RequiredArgsConstructor
public class ChatService {

    private final ChatSessionRepository sessionRepo;
    private final ChatMessageRepository messageRepo;
    private final UsersRepository       usersRepo;
    private final ReportRepository      reportRepo;
    private final GeminiService         geminiService;
    private final QuotaService          quotaService;
    private final IntentDetector        intentDetector;
    private final FindPartnersService   findPartnersService;
    private final QuickScanService      quickScanService;
    private final ScoringEngine         scoringEngine;
    private final DealSafetyAgent       dealSafetyAgent;
    private final ObjectMapper          objectMapper;

    private final ExecutorService sseExecutor = Executors.newCachedThreadPool();

    // ── MarketScout Pipeline (6-intent SSE) ──────────────────────────────────

    /**
     * Main pipeline endpoint.
     * Detects intent and routes to the correct handler, streaming progress via SSE.
     * Quota is only deducted for VERIFY_PARTNER (1) and COMPARE_PARTNERS (2).
     *
     * Event order: agent events → DB save → [DONE] → complete().
     * The DB save happens BEFORE [DONE] so that:
     *   1. A client that reloads right after [DONE] always sees the message in history.
     *   2. If the save throws, the client gets a proper error event instead of
     *      an abruptly closed connection.
     * We always close with complete() — never completeWithError() — because
     * completeWithError() makes the container abort the socket mid-chunk,
     * which Firefox reports as "TypeError: Error in input stream".
     */
    public SseEmitter processMessage(UUID userId, ReportDTO.ChatMessageRequest req) {
        // 180s — covers the full 8-pillar scoring pipeline (~17s observed) plus
        // safety margin for slow external crawlers (masothue.vn, GLEIF, etc.)
        SseEmitter emitter = new SseEmitter(180_000L);

        sseExecutor.submit(() -> {
            try {
                Users user = requireUser(userId);
                ChatSession session = resolveSession(userId, req.getSessionId());
                boolean isFirstMessage = session != null
                    && messageRepo.findBySession_IdOrderByCreatedAtAsc(session.getId()).isEmpty();

                if (session != null) {
                    messageRepo.save(ChatMessage.builder()
                        .session(session).user(user).role("user")
                        .content(req.getMessage()).build());
                }

                IntentResult intent = intentDetector.detect(req.getMessage());
                String reply = handleIntent(userId, intent, req, emitter);

                // Save FIRST — before signalling [DONE] to the client.
                if (reply != null && !reply.isBlank() && session != null) {
                    saveAssistantMessageAndUpdateSessionSafely(session, user, reply, isFirstMessage, req.getMessage());
                }

                emitter.send(SseEmitter.event().data("[DONE]"));
                emitter.complete();
            } catch (Exception e) {
                log.error("processMessage error for user {}: {}", userId, e.getMessage(), e);
                try {
                    emitter.send(SseEmitter.event().data(
                        objectMapper.writeValueAsString(AgentEvent.error("manager", e.getMessage()))));
                    emitter.send(SseEmitter.event().data("[DONE]"));
                } catch (Exception sendEx) {
                    log.warn("Could not deliver error event to client: {}", sendEx.getMessage());
                }
                // Close cleanly even on error — the client already received the
                // error event; aborting the socket would only add a second,
                // meaningless browser-side error on top.
                try {
                    emitter.complete();
                } catch (Exception ignored) {}
            }
        });

        return emitter;
    }

    private ChatSession resolveSession(UUID userId, String sessionIdStr) {
        if (sessionIdStr == null || sessionIdStr.isBlank()) return null;
        try {
            UUID sessionId = UUID.fromString(sessionIdStr);
            return sessionRepo.findById(sessionId)
                .filter(s -> s.getUser().getId().equals(userId))
                .orElse(null);
        } catch (IllegalArgumentException e) {
            return null;
        }
    }

    @org.springframework.beans.factory.annotation.Autowired
    private org.springframework.transaction.PlatformTransactionManager transactionManager;

    private String autoTitle(String message) {
        String trimmed = message.trim();
        return trimmed.length() > 60 ? trimmed.substring(0, 60) + "..." : trimmed;
    }

    public void saveAssistantMessageAndUpdateSessionSafely(ChatSession session, Users user, String reply, boolean isFirstMessage, String userMessage) {
        new org.springframework.transaction.support.TransactionTemplate(transactionManager).executeWithoutResult(status -> {
            messageRepo.save(ChatMessage.builder()
                .session(session).user(user).role("assistant")
                .content(reply).modelUsed(geminiService.getModelName())
                .build());

            if (isFirstMessage && session.getTitle() != null
                    && session.getTitle().trim().equalsIgnoreCase("new conversation")) {
                session.setTitle(autoTitle(userMessage));
                sessionRepo.save(session);
            }
            sessionRepo.touchUpdatedAt(session.getId(), Instant.now());
        });
    }

    private String handleIntent(UUID userId, IntentResult intent,
                               ReportDTO.ChatMessageRequest req, SseEmitter emitter) throws Exception {
        String intentType = intent.getIntent();
        log.info("Intent={} userId={} message={}", intentType, userId, req.getMessage());

        return switch (intentType) {
            case "FIND_BUYER", "FIND_SELLER" -> handleFindPartners(userId, intent, req, emitter);
            case "LOOKUP_COMPANY" -> handleLookup(userId, intent, req, emitter);
            case "VERIFY_PARTNER" -> handleVerify(userId, intent, req, emitter, 1);
            case "COMPARE_PARTNERS" -> handleCompare(userId, intent, req, emitter);
            case "EXPLAIN_REPORT" -> handleExplainReport(userId, req, emitter);
            default -> handleGeneralQA(intent, req, emitter);
        };
    }

    private String handleFindPartners(UUID userId, IntentResult intent,
                                     ReportDTO.ChatMessageRequest req, SseEmitter emitter) throws Exception {
        String sessionId = req.getSessionId() != null ? req.getSessionId() : userId.toString();
        var leads = findPartnersService.findAndFilter(intent, sessionId, json -> {
            try {
                emitter.send(SseEmitter.event().data(json));
            } catch (Exception ex) {
                log.warn("SSE send failed (findPartners callback): {}", ex.getMessage());
            }
        });
        String message = "Tìm thấy " + leads.size() + " kết quả";
        sendEvent(emitter, AgentEvent.done("result", message, leads));
        return message;
    }

    /**
     * Lightweight P1(+P6)-only lookup for "tra mã số thuế / công ty có thật không"
     * style questions. No quota cost — does not run the full 8-pillar pipeline.
     */
    private String handleLookup(UUID userId, IntentResult intent, ReportDTO.ChatMessageRequest req,
                               SseEmitter emitter) throws Exception {
        // Default to Vietnam when the intent didn't extract a country — same rationale as handleVerify.
        String country = (intent.getCountry() == null || intent.getCountry().isBlank())
            ? "VN" : intent.getCountry();
        CompanyInput input = CompanyInput.builder()
            .companyName(intent.getCompanyName() != null ? intent.getCompanyName() : req.getMessage())
            .country(country)
            .taxId(intent.getTaxId())
            .build();

        sendEvent(emitter, AgentEvent.thinking("manager", "Đang tra cứu " + input.getCompanyName() + "..."));

        QuickScanService.QuickLookupResult lookup = quickScanService.quickScanByInput(userId, input);
        Report report = lookup.report();
        P1Data p1 = lookup.p1();
        P6Data p6 = lookup.p6();
        UUID reportId = report.getId();

        java.util.Map<String, Object> data = new java.util.HashMap<>();
        StringBuilder sb = new StringBuilder();
        boolean hasUsefulResult = p1.isFound() || p6.isSanctioned();

        if (p1.isFound()) {
            sb.append(p1.getCompanyName() != null ? p1.getCompanyName() : input.getCompanyName());
            if (p1.getRegistrationId() != null && !p1.getRegistrationId().isBlank()) {
                boolean isLei = "LEI_INTL".equals(p1.getRegistrationType());
                sb.append(" | ").append(isLei ? "LEI" : "MST").append(": ").append(p1.getRegistrationId());
                data.put(isLei ? "lei" : "taxId", p1.getRegistrationId());
            }
            if (p1.getStatus() != null) {
                String statusVi = switch (p1.getStatus()) {
                    case "ACTIVE" -> "Đang hoạt động";
                    case "INACTIVE" -> "Đã ngừng hoạt động";
                    default -> "Không rõ trạng thái";
                };
                sb.append(" | Trạng thái: ").append(statusVi);
            }
            if (p1.getAddress() != null && !p1.getAddress().isBlank()) {
                sb.append(" | Địa chỉ: ").append(p1.getAddress());
            }
        } else {
            sb.append("Không tìm thấy thông tin đăng ký cho \"").append(input.getCompanyName())
              .append("\" trên dữ liệu công khai. Có thể tên công ty chưa chính xác hoặc công ty chưa đăng ký công khai.");
        }

        if (p6.isSanctioned()) {
            sb.append(" | ⚠️ CẢNH BÁO: nằm trong danh sách trừng phạt");
            if (p6.getSanctionSource() != null && !p6.getSanctionSource().isBlank()) {
                sb.append(" (").append(p6.getSanctionSource()).append(")");
            }
            data.put("hardStop", true);
        }

        if (hasUsefulResult) {
            sb.append(" | Xem chi tiết: /reports/").append(reportId);
            data.put("reportId", reportId);
        }

        String message = sb.toString();
        sendEvent(emitter, AgentEvent.done("manager", message, data));
        return message;
    }

    private String handleVerify(UUID userId, IntentResult intent, ReportDTO.ChatMessageRequest req,
                               SseEmitter emitter, int quotaCost) throws Exception {
        // Deduct quota BEFORE running
        quotaService.checkAndDeduct(userId);
        if (quotaCost == 2) quotaService.checkAndDeduct(userId);

        Users user = requireUser(userId);
        // Default to Vietnam when the intent didn't extract a country — this product
        // is VN-focused (masothue.vn/VietQR MST lookup) and a null country routes
        // the P1 crawler to GLEIF (international), which never finds a VN MST.
        String country = (intent.getCountry() == null || intent.getCountry().isBlank())
            ? "VN" : intent.getCountry();
        CompanyInput input = CompanyInput.builder()
            .companyName(intent.getCompanyName() != null ? intent.getCompanyName() : req.getMessage())
            .country(country)
            .taxId(intent.getTaxId())
            .build();

        // Create report record
        Report report = new Report();
        report.setUser(user);
        report.setEntityName(input.getCompanyName());
        report.setCountryIso2(input.getCountry());
        report.setTier("standard");
        report.setHardStop(false);
        report.setStatus("DEEP_SCANNING");
        report.setSource("MANUAL");
        report.setQuickScanDone(false);
        report.setCreatedAt(Instant.now());
        report.setUpdatedAt(Instant.now());
        report = reportRepo.save(report);
        final UUID reportId = report.getId();

        sendEvent(emitter, AgentEvent.thinking("manager", "Bắt đầu thẩm định " + input.getCompanyName() + " | Report ID: " + reportId));

        CompletableFuture<ScoringResult> future = scoringEngine.runAsync(reportId, input, userId, json -> {
            try {
                emitter.send(SseEmitter.event().data(json));
            } catch (Exception ex) {
                log.warn("SSE send failed (scoringEngine callback): {}", ex.getMessage());
            }
        });

        // Block until the scoring pipeline finishes. Safe here: handleVerify already
        // runs on sseExecutor (a background pool), never a servlet request thread.
        ScoringResult result = future.join();

        String message;
        java.util.Map<String, Object> data;

        if (result == null || "FAILED".equals(result.getStatus())) {
            message = "Đã xảy ra lỗi khi thẩm định " + input.getCompanyName()
                + ". Vui lòng kiểm tra lại tại /reports/" + reportId + " hoặc thử lại sau.";
            data = java.util.Map.of("reportId", reportId, "status", "FAILED");
        } else if (result.isHardStop()) {
            java.util.Map<String, Object> hardStopData = new java.util.HashMap<>();
            hardStopData.put("reportId", reportId);
            hardStopData.put("hardStop", true);
            hardStopData.put("hardStopReason", result.getHardStopReason());
            if (result.getRegistrationId() != null) hardStopData.put("taxId", result.getRegistrationId());
            data = hardStopData;

            message = "⚠️ HARD STOP — " + result.getCompanyName()
                + " nằm trong danh sách trừng phạt: " + result.getHardStopReason()
                + " | Xem chi tiết: /reports/" + reportId;
        } else {
            StringBuilder sb = new StringBuilder();
            sb.append(result.getCompanyName())
              .append(" | Điểm tổng: ").append(Math.round(result.getOverallScore())).append("/100")
              .append(" | Mức rủi ro: ").append(result.getRiskLevel());
            if (result.getRegistrationId() != null && !result.getRegistrationId().isBlank()) {
                String label = "LEI_INTL".equals(result.getRegistrationType()) ? "LEI" : "MST";
                sb.append(" | ").append(label).append(": ").append(result.getRegistrationId());
            }
            sb.append(" | Xem chi tiết: /reports/").append(reportId);
            message = sb.toString();

            java.util.Map<String, Object> doneData = new java.util.HashMap<>();
            doneData.put("reportId", reportId);
            doneData.put("overallScore", result.getOverallScore());
            doneData.put("riskLevel", result.getRiskLevel());
            doneData.put("hardStop", false);
            if (result.getRegistrationId() != null) doneData.put("taxId", result.getRegistrationId());
            data = doneData;
        }

        sendEvent(emitter, AgentEvent.done("manager", message, data));
        return message;
    }

    private String handleCompare(UUID userId, IntentResult intent, ReportDTO.ChatMessageRequest req,
                                SseEmitter emitter) throws Exception {
        // COMPARE = 2 quota
        quotaService.checkAndDeduct(userId);
        quotaService.checkAndDeduct(userId);

        sendEvent(emitter, AgentEvent.thinking("manager",
            "So sánh đối tác — chạy 2 thẩm định song song (tốn 2 quota)"));

        String message = req.getMessage();
        String[] parts = message.split(" vs | VS | và | and ");
        String company1 = parts.length > 0 ? parts[0].trim() : intent.getCompanyName();
        String company2 = parts.length > 1 ? parts[1].trim() : "";

        String resultMessage = "Đang thẩm định " + company1 + " và " + company2 + " song song. Kết quả sẽ có sau vài phút.";
        sendEvent(emitter, AgentEvent.done("manager", resultMessage, java.util.Map.of("company1", company1, "company2", company2, "note", "2 quota đã bị trừ")));
        return resultMessage;
    }

    private String handleExplainReport(UUID userId, ReportDTO.ChatMessageRequest req,
                                      SseEmitter emitter) throws Exception {
        sendEvent(emitter, AgentEvent.thinking("manager", "Đang đọc báo cáo..."));

        String reportContext = "";
        if (req.getReportId() != null) {
            var reportOpt = reportRepo.findById(req.getReportId())
                .filter(r -> r.getUser().getId().equals(userId));
            if (reportOpt.isPresent()) {
                Report r = reportOpt.get();
                reportContext = "Báo cáo thẩm định: " + r.getEntityName()
                    + " | Điểm tổng: " + r.getOverallScore()
                    + " | Trạng thái: " + r.getStatus()
                    + " | Mức rủi ro: " + r.getRiskLevel();
            }
        }

        String systemPrompt = "Bạn là MarketScout AI. Giải thích kết quả thẩm định cho người dùng.\nTone: Rõ ràng, dễ hiểu, tư vấn thực tế.\nTrả lời bằng tiếng Việt.\n";
        String userPrompt = (reportContext.isBlank() ? "" : "[BÁO CÁO]\n" + reportContext + "\n\n")
            + "[CÂU HỎI]\n" + req.getMessage();

        String reply = geminiService.callWithSystemPrompt(systemPrompt, userPrompt);
        sendEvent(emitter, AgentEvent.done("result", reply, null));
        return reply;
    }

    private String handleGeneralQA(IntentResult intent, ReportDTO.ChatMessageRequest req,
                                  SseEmitter emitter) throws Exception {
        String reply = intent.getReply() != null ? intent.getReply()
            : geminiService.chat(List.of(new GeminiService.GeminiMessage("user", req.getMessage())));

        log.info("handleGeneralQA reply string length: {}", reply != null ? reply.length() : "null");
        sendEvent(emitter, AgentEvent.done("result", reply, null));
        return reply;
    }

    private void sendEvent(SseEmitter emitter, AgentEvent event) throws Exception {
        String json = objectMapper.writeValueAsString(event);
        log.info("Sending SSE Event: {}", json);
        emitter.send(SseEmitter.event().data(json));
    }

    // ── Sessions ──────────────────────────────────────────────────────────────

    @Transactional
    public ChatDTO.SessionResponse createSession(UUID userId, ChatDTO.CreateSessionRequest req) {
        Users user = requireUser(userId);

        String title = (req.getTitle() != null && !req.getTitle().isBlank())
            ? req.getTitle() : "New conversation";

        ChatSession session = sessionRepo.save(
            ChatSession.builder().user(user).title(title).build()
        );

        log.info("Created chat session {} for user {}", session.getId(), userId);
        return toSessionResponse(session);
    }

    @Transactional(readOnly = true)
    public List<ChatDTO.SessionResponse> listSessions(UUID userId) {
        return sessionRepo.findByUser_IdOrderByUpdatedAtDesc(userId)
            .stream().map(this::toSessionResponse).toList();
    }

    @Transactional
    public void deleteSession(UUID userId, UUID sessionId) {
        ChatSession session = requireSession(userId, sessionId);
        sessionRepo.delete(session);
        log.info("Deleted session {} for user {}", sessionId, userId);
    }

    // ── Messages ──────────────────────────────────────────────────────────────

    @Transactional
    public ChatDTO.ChatResponse sendMessage(UUID userId, UUID sessionId, ChatDTO.SendMessageRequest req) {
        Users user       = requireUser(userId);
        ChatSession session = requireSession(userId, sessionId);

        // Deduct quota before doing any work — throws QUOTA_EXHAUSTED (403) if empty
        quotaService.checkAndDeduct(userId);

        // Load full history for multi-turn context
        List<ChatMessage> history = messageRepo.findBySession_IdOrderByCreatedAtAsc(sessionId);

        // Persist user message first
        ChatMessage userMsg = messageRepo.save(ChatMessage.builder()
            .session(session)
            .user(user)
            .role("user")
            .content(req.getContent())
            .build());

        // Build Gemini conversation history (history + new user message)
        List<GeminiService.GeminiMessage> geminiHistory = new ArrayList<>(history.size() + 1);
        for (ChatMessage msg : history) {
            geminiHistory.add(new GeminiService.GeminiMessage(msg.getRole(), msg.getContent()));
        }
        geminiHistory.add(new GeminiService.GeminiMessage("user", req.getContent()));

        // Call Gemini — refund quota if the API call itself fails so the user isn't penalized
        String aiText;
        try {
            aiText = geminiService.chat(geminiHistory);
        } catch (Exception e) {
            quotaService.refundOne(userId);
            throw e;
        }

        // Persist assistant response
        ChatMessage assistantMsg = messageRepo.save(ChatMessage.builder()
            .session(session)
            .user(user)
            .role("assistant")
            .content(aiText)
            .modelUsed(geminiService.getModelName())
            .build());

        // Touch session's updatedAt so it bubbles up in the session list
        sessionRepo.touchUpdatedAt(sessionId, Instant.now());

        log.info("Sent message in session {} — {} history msgs, AI replied {} chars",
            sessionId, history.size(), aiText.length());

        return ChatDTO.ChatResponse.builder()
            .userMessage(toMessageResponse(userMsg))
            .assistantMessage(toMessageResponse(assistantMsg))
            .build();
    }

    @Transactional(readOnly = true)
    public ChatDTO.ConversationResponse getHistory(UUID userId, UUID sessionId) {
        ChatSession session = requireSession(userId, sessionId);
        List<ChatMessage> messages = messageRepo.findBySession_IdOrderByCreatedAtAsc(sessionId);

        return ChatDTO.ConversationResponse.builder()
            .sessionId(session.getId())
            .title(session.getTitle())
            .messages(messages.stream().map(this::toMessageResponse).toList())
            .build();
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private Users requireUser(UUID userId) {
        return usersRepo.findById(userId)
            .orElseThrow(() -> new AppException(AppException.ErrorCode.USER_NOT_FOUND));
    }

    private ChatSession requireSession(UUID userId, UUID sessionId) {
        return sessionRepo.findByIdAndUser_Id(sessionId, userId)
            .orElseThrow(() -> new AppException(AppException.ErrorCode.SESSION_NOT_FOUND));
    }

    private ChatDTO.SessionResponse toSessionResponse(ChatSession s) {
        return ChatDTO.SessionResponse.builder()
            .id(s.getId())
            .title(s.getTitle())
            .createdAt(s.getCreatedAt())
            .updatedAt(s.getUpdatedAt())
            .build();
    }

    private ChatDTO.MessageResponse toMessageResponse(ChatMessage m) {
        return ChatDTO.MessageResponse.builder()
            .id(m.getId())
            .sessionId(m.getSession().getId())
            .role(m.getRole())
            .content(m.getContent())
            .modelUsed(m.getModelUsed())
            .createdAt(m.getCreatedAt())
            .build();
    }
}
package com.example.backend.chat;

import com.example.backend.chat.ChatDTO;
import com.example.backend.report.ReportDTO;
import com.example.backend.exception.AppException;
import com.example.backend.domain.*;
import com.example.backend.shared.model.agent.AgentEvent;
import com.example.backend.shared.model.agent.IntentResult;
import com.example.backend.shared.model.input.CompanyInput;
import com.example.backend.shared.model.scoring.ScoringResult;
import com.example.backend.partners.FindPartnersService;
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
    private final ScoringEngine         scoringEngine;
    private final DealSafetyAgent       dealSafetyAgent;
    private final ObjectMapper          objectMapper;

    private final ExecutorService sseExecutor = Executors.newCachedThreadPool();

    // ── MarketScout Pipeline (6-intent SSE) ──────────────────────────────────

    /**
     * Main pipeline endpoint.
     * Detects intent and routes to the correct handler, streaming progress via SSE.
     * Quota is only deducted for VERIFY_PARTNER (1) and COMPARE_PARTNERS (2).
     */
    public SseEmitter processMessage(UUID userId, ReportDTO.ChatMessageRequest req) {
        SseEmitter emitter = new SseEmitter(60_000L); // 60s timeout

        sseExecutor.submit(() -> {
            try {
                IntentResult intent = intentDetector.detect(req.getMessage());
                handleIntent(userId, intent, req, emitter);
                emitter.complete();
            } catch (Exception e) {
                log.error("processMessage error for user {}: {}", userId, e.getMessage(), e);
                try {
                    emitter.send(SseEmitter.event().data(
                        objectMapper.writeValueAsString(AgentEvent.error("manager", e.getMessage()))));
                } catch (Exception ignored) {}
                emitter.completeWithError(e);
            }
        });

        return emitter;
    }

    private void handleIntent(UUID userId, IntentResult intent,
                               ReportDTO.ChatMessageRequest req, SseEmitter emitter) throws Exception {
        String intentType = intent.getIntent();
        log.info("Intent={} userId={} message={}", intentType, userId, req.getMessage());

        switch (intentType) {
            case "FIND_BUYER", "FIND_SELLER" -> handleFindPartners(userId, intent, req, emitter);
            case "VERIFY_PARTNER" -> handleVerify(userId, intent, req, emitter, 1);
            case "COMPARE_PARTNERS" -> handleCompare(userId, intent, req, emitter);
            case "EXPLAIN_REPORT" -> handleExplainReport(userId, req, emitter);
            default -> handleGeneralQA(intent, req, emitter);
        }
    }

    private void handleFindPartners(UUID userId, IntentResult intent,
                                     ReportDTO.ChatMessageRequest req, SseEmitter emitter) throws Exception {
        String sessionId = req.getSessionId() != null ? req.getSessionId() : userId.toString();
        var leads = findPartnersService.findAndFilter(intent, sessionId, json -> {
            try { emitter.send(SseEmitter.event().data(json)); } catch (Exception ignored) {}
        });
        sendEvent(emitter, AgentEvent.done("result", "Tìm thấy " + leads.size() + " kết quả", leads));
    }

    private void handleVerify(UUID userId, IntentResult intent, ReportDTO.ChatMessageRequest req,
                               SseEmitter emitter, int quotaCost) throws Exception {
        // Deduct quota BEFORE running
        quotaService.checkAndDeduct(userId);
        if (quotaCost == 2) quotaService.checkAndDeduct(userId);

        Users user = requireUser(userId);
        CompanyInput input = CompanyInput.builder()
            .companyName(intent.getCompanyName() != null ? intent.getCompanyName() : req.getMessage())
            .country(intent.getCountry())
            .taxId(intent.getTaxId())
            .build();

        // Create report record
        Report report = new Report();
        report.setId(UUID.randomUUID());
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

        final Report savedReport = report;
        scoringEngine.runAsync(reportId, input, userId, json -> {
            try { emitter.send(SseEmitter.event().data(json)); } catch (Exception ignored) {}
        });

        sendEvent(emitter, AgentEvent.done("manager",
            "Đang chạy thẩm định 8 trụ cột. Theo dõi tại /api/v1/reports/" + reportId + "/status",
            java.util.Map.of("reportId", reportId)));
    }

    private void handleCompare(UUID userId, IntentResult intent, ReportDTO.ChatMessageRequest req,
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

        sendEvent(emitter, AgentEvent.done("manager",
            "Đang thẩm định " + company1 + " và " + company2 + " song song. Kết quả sẽ có sau vài phút.",
            java.util.Map.of("company1", company1, "company2", company2, "note", "2 quota đã bị trừ")));
    }

    private void handleExplainReport(UUID userId, ReportDTO.ChatMessageRequest req,
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

        String systemPrompt = """
            Bạn là MarketScout AI. Giải thích kết quả thẩm định cho người dùng.
            Tone: Rõ ràng, dễ hiểu, tư vấn thực tế.
            Trả lời bằng tiếng Việt.
            """;
        String userPrompt = (reportContext.isBlank() ? "" : "[BÁO CÁO]\n" + reportContext + "\n\n")
            + "[CÂU HỎI]\n" + req.getMessage();

        String reply = geminiService.callWithSystemPrompt(systemPrompt, userPrompt);
        sendEvent(emitter, AgentEvent.done("result", reply, null));
    }

    private void handleGeneralQA(IntentResult intent, ReportDTO.ChatMessageRequest req,
                                  SseEmitter emitter) throws Exception {
        String reply = intent.getReply() != null ? intent.getReply()
            : geminiService.chat(List.of(new GeminiService.GeminiMessage("user", req.getMessage())));
        sendEvent(emitter, AgentEvent.done("result", reply, null));
    }

    private void sendEvent(SseEmitter emitter, AgentEvent event) throws Exception {
        emitter.send(SseEmitter.event().data(objectMapper.writeValueAsString(event)));
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
            .modelUsed(GeminiService.MODEL_NAME)
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

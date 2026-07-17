package com.example.backend.chat;

import com.example.backend.chat.ChatDTO;
import com.example.backend.report.ReportDTO;
import com.example.backend.exception.AppException;
import com.example.backend.domain.*;
import com.example.backend.shared.model.agent.AgentEvent;
import com.example.backend.shared.model.agent.IntentResult;
import com.example.backend.shared.model.crawler.LeadResult;
import com.example.backend.shared.model.crawler.P1Data;
import com.example.backend.shared.model.crawler.P6Data;
import com.example.backend.shared.model.input.CompanyInput;
import com.example.backend.shared.model.scoring.ScoringResult;
import com.example.backend.partners.FindPartnersService;
import com.example.backend.partners.QuickScanService;
import com.example.backend.chat.IntentDetector;
import com.example.backend.contract.ContractLinkService;
import com.example.backend.verification.DealSafetyAgent;
import com.example.backend.verification.ScoringEngine;
import com.example.backend.shared.gemini.GeminiService;
import com.example.backend.quota.QuotaService;
import com.example.backend.shared.cache.CacheService;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;

@Slf4j
@Service
@RequiredArgsConstructor
public class ChatService {

    private final ChatSessionRepository  sessionRepo;
    private final ChatMessageRepository  messageRepo;
    private final UsersRepository        usersRepo;
    private final ReportRepository       reportRepo;
    private final GeminiService          geminiService;
    private final QuotaService           quotaService;
    private final IntentDetector         intentDetector;
    private final FindPartnersService    findPartnersService;
    private final QuickScanService       quickScanService;
    private final ScoringEngine          scoringEngine;
    private final DealSafetyAgent        dealSafetyAgent;
    private final ContractLinkService    contractLinkService;
    private final CompanyResolverService companyResolverService;
    private final CacheService           cacheService;
    private final ObjectMapper           objectMapper;

    private final ExecutorService sseExecutor = Executors.newCachedThreadPool();
    private final ScheduledExecutorService heartbeatExecutor = Executors.newScheduledThreadPool(4);

    private static final int CHAT_RATE_LIMIT_PER_WINDOW = 20;
    private static final Duration CHAT_RATE_LIMIT_WINDOW = Duration.ofMinutes(5);

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

        if (isRateLimited(userId)) {
            sendRateLimitError(emitter);
            return emitter;
        }

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

                String sessionKey = sessionKeyOf(userId, req);
                // Only look up a pending confirmation for a real chat session. Without a
                // sessionId (e.g. /verify's direct-run calls) sessionKeyOf falls back to
                // bare userId — a shared key across every sessionless call from that user —
                // so resuming from it here could silently execute a stale, unrelated
                // request instead of the fresh one this call is actually asking for.
                // Sessionless callers use the explicit confirmVerify bypass inside
                // handleVerify instead (see below), which always re-resolves fresh.
                boolean hasRealSession = req.getSessionId() != null && !req.getSessionId().isBlank();
                Optional<PendingVerifyConfirm> pendingVerify = hasRealSession
                    ? getPendingVerifyConfirm(sessionKey) : Optional.empty();
                // Confirmation must be an explicit action (button click), never guessed from
                // free text — a stray "ok"/"có" reply to something unrelated must not
                // silently spend quota and launch an 8-pillar scan.
                boolean isConfirmation = pendingVerify.isPresent() && Boolean.TRUE.equals(req.getConfirmVerify());

                String reply;
                if (isConfirmation) {
                    clearPendingVerifyConfirm(sessionKey);
                    reply = resumePendingVerify(userId, pendingVerify.get(), req, emitter);
                } else {
                    IntentResult intent = intentDetector.detect(req.getMessage());
                    reply = handleIntent(userId, intent, req, emitter);
                }

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

    /** Redis counter, same fail-open pattern as CrawlerP6's daily-budget guard. */
    private boolean isRateLimited(UUID userId) {
        long count = cacheService.incrementCounter("chat:rate:" + userId, CHAT_RATE_LIMIT_WINDOW, 1);
        return count > CHAT_RATE_LIMIT_PER_WINDOW;
    }

    private void sendRateLimitError(SseEmitter emitter) {
        try {
            emitter.send(SseEmitter.event().data(objectMapper.writeValueAsString(AgentEvent.error("manager",
                "Bạn đang gửi tin nhắn quá nhanh. Vui lòng đợi vài phút rồi thử lại."))));
            emitter.send(SseEmitter.event().data("[DONE]"));
            emitter.complete();
        } catch (Exception e) {
            log.warn("Could not deliver rate-limit event: {}", e.getMessage());
        }
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

        long sanctioned = leads.stream().filter(l -> l.isSanctionHit()).count();
        long safe = leads.size() - sanctioned;
        String what = intent.getProduct() != null && !intent.getProduct().isBlank()
            ? intent.getProduct() : "đối tác";
        String where = intent.getMarket() != null && !intent.getMarket().isBlank()
            ? " tại " + intent.getMarket() : "";

        String message;
        if (leads.isEmpty()) {
            message = "Mình chưa tìm thấy đối tác phù hợp cho \"" + what + "\"" + where
                + ". Bạn thử mô tả cụ thể hơn về ngành hàng và thị trường giúp mình nhé.";
        } else {
            StringBuilder sb = new StringBuilder();
            sb.append("Mình tìm thấy ").append(leads.size())
              .append(" đối tác tiềm năng cho \"").append(what).append("\"").append(where).append(". ")
              .append(safe).append(" đối tác chưa phát hiện rủi ro");
            if (sanctioned > 0) {
                sb.append(", ").append(sanctioned).append(" nằm trong danh sách trừng phạt (đã đánh dấu)");
            }
            sb.append(". Bạn có thể mở trang \"Tìm đối tác\" để xem chi tiết và thẩm định từng đơn vị.");
            message = sb.toString();
        }

        java.util.Map<String, Object> data = new java.util.HashMap<>();
        data.put("leads", findPartnersService.topClean(leads));
        data.put("total", leads.size());
        data.put("sanctioned", sanctioned);
        sendEvent(emitter, AgentEvent.done("result", message, data));
        return message;
    }

    /**
     * Resolves the company name for LOOKUP_COMPANY/VERIFY_PARTNER, shared so the two
     * handlers can't drift. Two deterministic bypasses run before ever asking Gemini
     * to guess ambiguity:
     *  - intent.taxId (when IntentDetector split it out from companyName) is preferred
     *    over the raw message, so CompanyResolverService sees a bare MST instead of a
     *    whole sentence — fixes typing an MST into /verify still bouncing to chat.
     *  - a known website (from the /verify form, or a candidate the user picked from a
     *    "which company?" list) already disambiguates the company, so the LLM guess is
     *    skipped entirely.
     */
    CompanyResolutionResult resolveCompany(String sessionKey, IntentResult intent,
                                          ReportDTO.ChatMessageRequest req) {
        Optional<CompanyResolutionResult> pending = companyResolverService.getPendingClarification(sessionKey);
        String rawName = intent.getCompanyName() != null && !intent.getCompanyName().isBlank()
            ? intent.getCompanyName()
            : (intent.getTaxId() != null && !intent.getTaxId().isBlank() ? intent.getTaxId() : req.getMessage());

        CompanyResolutionResult resolved;
        if (req.getWebsite() != null && !req.getWebsite().isBlank()) {
            resolved = CompanyResolutionResult.builder()
                .normalizedName(rawName).suggestedFullName(rawName)
                .countryIso2(intent.getCountry())
                .ambiguous(false).vietnam(false)
                .alternatives(List.of())
                .build();
        } else {
            resolved = companyResolverService.resolve(rawName,
                pending.map(companyResolverService::buildContextFromPending).orElse(null));
        }

        if (pending.isPresent()) companyResolverService.clearPendingClarification(sessionKey);
        return resolved;
    }

    /**
     * SSE payload for a "clarify" event: the free-text alternatives CompanyResolverService
     * already produced, plus — new — a real web-search candidate list (name/website/taxId
     * per hit) so the chat UI can show an actual pick-one list instead of only asking the
     * user to type more details.
     */
    java.util.Map<String, Object> buildClarifyData(CompanyResolutionResult resolved) {
        java.util.Map<String, Object> data = new java.util.HashMap<>();
        data.put("alternatives", resolved.getAlternatives());
        data.put("pending", true);
        try {
            List<LeadResult> candidates = findPartnersService.searchCandidatesByName(
                resolved.getNormalizedName(), resolved.getCountryIso2());
            if (!candidates.isEmpty()) data.put("candidates", candidates);
        } catch (Exception e) {
            log.debug("Candidate search failed for '{}': {}", resolved.getNormalizedName(), e.getMessage());
        }
        return data;
    }

    /**
     * Lightweight P1(+P6)-only lookup. No quota cost.
     * Chạy CompanyResolverService trước để xử lý tên mơ hồ và detect VN vs quốc tế.
     */
    private String handleLookup(UUID userId, IntentResult intent, ReportDTO.ChatMessageRequest req,
                               SseEmitter emitter) throws Exception {
        String sessionKey = req.getSessionId() != null && !req.getSessionId().isBlank()
            ? req.getSessionId() : userId.toString();

        CompanyResolutionResult resolved = resolveCompany(sessionKey, intent, req);

        // Tên mơ hồ → hỏi lại, không chạy crawler
        if (resolved.isAmbiguous()) {
            companyResolverService.savePendingClarification(sessionKey, resolved);
            String clarifyMsg = companyResolverService.buildClarifyMessage(resolved);
            sendEvent(emitter, AgentEvent.done("clarify", clarifyMsg, buildClarifyData(resolved)));
            return clarifyMsg;
        }

        // Xác định tên và quốc gia từ kết quả resolver
        String effectiveName = resolved.isVietnam() && resolved.getNormalizedName() != null
            ? resolved.getNormalizedName() : resolved.getSuggestedFullName();
        if (effectiveName == null || effectiveName.isBlank()) effectiveName = resolved.getNormalizedName();

        String country = resolved.getCountryIso2() != null
            ? resolved.getCountryIso2()
            : (intent.getCountry() != null && !intent.getCountry().isBlank() ? intent.getCountry() : null);

        CompanyInput input = CompanyInput.builder()
            .companyName(effectiveName)
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
        // 1. Resolve company name TRƯỚC khi hỏi xác nhận — tránh hỏi xác nhận rồi vẫn phải hỏi lại tên
        String sessionKey = sessionKeyOf(userId, req);

        CompanyResolutionResult resolved = resolveCompany(sessionKey, intent, req);

        if (resolved.isAmbiguous()) {
            companyResolverService.savePendingClarification(sessionKey, resolved);
            String clarifyMsg = companyResolverService.buildClarifyMessage(resolved);
            sendEvent(emitter, AgentEvent.done("clarify", clarifyMsg, buildClarifyData(resolved)));
            return clarifyMsg;
        }

        String effectiveName = resolved.isVietnam() && resolved.getNormalizedName() != null
            ? resolved.getNormalizedName() : resolved.getSuggestedFullName();
        if (effectiveName == null || effectiveName.isBlank()) effectiveName = resolved.getNormalizedName();

        String country = resolved.getCountryIso2() != null
            ? resolved.getCountryIso2()
            : (intent.getCountry() != null && !intent.getCountry().isBlank() ? intent.getCountry() : null);

        // The dedicated pre-scan form (/verify) already collects deal info via an
        // explicit form + submit click — that IS the user's confirmation, so it
        // sends confirmVerify=true on the very first call and skips the propose/ask
        // step below entirely (no pending record needed).
        if (Boolean.TRUE.equals(req.getConfirmVerify())) {
            return executeVerify(userId, effectiveName, country, intent.getTaxId(),
                req.getContractId(), req.getWebsite(), req, emitter);
        }

        // 2. Không trừ quota ngay — hỏi xác nhận trước, vì SePay không auto-charge
        // được, quota là tài nguyên đã trả tiền, và quét mất 5-8 phút không hủy được.
        // Đây cũng là chỗ mời đính hợp đồng để P7 được chấm điểm thật ngay lần này.
        PendingVerifyConfirm confirm = PendingVerifyConfirm.builder()
            .companyNames(List.of(effectiveName))
            .countries(List.of(country == null ? "" : country))
            .taxId(intent.getTaxId())
            .contractId(req.getContractId())
            .website(req.getWebsite())
            .quotaCost(quotaCost)
            .build();
        savePendingVerifyConfirm(sessionKey, confirm);

        int quotaRemaining = quotaService.getStatus(userId).getQuotaRemaining();
        String confirmMsg = "Quét sâu \"" + effectiveName + "\" sẽ dùng " + quotaCost
            + " lượt quota (còn " + quotaRemaining + "), mất khoảng 5-8 phút. "
            + "Bạn có thể đính kèm hợp đồng để P7 được chấm điểm thật ngay lần này. Xác nhận chạy?";
        sendEvent(emitter, AgentEvent.done("confirm", confirmMsg, java.util.Map.of(
            "pending", true, "companyName", effectiveName,
            "quotaCost", quotaCost, "quotaRemaining", quotaRemaining, "canAttachContract", true)));
        return confirmMsg;
    }

    /** The part of handleVerify that actually spends quota and runs the pipeline — only reached after user confirmation. */
    private String executeVerify(UUID userId, String companyName, String country, String taxId,
                                UUID contractId, String website, ReportDTO.ChatMessageRequest req,
                                SseEmitter emitter) throws Exception {
        quotaService.checkAndDeduct(userId);

        Users user = requireUser(userId);
        CompanyInput input = CompanyInput.builder()
            .companyName(companyName)
            .country(country)
            .taxId(taxId)
            .website(website)
            .build();

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

        // Self-reported "Thông tin giao dịch" from the pre-scan form — reference
        // only, written straight to the report row, NEVER passed into CompanyInput/
        // scoring (see CompanyInput's note on why self-report can't be trusted).
        boolean hasSelfReport = req.getDepositPercentage() != null || req.getHasWrittenContract() != null
            || (req.getPaymentMethodSafety() != null && !req.getPaymentMethodSafety().isBlank())
            || req.getDealValueUsd() != null;
        if (hasSelfReport) {
            report.setSelfReportDepositPercentage(req.getDepositPercentage() != null
                ? req.getDepositPercentage().shortValue() : null);
            report.setSelfReportHasWrittenContract(req.getHasWrittenContract());
            report.setSelfReportPaymentMethodSafety(req.getPaymentMethodSafety());
            report.setSelfReportDealValueUsd(req.getDealValueUsd() != null
                ? java.math.BigDecimal.valueOf(req.getDealValueUsd()) : null);
            report = reportRepo.save(report);
        }

        // A contract already picked/uploaded in the library (before this report
        // existed) — link + cross-check it now, right before scoring runs, so the
        // very first pipeline pass already sees a real, verified P7 contract via
        // ContractP7Mapper. Best-effort: a bad/foreign contractId must not block
        // the verification itself.
        if (contractId != null) {
            try {
                contractLinkService.linkBeforeScoring(reportId, contractId, userId);
            } catch (Exception e) {
                log.warn("Failed to pre-link contract {} to new report {}: {}",
                    contractId, reportId, e.getMessage());
            }
        }

        sendEvent(emitter, AgentEvent.thinking("manager", "Bắt đầu thẩm định " + input.getCompanyName() + " | Report ID: " + reportId));

        CompletableFuture<ScoringResult> future = scoringEngine.runAsync(reportId, input, userId, json -> {
            try {
                emitter.send(SseEmitter.event().data(json));
            } catch (Exception ex) {
                log.warn("SSE send failed (scoringEngine callback): {}", ex.getMessage());
            }
        });

        ScoringResult result = joinWithHeartbeat(future, emitter);

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
        String sessionKey = sessionKeyOf(userId, req);
        String message = req.getMessage();
        String[] parts = message.split(" vs | VS | và | and ");
        String company1 = parts.length > 0 ? parts[0].trim() : intent.getCompanyName();
        String company2 = parts.length > 1 ? parts[1].trim() : "";

        if (company1 == null || company1.isBlank() || company2.isBlank()) {
            String msg = "Bạn muốn so sánh 2 công ty nào? Ví dụ: \"Công ty A vs Công ty B\".";
            sendEvent(emitter, AgentEvent.done("manager", msg, null));
            return msg;
        }

        PendingVerifyConfirm confirm = PendingVerifyConfirm.builder()
            .companyNames(List.of(company1, company2))
            .countries(List.of("", ""))
            .quotaCost(2)
            .build();
        savePendingVerifyConfirm(sessionKey, confirm);

        int quotaRemaining = quotaService.getStatus(userId).getQuotaRemaining();
        String confirmMsg = "So sánh \"" + company1 + "\" và \"" + company2 + "\" sẽ dùng 2 lượt quota (còn "
            + quotaRemaining + "), chạy song song ~5-8 phút. Xác nhận chạy?";
        sendEvent(emitter, AgentEvent.done("confirm", confirmMsg, java.util.Map.of(
            "pending", true, "companyNames", List.of(company1, company2),
            "quotaCost", 2, "quotaRemaining", quotaRemaining)));
        return confirmMsg;
    }

    /** Runs two Deep Verify pipelines in parallel — only reached after user confirmation. */
    private String executeCompare(UUID userId, String company1, String company2, SseEmitter emitter) throws Exception {
        quotaService.checkAndDeduct(userId);
        quotaService.checkAndDeduct(userId);

        Users user = requireUser(userId);
        sendEvent(emitter, AgentEvent.thinking("manager",
            "Đang thẩm định song song " + company1 + " và " + company2 + "..."));

        UUID reportId1 = createReportRow(user, company1);
        UUID reportId2 = createReportRow(user, company2);

        CompletableFuture<ScoringResult> f1 = scoringEngine.runAsync(
            reportId1, CompanyInput.builder().companyName(company1).build(), userId, json -> {});
        CompletableFuture<ScoringResult> f2 = scoringEngine.runAsync(
            reportId2, CompanyInput.builder().companyName(company2).build(), userId, json -> {});

        CompletableFuture<Void> both = CompletableFuture.allOf(f1, f2);
        joinWithHeartbeat(both, emitter);
        ScoringResult r1 = f1.join();
        ScoringResult r2 = f2.join();

        String message = buildCompareMessage(company1, reportId1, r1, company2, reportId2, r2);
        java.util.Map<String, Object> data = new java.util.HashMap<>();
        data.put("company1", java.util.Map.of("reportId", reportId1,
            "overallScore", r1 != null ? r1.getOverallScore() : 0, "riskLevel", r1 != null ? r1.getRiskLevel() : "N/A"));
        data.put("company2", java.util.Map.of("reportId", reportId2,
            "overallScore", r2 != null ? r2.getOverallScore() : 0, "riskLevel", r2 != null ? r2.getRiskLevel() : "N/A"));
        sendEvent(emitter, AgentEvent.done("manager", message, data));
        return message;
    }

    private UUID createReportRow(Users user, String companyName) {
        Report report = new Report();
        report.setUser(user);
        report.setEntityName(companyName);
        report.setTier("standard");
        report.setHardStop(false);
        report.setStatus("DEEP_SCANNING");
        report.setSource("MANUAL");
        report.setQuickScanDone(false);
        report.setCreatedAt(Instant.now());
        report.setUpdatedAt(Instant.now());
        return reportRepo.save(report).getId();
    }

    private String buildCompareMessage(String company1, UUID reportId1, ScoringResult r1,
                                      String company2, UUID reportId2, ScoringResult r2) {
        StringBuilder sb = new StringBuilder("So sánh kết quả:\n");
        sb.append("- ").append(company1).append(": ")
          .append(r1 != null ? Math.round(r1.getOverallScore()) + "/100 (" + r1.getRiskLevel() + ")" : "lỗi thẩm định")
          .append(" | /reports/").append(reportId1).append("\n");
        sb.append("- ").append(company2).append(": ")
          .append(r2 != null ? Math.round(r2.getOverallScore()) + "/100 (" + r2.getRiskLevel() + ")" : "lỗi thẩm định")
          .append(" | /reports/").append(reportId2);
        if (r1 != null && r2 != null) {
            String better = r1.getOverallScore() >= r2.getOverallScore() ? company1 : company2;
            sb.append("\n→ ").append(better).append(" có điểm rủi ro tốt hơn.");
        }
        return sb.toString();
    }

    /** Resumes a confirmed pending VERIFY_PARTNER/COMPARE_PARTNERS request. */
    private String resumePendingVerify(UUID userId, PendingVerifyConfirm pending,
                                      ReportDTO.ChatMessageRequest req, SseEmitter emitter) throws Exception {
        if (pending.getQuotaCost() == 2 && pending.getCompanyNames().size() == 2) {
            return executeCompare(userId, pending.getCompanyNames().get(0), pending.getCompanyNames().get(1), emitter);
        }
        String companyName = pending.getCompanyNames().get(0);
        String country = pending.getCountries() != null && !pending.getCountries().isEmpty()
            && !pending.getCountries().get(0).isBlank() ? pending.getCountries().get(0) : null;
        UUID contractId = req.getContractId() != null ? req.getContractId() : pending.getContractId();
        String website = req.getWebsite() != null ? req.getWebsite() : pending.getWebsite();
        return executeVerify(userId, companyName, country, pending.getTaxId(), contractId, website, req, emitter);
    }

    /** Blocks the calling (background executor) thread until done, sending SSE heartbeats to survive proxy timeouts. */
    private <T> T joinWithHeartbeat(CompletableFuture<T> future, SseEmitter emitter) {
        var heartbeat = heartbeatExecutor.scheduleAtFixedRate(() -> {
            if (future.isDone()) return;
            try {
                emitter.send(SseEmitter.event().comment("heartbeat"));
            } catch (Exception e) {
                log.debug("Heartbeat send failed (client likely disconnected): {}", e.getMessage());
            }
        }, 10, 10, TimeUnit.SECONDS);
        try {
            return future.join();
        } finally {
            heartbeat.cancel(false);
        }
    }

    private String sessionKeyOf(UUID userId, ReportDTO.ChatMessageRequest req) {
        return req.getSessionId() != null && !req.getSessionId().isBlank() ? req.getSessionId() : userId.toString();
    }

    // ── Pending verify confirmation (Redis, same pattern as CompanyResolverService) ──

    private static final Duration PENDING_VERIFY_CONFIRM_TTL = Duration.ofMinutes(5);
    private static final String PENDING_VERIFY_CONFIRM_PREFIX = "pending_verify_confirm:";

    private Optional<PendingVerifyConfirm> getPendingVerifyConfirm(String sessionKey) {
        return cacheService.get(PENDING_VERIFY_CONFIRM_PREFIX + sessionKey, PendingVerifyConfirm.class);
    }

    private void savePendingVerifyConfirm(String sessionKey, PendingVerifyConfirm confirm) {
        cacheService.setRedisOnly(PENDING_VERIFY_CONFIRM_PREFIX + sessionKey, confirm, PENDING_VERIFY_CONFIRM_TTL);
    }

    private void clearPendingVerifyConfirm(String sessionKey) {
        cacheService.delete(PENDING_VERIFY_CONFIRM_PREFIX + sessionKey);
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

        String userPrompt = (reportContext.isBlank() ? "" : "[BÁO CÁO]\n" + reportContext + "\n\n")
            + "[CÂU HỎI]\n" + req.getMessage();

        String reply = geminiService.callWithSystemPrompt(MarketScoutPrompts.EXPLAIN_REPORT_SYSTEM, userPrompt);
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
package com.example.backend.chat;

import com.example.backend.shared.cache.CacheService;
import com.example.backend.shared.gemini.GeminiService;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.util.List;
import java.util.Optional;

/**
 * Phân giải tên công ty từ tin nhắn user trước khi gọi crawler.
 *
 * Giải quyết vấn đề 2 (tên mơ hồ) và vấn đề 3 (route sai VN vs quốc tế).
 * Dùng Gemini với prompt 7 quy tắc để xác định: ambiguous?, isVietnam?, countryIso2?
 * Nếu ambiguous → lưu pending vào Redis (TTL 5 phút) và trả về để ChatService gửi SSE "clarify".
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class CompanyResolverService {

    private static final Duration PENDING_TTL = Duration.ofMinutes(5);
    private static final String PENDING_KEY_PREFIX = "pending_clarify:";

    private static final String RESOLVER_SYSTEM_PROMPT = """
        Bạn là service phân giải tên công ty cho hệ thống thẩm định đối tác thương mại.
        Nhiệm vụ: phân tích tên công ty từ tin nhắn và trả về JSON duy nhất, không kèm text khác.

        ## 7 quy tắc cốt lõi
        1. Không tự bịa mã số thuế/LEI — chỉ suy luận tên và quốc gia khả dĩ.
        2. Tên gõ sai gần giống thương hiệu nổi tiếng → sửa gợi ý nhưng vẫn đánh dấu ambiguous=true.
        3. Chỉ ambiguous=false khi có hậu tố pháp lý (TNHH, JSC, Corp, Inc, Ltd, Cổ phần...), hoặc quốc gia cụ thể, hoặc MST/mã số đi kèm.
        4. Tên ngắn (≤2 từ), không hậu tố, không quốc gia → luôn ambiguous=true, kể cả khi nhận ra ngay là thương hiệu nổi tiếng (Apple, Google, Samsung...).
        5. isVietnam chỉ = true khi có dấu hiệu VN rõ ràng: MST, hậu tố TNHH/Cổ phần/Hợp danh/DNTN, địa danh VN cụ thể, hoặc từ "Việt Nam" trong tên. KHÔNG suy luận theo ngôn ngữ của tin nhắn.
        6. Luôn đưa 1-3 gợi ý trong alternatives khi ambiguous=true.
        7. Chỉ trả JSON, không kèm text giải thích khác. Không bọc trong markdown code block.

        ## Schema JSON output
        {
          "normalizedName": "tên đã chuẩn hóa từ input",
          "suggestedFullName": "tên đầy đủ với hậu tố pháp lý nếu biết, hoặc giống normalizedName nếu không rõ",
          "countryIso2": "VN" hoặc "US" hoặc null,
          "ambiguous": true hoặc false,
          "isVietnam": true hoặc false,
          "alternatives": ["gợi ý 1", "gợi ý 2"]
        }
        """;

    private final GeminiService geminiService;
    private final CacheService cacheService;
    private final ObjectMapper objectMapper;

    /**
     * Phân giải tên công ty. Gọi Gemini với prompt 7 quy tắc.
     *
     * @param companyNameOrMessage tên công ty (đã extract từ intent) hoặc raw message nếu không extract được
     * @param pendingContext       chuỗi ngữ cảnh từ lần hỏi trước (null nếu không có pending)
     * @return kết quả phân giải; fallback về không-ambiguous nếu Gemini lỗi
     */
    public CompanyResolutionResult resolve(String companyNameOrMessage, String pendingContext) {
        try {
            String userPrompt = pendingContext != null && !pendingContext.isBlank()
                ? "[Ngữ cảnh câu trả lời chờ làm rõ]\n" + pendingContext + "\n\n[Tin nhắn mới của user]\n" + companyNameOrMessage
                : companyNameOrMessage;

            String raw = geminiService.callWithSystemPromptLowTemp(RESOLVER_SYSTEM_PROMPT, userPrompt);
            return parseResult(raw, companyNameOrMessage);

        } catch (Exception e) {
            log.warn("CompanyResolverService.resolve failed for '{}': {} — passing through as-is", companyNameOrMessage, e.getMessage());
            return CompanyResolutionResult.builder()
                .normalizedName(companyNameOrMessage)
                .suggestedFullName(companyNameOrMessage)
                .countryIso2(null)
                .ambiguous(false)
                .vietnam(false)
                .alternatives(List.of())
                .build();
        }
    }

    public void savePendingClarification(String sessionKey, CompanyResolutionResult result) {
        cacheService.setRedisOnly(PENDING_KEY_PREFIX + sessionKey, result, PENDING_TTL);
    }

    public Optional<CompanyResolutionResult> getPendingClarification(String sessionKey) {
        return cacheService.get(PENDING_KEY_PREFIX + sessionKey, CompanyResolutionResult.class);
    }

    public void clearPendingClarification(String sessionKey) {
        cacheService.delete(PENDING_KEY_PREFIX + sessionKey);
    }

    public String buildContextFromPending(CompanyResolutionResult pending) {
        StringBuilder sb = new StringBuilder("Đang chờ làm rõ về công ty: \"")
            .append(pending.getNormalizedName()).append("\"");
        if (pending.getAlternatives() != null && !pending.getAlternatives().isEmpty()) {
            sb.append(" | Các gợi ý đã đưa ra: ").append(String.join(", ", pending.getAlternatives()));
        }
        return sb.toString();
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private CompanyResolutionResult parseResult(String raw, String fallbackName) {
        try {
            String json = extractJson(raw);
            var node = objectMapper.readTree(json);

            String normalizedName = node.path("normalizedName").asText("").trim();
            String suggestedFullName = node.path("suggestedFullName").asText("").trim();
            String countryIso2 = node.path("countryIso2").isNull() ? null : node.path("countryIso2").asText(null);
            boolean ambiguous = node.path("ambiguous").asBoolean(false);
            boolean isVietnam = node.path("isVietnam").asBoolean(false);

            List<String> alternatives = List.of();
            if (node.has("alternatives") && node.path("alternatives").isArray()) {
                alternatives = objectMapper.convertValue(
                    node.path("alternatives"),
                    objectMapper.getTypeFactory().constructCollectionType(List.class, String.class));
            }

            if (normalizedName.isBlank()) normalizedName = fallbackName;
            if (suggestedFullName.isBlank()) suggestedFullName = normalizedName;

            // Đồng bộ countryIso2 với isVietnam
            if (isVietnam && (countryIso2 == null || countryIso2.isBlank())) countryIso2 = "VN";

            log.debug("CompanyResolver: '{}' → normalized='{}' ambiguous={} vietnam={} country={}",
                fallbackName, normalizedName, ambiguous, isVietnam, countryIso2);

            return CompanyResolutionResult.builder()
                .normalizedName(normalizedName)
                .suggestedFullName(suggestedFullName)
                .countryIso2(countryIso2)
                .ambiguous(ambiguous)
                .vietnam(isVietnam)
                .alternatives(alternatives)
                .build();

        } catch (Exception e) {
            log.warn("CompanyResolverService.parseResult failed: {} — raw={}", e.getMessage(), raw);
            return CompanyResolutionResult.builder()
                .normalizedName(fallbackName)
                .suggestedFullName(fallbackName)
                .countryIso2(null)
                .ambiguous(false)
                .vietnam(false)
                .alternatives(List.of())
                .build();
        }
    }

    private String extractJson(String raw) {
        if (raw == null) return "{}";
        String trimmed = raw.trim();
        // Bỏ markdown code block nếu Gemini trả về ```json ... ```
        if (trimmed.startsWith("```")) {
            int start = trimmed.indexOf('{');
            int end = trimmed.lastIndexOf('}');
            if (start >= 0 && end > start) return trimmed.substring(start, end + 1);
        }
        int start = trimmed.indexOf('{');
        int end = trimmed.lastIndexOf('}');
        if (start >= 0 && end > start) return trimmed.substring(start, end + 1);
        return "{}";
    }
}

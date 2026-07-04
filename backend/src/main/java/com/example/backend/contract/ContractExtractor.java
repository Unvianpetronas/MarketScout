package com.example.backend.contract;

import com.example.backend.shared.gemini.GeminiJsonUtil;
import com.example.backend.shared.gemini.GeminiService;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Reads a contract file (PDF/image) via Gemini and extracts the fields P7
 * cross-checking needs, each tagged with a confidence + source snippet so the
 * user (and the scoring gate) can tell how sure the AI was.
 *
 * Unlike FactExtractor there is no rule-based fallback on failure — there is
 * no structured source to fall back to for a scanned contract, so a failure
 * here means extraction_status=FAILED (README §5.6).
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ContractExtractor {

    private static final String SYSTEM_PROMPT = """
        Bạn là Contract Extraction Agent.
        Nhiệm vụ: Đọc file hợp đồng thương mại quốc tế đính kèm và trích xuất chính xác các trường yêu cầu.
        KHÔNG suy diễn thông tin không có trong hợp đồng. Nếu không tìm thấy trường nào → value: null, confidence: 0.
        Với mỗi trường, "sourceText" phải là đoạn trích nguyên văn (ngắn) trong hợp đồng chứng minh giá trị đó.
        "confidence" là số thực từ 0 đến 1 thể hiện mức độ chắc chắn của bạn.
        Trả về JSON thuần túy, KHÔNG markdown, KHÔNG giải thích.
        """;

    private static final String USER_PROMPT = """
        [YÊU CẦU OUTPUT — JSON THUẦN TÚY]
        {
          "incoterms": {"value": String|null, "confidence": Number, "sourceText": String|null},
          "depositPercent": {"value": Number|null, "confidence": Number, "sourceText": String|null},
          "paymentMethod": {"value": String|null, "confidence": Number, "sourceText": String|null},
          "hasArbitrationClause": {"value": Boolean|null, "confidence": Number, "sourceText": String|null},
          "signatoryName": {"value": String|null, "confidence": Number, "sourceText": String|null},
          "signatoryTaxId": {"value": String|null, "confidence": Number, "sourceText": String|null}
        }
        """;

    private final GeminiService geminiService;
    private final ObjectMapper objectMapper;

    public record Result(boolean success, String extractedDataJson) {}

    public Result extract(byte[] fileBytes, String mimeType) {
        try {
            String raw = geminiService.callWithSystemPromptMultimodal(SYSTEM_PROMPT, USER_PROMPT, fileBytes, mimeType);
            String json = GeminiJsonUtil.extractJson(raw);
            JsonNode node = objectMapper.readTree(json); // validate shape before persisting
            Map<String, Object> normalized = new LinkedHashMap<>();
            node.fields().forEachRemaining(e -> normalized.put(e.getKey(), e.getValue()));
            return new Result(true, objectMapper.writeValueAsString(normalized));
        } catch (Exception e) {
            log.warn("Contract extraction failed: {}", e.getMessage());
            return new Result(false, "{}");
        }
    }
}

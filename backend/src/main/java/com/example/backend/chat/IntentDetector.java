package com.example.backend.chat;

import com.example.backend.shared.model.agent.IntentResult;
import com.example.backend.shared.gemini.GeminiService;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

@Slf4j
@Service
@RequiredArgsConstructor
public class IntentDetector {

    private static final String SYSTEM_PROMPT = """
        Bạn là Manager Agent của MarketScout AI.
        Nhiệm vụ: Phân tích message từ user và trả về JSON phân loại intent.
        CHỈ trả về JSON thuần túy, KHÔNG markdown, KHÔNG giải thích.

        Các intent có thể:
        - FIND_BUYER: tìm buyer, tìm khách hàng, người mua, nhà nhập khẩu
        - FIND_SELLER: tìm nhà cung cấp, tìm người bán, supplier, nhà xuất khẩu
        - VERIFY_PARTNER: thẩm định, xác minh, kiểm tra công ty
        - COMPARE_PARTNERS: so sánh, A vs B, cái nào tốt hơn
        - EXPLAIN_REPORT: tại sao điểm thấp, giải thích điểm, kết quả báo cáo
        - GENERAL_QA: LC là gì, FOB là gì, Incoterms, tư vấn thương mại

        Output format (JSON thuần túy):
        {
          "intent": "FIND_BUYER",
          "params": {
            "product": "gỗ",
            "market": "Nhật Bản",
            "role": "BUYER",
            "companyName": null,
            "country": null,
            "taxId": null
          },
          "reply": null
        }

        Với GENERAL_QA, điền "reply" với câu trả lời ngắn gọn.
        """;

    private final GeminiService geminiService;
    private final ObjectMapper objectMapper;

    public IntentResult detect(String userMessage) {
        try {
            String raw = geminiService.callWithSystemPromptLowTemp(SYSTEM_PROMPT, userMessage);
            String json = extractJson(raw);
            var node = objectMapper.readTree(json);
            IntentResult result = new IntentResult();
            result.setIntent(node.path("intent").asText("GENERAL_QA"));
            var params = node.path("params");
            if (!params.isMissingNode()) {
                result.setProduct(nullIfNull(params.path("product").asText(null)));
                result.setMarket(nullIfNull(params.path("market").asText(null)));
                result.setRole(nullIfNull(params.path("role").asText(null)));
                result.setCompanyName(nullIfNull(params.path("companyName").asText(null)));
                result.setCountry(nullIfNull(params.path("country").asText(null)));
                result.setTaxId(nullIfNull(params.path("taxId").asText(null)));
            }
            result.setReply(nullIfNull(node.path("reply").asText(null)));
            log.info("Intent detected: {} for message: {}", result.getIntent(), userMessage);
            return result;
        } catch (Exception e) {
            log.warn("Intent detection failed, using fallback: {}", e.getMessage());
            return fallback(userMessage);
        }
    }

    private IntentResult fallback(String msg) {
        String lower = msg.toLowerCase();
        IntentResult r = new IntentResult();
        if (lower.contains("tim") && (lower.contains("buyer") || lower.contains("khach hang") || lower.contains("nguoi mua") || lower.contains("nhập khẩu"))) {
            r.setIntent("FIND_BUYER");
        } else if (lower.contains("tim") && (lower.contains("seller") || lower.contains("nha cung cap") || lower.contains("nguoi ban") || lower.contains("supplier"))) {
            r.setIntent("FIND_SELLER");
        } else if (lower.contains("tham dinh") || lower.contains("xac minh") || lower.contains("kiem tra cong ty") || lower.contains("thẩm định") || lower.contains("xác minh")) {
            r.setIntent("VERIFY_PARTNER");
        } else if (lower.contains("so sanh") || lower.contains("vs ") || lower.contains("so sánh")) {
            r.setIntent("COMPARE_PARTNERS");
        } else if (lower.contains("tai sao") || lower.contains("giai thich") || lower.contains("tại sao") || lower.contains("giải thích") || lower.contains("diem")) {
            r.setIntent("EXPLAIN_REPORT");
        } else {
            r.setIntent("GENERAL_QA");
        }
        return r;
    }

    private String extractJson(String raw) {
        int start = raw.indexOf('{');
        int end = raw.lastIndexOf('}');
        if (start != -1 && end != -1 && end > start) {
            return raw.substring(start, end + 1);
        }
        return raw;
    }

    private String nullIfNull(String value) {
        return "null".equals(value) || value == null || value.isBlank() ? null : value;
    }
}

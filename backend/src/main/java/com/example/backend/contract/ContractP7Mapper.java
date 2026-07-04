package com.example.backend.contract;

import com.example.backend.domain.AssessmentContractLink;
import com.example.backend.domain.AssessmentContractLinkRepository;
import com.example.backend.domain.Contract;
import com.example.backend.domain.Report;
import com.example.backend.shared.model.scoring.FactJson;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

/**
 * Resolves the real P7Facts a report's currently-verified contract should
 * contribute to scoring, per README_contract_verification_feature.md §3.4.
 *
 * A field only counts if: the link is VERIFIED, the field has no override
 * (or its override is explicitly verified=true), and its extraction
 * confidence clears the configured threshold. Anything short of that and the
 * field is left null — same as today's SKIP behavior, just per-field instead
 * of per-report.
 */
@Service
@RequiredArgsConstructor
public class ContractP7Mapper {

    @Value("${app.scoring.p7-confidence-threshold:0.75}")
    private double confidenceThreshold;

    private final AssessmentContractLinkRepository linkRepository;
    private final ObjectMapper objectMapper;

    /** Returns null (→ P7 stays SKIP) when there is no currently-verified contract. */
    public FactJson.P7Facts resolve(Report report) {
        Contract contract = report.getP7VerifiedContract();
        if (contract == null) return null;

        AssessmentContractLink link = linkRepository
                .findByReport_IdAndContract_Id(report.getId(), contract.getId())
                .orElse(null);
        if (link == null || !"VERIFIED".equals(link.getVerificationStatus())) return null;

        JsonNode data = parseJson(contract.getExtractedData());
        JsonNode overrides = parseJson(link.getFieldOverrides());

        Integer depositPercentage = null;
        JsonNode depositField = data.path("depositPercent");
        if (isFieldUsable(depositField, overrides, "depositPercent")) {
            JsonNode value = depositField.path("value");
            if (value.isNumber()) depositPercentage = value.asInt();
        }

        String paymentMethodSafety = null;
        JsonNode paymentField = data.path("paymentMethod");
        if (isFieldUsable(paymentField, overrides, "paymentMethod")) {
            JsonNode value = paymentField.path("value");
            paymentMethodSafety = classifyPaymentMethod(value.isTextual() ? value.asText() : null);
        }

        // The link itself being VERIFIED already implies a real signed contract
        // exists and matched — this is a report-level fact, not gated per-field.
        return FactJson.P7Facts.builder()
                .hasWrittenContract(true)
                .depositPercentage(depositPercentage)
                .paymentMethodSafety(paymentMethodSafety)
                .build();
    }

    private boolean isFieldUsable(JsonNode fieldNode, JsonNode overrides, String fieldName) {
        if (fieldNode == null || fieldNode.isMissingNode()) return false;
        JsonNode override = overrides.path(fieldName);
        if (!override.isMissingNode()) {
            boolean overrideVerified = override.path("verified").asBoolean(false);
            if (!overrideVerified) return false;
        }
        double confidence = fieldNode.path("confidence").isNumber() ? fieldNode.path("confidence").asDouble() : 0.0;
        return confidence >= confidenceThreshold;
    }

    /**
     * Extracted payment method is free text (e.g. "T/T sau B/L") — classify it
     * with a keyword table rather than a second Gemini call per link.
     */
    static String classifyPaymentMethod(String text) {
        if (text == null || text.isBlank()) return null;
        String t = text.toLowerCase();
        if (t.contains("l/c") || t.contains("letter of credit") || t.contains("thư tín dụng") || t.contains("escrow")) {
            return "SAFE";
        }
        boolean fullAdvance = t.contains("100%") && (t.contains("trả trước") || t.contains("đặt cọc"));
        if (fullAdvance || t.contains("tiền mặt") || t.contains("cash in advance")) {
            return "RISKY";
        }
        return "MODERATE";
    }

    private JsonNode parseJson(String json) {
        if (json == null || json.isBlank()) return objectMapper.createObjectNode();
        try {
            return objectMapper.readTree(json);
        } catch (Exception e) {
            return objectMapper.createObjectNode();
        }
    }
}

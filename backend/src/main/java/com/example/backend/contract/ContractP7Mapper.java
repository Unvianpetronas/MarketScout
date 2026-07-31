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
            depositPercentage = normalizeDepositPercent(depositField.path("value"));
        }

        String paymentMethodSafety = null;
        JsonNode paymentField = data.path("paymentMethod");
        if (isFieldUsable(paymentField, overrides, "paymentMethod")) {
            JsonNode value = paymentField.path("value");
            paymentMethodSafety = classifyPaymentMethod(value.isTextual() ? value.asText() : null);
        }

        // Contract value only counts when the contract is denominated in USD. No FX
        // rate is applied: a converted figure would be a number we invented, and the
        // rest of this class exists to keep invented numbers out of scoring.
        Double dealValueUsd = null;
        JsonNode valueField = data.path("contractValue");
        if (isFieldUsable(valueField, overrides, "contractValue")
                && isFieldUsable(data.path("contractCurrency"), overrides, "contractCurrency")) {
            JsonNode currency = data.path("contractCurrency").path("value");
            JsonNode amount = valueField.path("value");
            if (amount.isNumber() && currency.isTextual() && "USD".equalsIgnoreCase(currency.asText().trim())) {
                double v = amount.asDouble();
                if (v > 0) dealValueUsd = v;
            }
        }

        // The link itself being VERIFIED already implies a real signed contract
        // exists and matched — this is a report-level fact, not gated per-field.
        return FactJson.P7Facts.builder()
                .hasWrittenContract(true)
                .depositPercentage(depositPercentage)
                .paymentMethodSafety(paymentMethodSafety)
                .dealValueUsd(dealValueUsd)
                .build();
    }

    /**
     * A deposit is a percentage, but models express it either way — 0.3 and 30 both
     * mean 30%. `asInt()` on 0.3 truncated to 0, which the rubric then rewarded as a
     * "reasonable deposit (0%)". Values outside 0-100 are nonsense, so drop them
     * rather than let a misread scale the score.
     */
    static Integer normalizeDepositPercent(JsonNode value) {
        if (value == null || !value.isNumber()) return null;
        double d = value.asDouble();
        if (d > 0 && d < 1) d *= 100;          // 0.3 → 30%
        long rounded = Math.round(d);
        if (rounded < 0 || rounded > 100) return null;
        return (int) rounded;
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
     *
     * Risky terms are tested BEFORE safe ones: "100% advance, no L/C" contains
     * "l/c" and used to come out SAFE. The advance-payment test also used to
     * require Vietnamese wording, so an English "100% advance payment" — the
     * single most common scam structure in export trade — was scored MODERATE.
     */
    static String classifyPaymentMethod(String text) {
        if (text == null || text.isBlank()) return null;
        String t = text.toLowerCase();

        boolean fullAdvance = (t.contains("100%") || t.contains("full"))
            && (t.contains("trả trước") || t.contains("đặt cọc") || t.contains("advance")
                || t.contains("prepay") || t.contains("upfront") || t.contains("before shipment"));
        boolean irreversibleRail = t.contains("western union") || t.contains("moneygram")
            || t.contains("crypto") || t.contains("usdt") || t.contains("bitcoin")
            || t.contains("tiền mặt") || t.contains("cash in advance") || t.contains("cash on hand");
        // Documentary collection and open account leave the seller unsecured.
        boolean unsecuredTerms = t.contains("d/a") || t.contains("documents against acceptance")
            || t.contains("open account") || t.contains("ghi sổ");
        if (fullAdvance || irreversibleRail || unsecuredTerms) {
            return "RISKY";
        }

        if (t.contains("l/c") || t.contains("letter of credit") || t.contains("thư tín dụng")
            || t.contains("escrow") || t.contains("tín dụng chứng từ")) {
            return "SAFE";
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

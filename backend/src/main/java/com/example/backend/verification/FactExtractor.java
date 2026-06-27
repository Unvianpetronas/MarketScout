package com.example.backend.verification;

import com.example.backend.shared.model.crawler.*;
import com.example.backend.shared.model.scoring.FactJson;
import com.example.backend.shared.gemini.GeminiService;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

@Slf4j
@Service
@RequiredArgsConstructor
public class FactExtractor {

    private static final String SYSTEM_PROMPT = """
        Bạn là Fact Extraction Agent.
        Nhiệm vụ: Đọc data thô dưới đây và trích xuất chính xác các trường yêu cầu.
        KHÔNG tính điểm. KHÔNG suy luận. Chỉ trích xuất facts từ data được cung cấp.
        Nếu không tìm thấy thông tin → để null, KHÔNG đoán.
        Trả về JSON thuần túy, KHÔNG markdown, KHÔNG giải thích.
        """;

    private static final String USER_PROMPT_TEMPLATE = """
        [DATA THÔ]
        %s

        [YÊU CẦU OUTPUT — JSON THUẦN TÚY]
        {
          "p1": {"status": "ACTIVE|INACTIVE|UNKNOWN", "age_years": Number|null, "has_legal_representative": Boolean|null, "industry_match": "MATCH|PARTIAL|NO_MATCH|null"},
          "p2": {"has_official_website": Boolean|null, "domain_age_months": Number|null, "uses_free_email": Boolean|null, "has_ssl": Boolean|null, "social_media_score": "LOW|MEDIUM|HIGH|null"},
          "p3": {"has_trade_history": Boolean|null, "shipment_count_year": Number|null, "is_industry_matched": Boolean|null, "trade_trend": "GROWING|STABLE|DECLINING|null"},
          "p4": {"identity_match_level": "COMPLETELY_MATCHED|MINOR_MISMATCH|MAJOR_MISMATCH|null", "address_verified": Boolean|null, "ceo_verified": Boolean|null},
          "p5": {"tax_compliance_status": "NORMAL|PENALIZED|DISSOLVING|null", "registered_capital_usd": Number|null, "has_financial_report": Boolean|null, "revenue_trend": "GROWING|STABLE|DECLINING|UNKNOWN|null"},
          "p6": {"is_sanction_hit": Boolean, "is_personal_account_requested": Boolean|null, "bic_verified": Boolean|null, "account_type": "CORPORATE|PERSONAL|UNKNOWN|null"},
          "p7": {"deposit_percentage": Number|null, "has_written_contract": Boolean|null, "payment_method_safety": "SAFE|MODERATE|RISKY|null", "deal_value_usd": Number|null},
          "p8": {"has_verified_location": Boolean|null, "is_stock_image_used": Boolean|null, "has_physical_evidence": Boolean|null, "employee_count_range": "MICRO|SMALL|MEDIUM|LARGE|UNKNOWN|null"}
        }
        """;

    private final GeminiService geminiService;
    private final ObjectMapper objectMapper;

    public FactJson extract(P1Data p1, P2Data p2, P3Data p3, P4Data p4,
                             P5Data p5, P6Data p6, P7Data p7, P8Data p8) {
        String rawContext = buildRawContext(p1, p2, p3, p4, p5, p6, p7, p8);
        try {
            String prompt = String.format(USER_PROMPT_TEMPLATE, rawContext);
            String raw = geminiService.callWithSystemPromptLowTemp(SYSTEM_PROMPT, prompt);
            String json = extractJson(raw);
            return parseFactJson(json, p1, p2, p3, p4, p5, p6, p7, p8);
        } catch (Exception e) {
            log.warn("FactExtractor Gemini call failed, using structural fallback: {}", e.getMessage());
            return buildFallbackFacts(p1, p2, p3, p4, p5, p6, p7, p8);
        }
    }

    private String buildRawContext(PillarData... pillars) {
        StringBuilder sb = new StringBuilder();
        String[] labels = {"P1_ENTITY", "P2_DIGITAL", "P3_TRADE", "P4_IDENTITY", "P5_FINANCIAL", "P6_SANCTIONS", "P7_DEAL", "P8_OPERATIONAL"};
        for (int i = 0; i < pillars.length; i++) {
            PillarData p = pillars[i];
            sb.append("\n[").append(labels[i]).append("]\n");
            if (p == null || p.getState() == PillarData.DataState.SKIP) {
                sb.append("STATUS: SKIP\n");
            } else if (p.getState() == PillarData.DataState.NOT_FOUND) {
                sb.append("STATUS: NOT_FOUND\n");
            } else {
                sb.append(p.getRawText() != null ? p.getRawText() : "STATUS: FOUND, no detail").append("\n");
            }
        }
        return sb.toString();
    }

    private FactJson parseFactJson(String json, P1Data p1, P2Data p2, P3Data p3, P4Data p4,
                                   P5Data p5, P6Data p6, P7Data p7, P8Data p8) {
        try {
            var node = objectMapper.readTree(json);
            FactJson f = new FactJson();

            // Only build facts for pillars whose crawler actually returned data
            // (state FOUND). When a source was SKIP/NOT_FOUND we leave the facts
            // null so the rubric marks the pillar N/A (SKIP) instead of scoring it
            // 0/FAIL — "couldn't verify" must not look like "failed verification".

            // P1
            if (p1 != null && p1.isFound()) {
                var p1n = node.path("p1");
                f.setP1(FactJson.P1Facts.builder()
                    .status(text(p1n, "status"))
                    .ageYears(doubleVal(p1n, "age_years"))
                    .hasLegalRepresentative(boolVal(p1n, "has_legal_representative"))
                    .industryMatch(text(p1n, "industry_match"))
                    .build());
            }

            // P2
            if (p2 != null && p2.isFound()) {
                var p2n = node.path("p2");
                f.setP2(FactJson.P2Facts.builder()
                    .hasOfficialWebsite(boolVal(p2n, "has_official_website"))
                    .domainAgeMonths(intVal(p2n, "domain_age_months"))
                    .usesFreeEmail(boolVal(p2n, "uses_free_email"))
                    .hasSsl(boolVal(p2n, "has_ssl"))
                    .socialMediaScore(text(p2n, "social_media_score"))
                    .build());
            }

            // P3
            if (p3 != null && p3.isFound()) {
                var p3n = node.path("p3");
                f.setP3(FactJson.P3Facts.builder()
                    .hasTradeHistory(boolVal(p3n, "has_trade_history"))
                    .shipmentCountYear(intVal(p3n, "shipment_count_year"))
                    .isIndustryMatched(boolVal(p3n, "is_industry_matched"))
                    .tradeTrend(text(p3n, "trade_trend"))
                    .build());
            }

            // P4
            if (p4 != null && p4.isFound()) {
                var p4n = node.path("p4");
                f.setP4(FactJson.P4Facts.builder()
                    .identityMatchLevel(text(p4n, "identity_match_level"))
                    .addressVerified(boolVal(p4n, "address_verified"))
                    .ceoVerified(boolVal(p4n, "ceo_verified"))
                    .build());
            }

            // P5
            if (p5 != null && p5.isFound()) {
                var p5n = node.path("p5");
                f.setP5(FactJson.P5Facts.builder()
                    .taxComplianceStatus(text(p5n, "tax_compliance_status"))
                    .registeredCapitalUsd(doubleVal(p5n, "registered_capital_usd"))
                    .hasFinancialReport(boolVal(p5n, "has_financial_report"))
                    .revenueTrend(text(p5n, "revenue_trend"))
                    .build());
            }

            // P6 — use actual P6Data for sanction hit (ground truth, not Gemini interpretation)
            if (p6 != null && p6.isFound()) {
                var p6n = node.path("p6");
                f.setP6(FactJson.P6Facts.builder()
                    .isSanctionHit(p6.isSanctioned())
                    .isPersonalAccountRequested(boolVal(p6n, "is_personal_account_requested"))
                    .bicVerified(boolVal(p6n, "bic_verified"))
                    .accountType(text(p6n, "account_type"))
                    .build());
            }

            // P7
            if (p7 != null && p7.isFound()) {
                var p7n = node.path("p7");
                f.setP7(FactJson.P7Facts.builder()
                    .depositPercentage(intVal(p7n, "deposit_percentage"))
                    .hasWrittenContract(boolVal(p7n, "has_written_contract"))
                    .paymentMethodSafety(text(p7n, "payment_method_safety"))
                    .dealValueUsd(doubleVal(p7n, "deal_value_usd"))
                    .build());
            }

            // P8
            if (p8 != null && p8.isFound()) {
                var p8n = node.path("p8");
                f.setP8(FactJson.P8Facts.builder()
                    .hasVerifiedLocation(boolVal(p8n, "has_verified_location"))
                    .isStockImageUsed(boolVal(p8n, "is_stock_image_used"))
                    .hasPhysicalEvidence(boolVal(p8n, "has_physical_evidence"))
                    .employeeCountRange(text(p8n, "employee_count_range"))
                    .build());
            }

            return f;
        } catch (Exception e) {
            log.warn("FactJson parse failed: {}", e.getMessage());
            return buildFallbackFacts(p1, p2, p3, p4, p5, p6, p7, p8);
        }
    }

    // Structural fallback — uses raw pillar data directly when Gemini fails
    private FactJson buildFallbackFacts(P1Data p1, P2Data p2, P3Data p3, P4Data p4,
                                         P5Data p5, P6Data p6, P7Data p7, P8Data p8) {
        FactJson f = new FactJson();
        if (p1 != null && p1.isFound()) {
            f.setP1(FactJson.P1Facts.builder()
                .status(p1.getStatus()).ageYears(p1.getAgeYears())
                .hasLegalRepresentative(p1.getHasLegalRepresentative()).build());
        }
        if (p2 != null && p2.isFound()) {
            f.setP2(FactJson.P2Facts.builder()
                .hasOfficialWebsite(p2.getHasOfficialWebsite()).domainAgeMonths(p2.getDomainAgeMonths())
                .usesFreeEmail(p2.getUsesFreeEmail()).hasSsl(p2.getHasSsl())
                .socialMediaScore(p2.getSocialMediaScore()).build());
        }
        if (p3 != null && p3.isFound()) {
            f.setP3(FactJson.P3Facts.builder()
                .hasTradeHistory(p3.getHasTradeHistory()).shipmentCountYear(p3.getShipmentCountYear())
                .isIndustryMatched(p3.getIsIndustryMatched()).tradeTrend(p3.getTradeTrend()).build());
        }
        if (p4 != null && p4.isFound()) {
            f.setP4(FactJson.P4Facts.builder()
                .identityMatchLevel(p4.getIdentityMatchLevel()).addressVerified(p4.getAddressVerified())
                .ceoVerified(p4.getCeoVerified()).build());
        }
        if (p5 != null && p5.isFound()) {
            f.setP5(FactJson.P5Facts.builder()
                .taxComplianceStatus(p5.getTaxComplianceStatus()).registeredCapitalUsd(p5.getRegisteredCapitalUsd())
                .hasFinancialReport(p5.getHasFinancialReport()).revenueTrend(p5.getRevenueTrend()).build());
        }
        if (p6 != null && p6.isFound()) {
            f.setP6(FactJson.P6Facts.builder().isSanctionHit(p6.isSanctioned()).build());
        }
        if (p7 != null && p7.isFound()) {
            f.setP7(FactJson.P7Facts.builder()
                .depositPercentage(p7.getDepositPercentage()).hasWrittenContract(p7.getHasWrittenContract())
                .paymentMethodSafety(p7.getPaymentMethodSafety()).dealValueUsd(p7.getDealValueUsd()).build());
        }
        if (p8 != null && p8.isFound()) {
            f.setP8(FactJson.P8Facts.builder()
                .hasVerifiedLocation(p8.getHasVerifiedLocation()).isStockImageUsed(p8.getIsStockImageUsed())
                .hasPhysicalEvidence(p8.getHasPhysicalEvidence()).employeeCountRange(p8.getEmployeeCountRange()).build());
        }
        return f;
    }

    private String extractJson(String raw) {
        int start = raw.indexOf('{');
        int end = raw.lastIndexOf('}');
        return (start != -1 && end > start) ? raw.substring(start, end + 1) : raw;
    }

    private String text(com.fasterxml.jackson.databind.JsonNode node, String field) {
        var n = node.path(field);
        if (n.isMissingNode() || n.isNull()) return null;
        String v = n.asText();
        return "null".equals(v) ? null : v;
    }
    private Boolean boolVal(com.fasterxml.jackson.databind.JsonNode node, String field) {
        var n = node.path(field);
        if (n.isMissingNode() || n.isNull()) return null;
        return n.asBoolean();
    }
    private Integer intVal(com.fasterxml.jackson.databind.JsonNode node, String field) {
        var n = node.path(field);
        if (n.isMissingNode() || n.isNull()) return null;
        return n.asInt();
    }
    private Double doubleVal(com.fasterxml.jackson.databind.JsonNode node, String field) {
        var n = node.path(field);
        if (n.isMissingNode() || n.isNull()) return null;
        return n.asDouble();
    }
}

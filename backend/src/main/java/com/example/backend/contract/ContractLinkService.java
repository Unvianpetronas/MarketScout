package com.example.backend.contract;

import com.example.backend.domain.AssessmentContractLink;
import com.example.backend.domain.AssessmentContractLinkRepository;
import com.example.backend.domain.Contract;
import com.example.backend.domain.Report;
import com.example.backend.domain.ReportRepository;
import com.example.backend.exception.AppException;
import com.example.backend.verification.ScoringEngine;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;

/**
 * Links a contract to a report, running the signatory cross-check fresh every
 * time (README_contract_verification_feature.md §3.2 point 3 — never trust a
 * prior VERIFIED status from a different report), and keeps P7 scoring in
 * sync via ScoringEngine.recomputeP7.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ContractLinkService {

    private final ReportRepository reportRepository;
    private final ContractService contractService;
    private final AssessmentContractLinkRepository linkRepository;
    private final ScoringEngine scoringEngine;
    private final ObjectMapper objectMapper;

    @Transactional
    public ContractDTO.LinkResponse link(UUID reportId, UUID contractId, UUID userId) {
        Report report = requireOwnedReport(reportId, userId);
        Contract contract = contractService.requireOwned(contractId, userId);

        AssessmentContractLink link = linkRepository.findByReport_IdAndContract_Id(reportId, contractId)
                .orElseGet(AssessmentContractLink::new);
        link.setReport(report);
        link.setContract(contract);

        CrossCheck check = crossCheck(report, contract);
        link.setVerificationStatus(check.matched() ? "VERIFIED" : "MISMATCH");
        link.setMatchDetails(toJson(check.matchDetails()));
        link.setVerifiedAt(check.matched() ? Instant.now() : null);
        if (link.getFieldOverrides() == null) link.setFieldOverrides("{}");
        linkRepository.save(link);

        report.setP7VerifiedContract(check.matched() ? contract : null);
        reportRepository.save(report);

        var recompute = scoringEngine.recomputeP7(reportId);
        log.info("Contract linked — report={} contract={} status={}", reportId, contractId, link.getVerificationStatus());

        return ContractDTO.LinkResponse.builder()
                .contractId(contractId).reportId(reportId)
                .verificationStatus(link.getVerificationStatus())
                .matchDetails(check.matchDetails())
                .newOverallScore(recompute.overallScore())
                .newP7Score(recompute.p7Score())
                .build();
    }

    @Transactional
    public ContractDTO.LinkResponse updateFieldOverride(UUID reportId, UUID contractId, String field, Object value, UUID userId) {
        requireOwnedReport(reportId, userId);
        contractService.requireOwned(contractId, userId);
        AssessmentContractLink link = requireLink(reportId, contractId);

        Map<String, Object> overrides = parseOverrides(link.getFieldOverrides());
        Map<String, Object> entry = new LinkedHashMap<>();
        entry.put("editedValue", value);
        entry.put("editedAt", Instant.now().toString());
        // Editing a field ALWAYS drops it to unverified, regardless of the
        // link's overall status — see README §3.3, this is the core guardrail
        // against "upload a real contract, then quietly edit the numbers".
        entry.put("verified", false);
        overrides.put(field, entry);
        link.setFieldOverrides(toJson(overrides));
        linkRepository.save(link);

        var recompute = scoringEngine.recomputeP7(reportId);
        return ContractDTO.LinkResponse.builder()
                .contractId(contractId).reportId(reportId)
                .verificationStatus(link.getVerificationStatus())
                .matchDetails(parseOverrides(link.getMatchDetails()))
                .newOverallScore(recompute.overallScore())
                .newP7Score(recompute.p7Score())
                .build();
    }

    @Transactional
    public void unlink(UUID reportId, UUID contractId, UUID userId) {
        Report report = requireOwnedReport(reportId, userId);
        contractService.requireOwned(contractId, userId);
        linkRepository.deleteByReport_IdAndContract_Id(reportId, contractId);

        if (report.getP7VerifiedContract() != null && report.getP7VerifiedContract().getId().equals(contractId)) {
            report.setP7VerifiedContract(null);
            reportRepository.save(report);
        }
        scoringEngine.recomputeP7(reportId);
        log.info("Contract unlinked — report={} contract={}", reportId, contractId);
    }

    private record CrossCheck(boolean matched, Map<String, Object> matchDetails) {}

    /**
     * Signatory tax-ID match is authoritative; falls back to a loose name match
     * only when a tax ID is missing on either side (README §3.2 point 2).
     */
    private CrossCheck crossCheck(Report report, Contract contract) {
        JsonNode data = parseJsonNode(contract.getExtractedData());
        String extractedTaxId = textOrNull(data.path("signatoryTaxId").path("value"));
        String extractedName = textOrNull(data.path("signatoryName").path("value"));

        String reportTaxId = normalizeDigits(report.getTaxId());
        String contractTaxId = normalizeDigits(extractedTaxId);

        boolean taxIdMatch = false;
        boolean nameMatch = false;
        String matchedAgainst = null;

        if (reportTaxId != null && contractTaxId != null) {
            taxIdMatch = reportTaxId.equals(contractTaxId);
            matchedAgainst = "P1_TAX_ID";
        } else if (extractedName != null && report.getEntityName() != null) {
            String a = normalizeName(extractedName);
            String b = normalizeName(report.getEntityName());
            nameMatch = !a.isBlank() && !b.isBlank() && (a.contains(b) || b.contains(a));
            matchedAgainst = "P1_NAME_FALLBACK";
        }

        Map<String, Object> details = new LinkedHashMap<>();
        details.put("signatoryTaxIdMatch", taxIdMatch);
        details.put("signatoryNameMatch", nameMatch);
        details.put("matchedAgainst", matchedAgainst);
        return new CrossCheck(taxIdMatch || nameMatch, details);
    }

    private static String normalizeDigits(String s) {
        if (s == null) return null;
        String digits = s.replaceAll("[^0-9]", "");
        return digits.isBlank() ? null : digits;
    }

    private static String normalizeName(String s) {
        return s.toLowerCase()
                .replaceAll("(công ty|cong ty)\\s*(tnhh|cổ phần|co phan)?", "")
                .replaceAll("[^a-z0-9 ]", "")
                .trim();
    }

    private static String textOrNull(JsonNode node) {
        return (node == null || node.isMissingNode() || node.isNull()) ? null : node.asText(null);
    }

    private Report requireOwnedReport(UUID reportId, UUID userId) {
        Report report = reportRepository.findById(reportId)
                .orElseThrow(() -> new AppException(AppException.ErrorCode.REPORT_NOT_FOUND));
        if (!report.getUser().getId().equals(userId)) {
            throw new AppException(AppException.ErrorCode.REPORT_NOT_FOUND);
        }
        return report;
    }

    private AssessmentContractLink requireLink(UUID reportId, UUID contractId) {
        return linkRepository.findByReport_IdAndContract_Id(reportId, contractId)
                .orElseThrow(() -> new AppException(AppException.ErrorCode.RESOURCE_NOT_FOUND,
                        "Hợp đồng chưa được liên kết với thẩm định này."));
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> parseOverrides(String json) {
        if (json == null || json.isBlank()) return new LinkedHashMap<>();
        try {
            return objectMapper.readValue(json, Map.class);
        } catch (Exception e) {
            return new LinkedHashMap<>();
        }
    }

    private JsonNode parseJsonNode(String json) {
        if (json == null || json.isBlank()) return objectMapper.createObjectNode();
        try {
            return objectMapper.readTree(json);
        } catch (Exception e) {
            return objectMapper.createObjectNode();
        }
    }

    private String toJson(Object obj) {
        try {
            return objectMapper.writeValueAsString(obj);
        } catch (Exception e) {
            return "{}";
        }
    }
}

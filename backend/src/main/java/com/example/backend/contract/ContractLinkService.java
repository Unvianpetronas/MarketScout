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
        AssessmentContractLink link = performCrossCheckAndLink(reportId, contractId, userId);
        var recompute = scoringEngine.recomputeP7(reportId);
        log.info("Contract linked — report={} contract={} status={}", reportId, contractId, link.getVerificationStatus());

        return ContractDTO.LinkResponse.builder()
                .contractId(contractId).reportId(reportId)
                .verificationStatus(link.getVerificationStatus())
                .matchDetails(parseOverrides(link.getMatchDetails()))
                .newOverallScore(recompute.overallScore())
                .newP7Score(recompute.p7Score())
                .build();
    }

    /**
     * Same cross-check as {@link #link}, but for a report that hasn't been
     * scored yet at all (no PillarResult rows exist) — used when a contract is
     * picked on the pre-scan form, before the pipeline has ever run. Skips
     * recomputeP7 (nothing to recompute) — the upcoming first pipeline run
     * already resolves the just-linked contract via ContractP7Mapper, so P7
     * is scored for real on that very first pass.
     */
    @Transactional
    public void linkBeforeScoring(UUID reportId, UUID contractId, UUID userId) {
        AssessmentContractLink link = performCrossCheckAndLink(reportId, contractId, userId);
        log.info("Contract pre-linked before first scan — report={} contract={} status={}",
                reportId, contractId, link.getVerificationStatus());
    }

    private AssessmentContractLink performCrossCheckAndLink(UUID reportId, UUID contractId, UUID userId) {
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
        link = linkRepository.save(link);

        report.setP7VerifiedContract(check.matched() ? contract : null);
        reportRepository.save(report);
        return link;
    }

    // Only these fields are ever read for scoring (see ContractP7Mapper) — reject
    // anything else so field_overrides can't accumulate arbitrary junk, and so a
    // null/blank field name (which Jackson would refuse to serialize as a Map
    // key, throwing on every future read of this link) can never be persisted.
    private static final java.util.Set<String> OVERRIDABLE_FIELDS = java.util.Set.of(
            "incoterms", "depositPercent", "paymentMethod", "hasArbitrationClause",
            "partyAName", "partyATaxId", "partyBName", "partyBTaxId");

    @Transactional
    public ContractDTO.LinkResponse updateFieldOverride(UUID reportId, UUID contractId, String field, Object value, UUID userId) {
        if (field == null || field.isBlank() || !OVERRIDABLE_FIELDS.contains(field)) {
            throw new AppException(AppException.ErrorCode.BAD_REQUEST, "Tên trường không hợp lệ.");
        }
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

    /**
     * All contract links ever attempted for this report, most recent first —
     * including MISMATCH ones. Lets the report page tell "no contract was ever
     * attached" apart from "a contract was attached but didn't match", which
     * otherwise look identical (P7 = N/A either way).
     */
    @Transactional(readOnly = true)
    public java.util.List<ContractDTO.LinkSummary> listLinks(UUID reportId, UUID userId) {
        requireOwnedReport(reportId, userId);
        return linkRepository.findByReport_Id(reportId).stream()
                .sorted((a, b) -> b.getCreatedAt().compareTo(a.getCreatedAt()))
                .map(link -> ContractDTO.LinkSummary.builder()
                        .contractId(link.getContract().getId())
                        .fileName(link.getContract().getFileName())
                        .verificationStatus(link.getVerificationStatus())
                        .createdAt(link.getCreatedAt())
                        .build())
                .toList();
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

    // Below this, the AI itself flagged the read as uncertain (blurry scan, illegible
    // digit, conflicting values across the document — see ContractExtractor's prompt).
    // Trusting a low-confidence guess for matching is worse than treating it as
    // missing: a wrong guess can produce a false VERIFIED just as easily as a false
    // MISMATCH, and either silently corrupts P7 scoring.
    private static final double MATCH_MIN_CONFIDENCE = 0.5;

    /**
     * A contract always has two parties (Bên A/Bên B, seller/buyer) and there is
     * no reliable way to know in advance which one is the partner under
     * verification — so the report's tax ID / entity name is checked against
     * BOTH extracted parties, and either side matching is enough. Tax-ID match
     * is authoritative; falls back to a loose name match only when a tax ID is
     * missing (or too low-confidence to trust) on either side for that party
     * (README §3.2 point 2).
     */
    private CrossCheck crossCheck(Report report, Contract contract) {
        JsonNode data = parseJsonNode(contract.getExtractedData());
        String reportTaxId = normalizeDigits(report.getTaxId());

        boolean taxIdMatch = false;
        boolean nameMatch = false;
        String matchedAgainst = null;

        for (String party : new String[] {"A", "B"}) {
            String contractTaxId = normalizeDigits(confidentText(data, "party" + party + "TaxId"));
            String extractedName = confidentText(data, "party" + party + "Name");

            if (reportTaxId != null && contractTaxId != null && taxIdsMatch(reportTaxId, contractTaxId)) {
                taxIdMatch = true;
                matchedAgainst = "P1_TAX_ID_PARTY_" + party;
                break;
            }
            if ((reportTaxId == null || contractTaxId == null) && extractedName != null && report.getEntityName() != null) {
                // No usable tax ID on one/both sides — this is the ONLY signal for
                // every non-Vietnamese report (report.taxId is only ever populated
                // for MST_VN registrations; international companies always land
                // here). A naive substring check would let a short/generic
                // normalized name "match" almost anything, so require a minimum
                // meaningful length before allowing containment, not just any raw
                // substring hit.
                String a = normalizeName(extractedName);
                String b = normalizeName(report.getEntityName());
                int minLen = Math.min(a.length(), b.length());
                if (!a.isBlank() && !b.isBlank() && minLen >= 6 && (a.equals(b) || a.contains(b) || b.contains(a))) {
                    nameMatch = true;
                    matchedAgainst = "P1_NAME_FALLBACK_PARTY_" + party;
                    break;
                }
            }
        }

        Map<String, Object> details = new LinkedHashMap<>();
        details.put("signatoryTaxIdMatch", taxIdMatch);
        details.put("signatoryNameMatch", nameMatch);
        details.put("matchedAgainst", matchedAgainst);
        return new CrossCheck(taxIdMatch || nameMatch, details);
    }

    /** The field's value, but only if the AI's own confidence for it clears {@link #MATCH_MIN_CONFIDENCE}. */
    private static String confidentText(JsonNode data, String field) {
        JsonNode fieldNode = data.path(field);
        double confidence = fieldNode.path("confidence").isNumber() ? fieldNode.path("confidence").asDouble() : 0.0;
        if (confidence < MATCH_MIN_CONFIDENCE) return null;
        return textOrNull(fieldNode.path("value"));
    }

    private static String normalizeDigits(String s) {
        if (s == null) return null;
        String digits = s.replaceAll("[^0-9]", "");
        return digits.isBlank() ? null : digits;
    }

    /**
     * Vietnamese dependent-unit (branch) tax codes are the parent's 10-digit MST
     * plus a "-XXX" suffix (e.g. "0101243150-001") — same legal entity as the
     * bare 10-digit parent MST, just a different signing branch. A report
     * registered under the parent MST must still match a contract signed by one
     * of its branches, and vice versa.
     */
    private static boolean taxIdsMatch(String a, String b) {
        if (a.equals(b)) return true;
        String shorter = a.length() <= b.length() ? a : b;
        String longer = a.length() <= b.length() ? b : a;
        return shorter.length() == 10 && longer.length() == 13 && longer.startsWith(shorter);
    }

    // Legal-entity designators stripped before comparing names, so "Cong ty TNHH
    // Hung Thinh" and "Hung Thinh Co., Ltd" normalize to the same core name.
    private static final java.util.regex.Pattern LEGAL_DESIGNATORS = java.util.regex.Pattern.compile(
            "\\b(cong ty|cty|doanh nghiep tu nhan|dntn|tap doan|tnhh|mtv|mot thanh vien|co phan|cp|" +
            "hop danh|jsc|joint stock company|co\\.?,?\\s*ltd|ltd|limited|corporation|corp|" +
            "incorporated|inc|gmbh|pte|pty|llc|group)\\b");

    private static String normalizeName(String s) {
        // Strip Vietnamese diacritics first (NFD splits base letter + combining
        // marks) — OCR/AI extraction from a scanned or photographed contract
        // frequently drops or garbles accents, so "Hưng Thịnh" vs "Hung Thinh"
        // must compare equal rather than fail as two different companies.
        String noAccents = java.text.Normalizer.normalize(s, java.text.Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "")
                .replace('đ', 'd').replace('Đ', 'D'); // đ/Đ has no combining decomposition
        String cleaned = noAccents.toLowerCase()
                .replaceAll("[^a-z0-9 ]", " ");
        cleaned = LEGAL_DESIGNATORS.matcher(cleaned).replaceAll(" ");
        return cleaned.replaceAll("\\s+", " ").trim();
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

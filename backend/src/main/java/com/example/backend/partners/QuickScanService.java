package com.example.backend.partners;

import com.example.backend.verification.ScoringRubric;
import com.example.backend.verification.ScoringRubricLoader;
import com.example.backend.verification.crawler.p1.CrawlerP1Router;
import com.example.backend.verification.crawler.p6.CrawlerP6;
import com.example.backend.domain.PillarResult;
import com.example.backend.domain.Report;
import com.example.backend.domain.Users;
import com.example.backend.shared.model.crawler.LeadResult;
import com.example.backend.shared.model.crawler.P1Data;
import com.example.backend.shared.model.crawler.P6Data;
import com.example.backend.shared.model.input.CompanyInput;
import com.example.backend.shared.model.scoring.FactJson;
import com.example.backend.shared.model.scoring.PillarScore;
import com.example.backend.domain.PillarResultRepository;
import com.example.backend.domain.ReportRepository;
import com.example.backend.domain.UsersRepository;
import com.example.backend.shared.cache.CacheService;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.*;

@Slf4j
@Service
@RequiredArgsConstructor
public class QuickScanService {

    private final CrawlerP1Router crawlerP1;
    private final CrawlerP6 crawlerP6;
    private final ReportRepository reportRepository;
    private final PillarResultRepository pillarResultRepository;
    private final UsersRepository usersRepository;
    private final CacheService cacheService;
    private final ObjectMapper objectMapper;
    private final ScoringRubricLoader rubricLoader;

    @Transactional
    public Report quickScan(UUID userId, String sessionId, int leadIndex) {
        Users user = usersRepository.findById(userId)
            .orElseThrow(() -> new RuntimeException("User not found"));

        // Get lead from Redis
        String key = "leads:" + sessionId;
        String leadsJson = cacheService.getRaw(key).orElse(null);
        if (leadsJson == null) throw new RuntimeException("Session expired hoặc không tìm thấy leads");

        List<LeadResult> leads;
        try {
            leads = objectMapper.readValue(leadsJson, new TypeReference<List<LeadResult>>() {});
        } catch (Exception e) {
            throw new RuntimeException("Không parse được leads từ Redis");
        }

        if (leadIndex < 0 || leadIndex >= leads.size()) {
            throw new RuntimeException("Lead index out of range");
        }
        LeadResult lead = leads.get(leadIndex);

        // Build CompanyInput from lead
        CompanyInput input = CompanyInput.builder()
            .companyName(lead.getCompanyName())
            .website(lead.getWebsite())
            .country(lead.getCountry())
            .build();

        // Create report with QUICK_SCANNING status
        Report report = new Report();
        report.setUser(user);
        report.setEntityName(lead.getCompanyName());
        report.setCountryIso2(lead.getCountry());
        report.setTier("standard");
        report.setHardStop(false);
        report.setStatus("QUICK_SCANNING");
        report.setWebsite(lead.getWebsite());
        report.setSource("FIND_PARTNERS");
        report.setQuickScanDone(false);
        report.setCreatedAt(Instant.now());
        report.setUpdatedAt(Instant.now());
        report = reportRepository.save(report);
        UUID reportId = report.getId();

        // Run P1 + P6 quick scan (no quota deduction)
        P1Data p1 = crawlerP1.fetch(input);
        P6Data p6 = crawlerP6.fetch(input);

        PillarScore p1Score = saveP1PillarResult(report, p1);

        // Update report with quick scan done
        // P6 chỉ được set hardStop khi P1 đã xác nhận entity (found=true).
        // Nếu P1 not_found mà P6 vẫn match → gắn cờ UNVERIFIED để review thủ công.
        boolean hardStop = p1.isFound() && p6.isSanctioned();
        boolean unverifiedSanctions = !p1.isFound() && p6.isSanctioned();
        if (unverifiedSanctions) {
            log.warn("UNVERIFIED_SANCTIONS_MATCH for report {} — P1 not found, P6 sanctioned (source={}). Manual review required.",
                reportId, p6.getSanctionSource());
        }
        report.setQuickScanDone(true);
        report.setHardStop(hardStop);
        if (p1 instanceof com.example.backend.shared.model.crawler.P1Data) {
            com.example.backend.shared.model.crawler.P1Data p1d = (com.example.backend.shared.model.crawler.P1Data) p1;
            report.setTaxId(p1d.getRegistrationId());
        }
        if (hardStop) {
            report.setStatus("HARD_STOP");
            report.setOverallScore((short) 0);
        } else if (unverifiedSanctions) {
            report.setStatus("QUICK_SCANNING");
            report.setRiskLevel("Nghiêm trọng");
        } else {
            report.setStatus("QUICK_SCANNING");
            report.setOverallScore(p1Score.getScore() != null ? p1Score.getScore().shortValue() : null);
        }
        report.setUpdatedAt(Instant.now());
        reportRepository.save(report);

        log.info("QuickScan done for report {} — found={}, hardStop={}, unverifiedSanctions={}", reportId, p1.isFound(), hardStop, unverifiedSanctions);
        return report;
    }

    // QuickScan only ever evaluates P1 (P6 is checked for hard-stop only, never
    // scored as a pillar here), so this mirrors ScoringRubric.scoreP1() against
    // the structured P1Data fields directly — no Gemini fact-extraction round
    // trip, since that machinery exists for the full 8-pillar pipeline where raw
    // text from many sources needs LLM interpretation, and would only add latency
    // to what's supposed to be an instant preview.
    private PillarScore saveP1PillarResult(Report report, P1Data p1) {
        ScoringRubric rubric = rubricLoader.getRubric();
        PillarScore score = p1.isFound()
            ? rubric.scoreP1(FactJson.P1Facts.builder()
                .status(p1.getStatus())
                .ageYears(p1.getAgeYears())
                .hasLegalRepresentative(p1.getHasLegalRepresentative())
                .build())
            : rubric.scoreP1(null);

        PillarResult p1Result = new PillarResult();
        p1Result.setReport(report);
        p1Result.setPillarNo((short) 1);
        p1Result.setPillarName(score.getPillarName());
        p1Result.setScore(score.getScore() != null ? score.getScore().shortValue() : null);
        p1Result.setStatus(score.getStatus());
        p1Result.setConfidence(score.getConfidence());
        p1Result.setFindings(p1.getRawText() != null ? p1.getRawText() : score.getFindings());
        p1Result.setSourcesUsed(p1.getDataSource());
        try {
            p1Result.setEvidences(objectMapper.writeValueAsString(score.getEvidences()));
        } catch (Exception ignored) {}
        pillarResultRepository.save(p1Result);
        return score;
    }

    /**
     * P1(+P6)-only lookup driven directly by a CompanyInput (used by the chat
     * LOOKUP_COMPANY intent). Unlike {@link #quickScan}, this does not read
     * leads from Redis and copies LEI (international) as well as MST (VN)
     * registration ids onto the report.
     */
    @Transactional
    public QuickLookupResult quickScanByInput(UUID userId, CompanyInput input) {
        Users user = usersRepository.findById(userId)
            .orElseThrow(() -> new RuntimeException("User not found"));

        Report report = new Report();
        report.setUser(user);
        report.setEntityName(input.getCompanyName());
        report.setCountryIso2(input.getCountry());
        report.setTier("standard");
        report.setHardStop(false);
        report.setStatus("QUICK_SCANNING");
        report.setWebsite(input.getWebsite());
        report.setSource("MANUAL");
        report.setQuickScanDone(false);
        report.setCreatedAt(Instant.now());
        report.setUpdatedAt(Instant.now());
        report = reportRepository.save(report);
        UUID reportId = report.getId();

        // Run P1 + P6 quick lookup (no quota deduction)
        P1Data p1 = crawlerP1.fetch(input);
        P6Data p6 = crawlerP6.fetch(input);

        PillarScore p1Score = saveP1PillarResult(report, p1);

        boolean hardStop = p1.isFound() && p6.isSanctioned();
        boolean unverifiedSanctions = !p1.isFound() && p6.isSanctioned();
        if (unverifiedSanctions) {
            log.warn("UNVERIFIED_SANCTIONS_MATCH for report {} — P1 not found, P6 sanctioned (source={}). Manual review required.",
                reportId, p6.getSanctionSource());
        }
        report.setQuickScanDone(true);
        report.setHardStop(hardStop);
        if (p1.getRegistrationId() != null && !p1.getRegistrationId().isBlank()) {
            if ("MST_VN".equals(p1.getRegistrationType())) {
                report.setTaxId(p1.getRegistrationId());
            } else if ("LEI_INTL".equals(p1.getRegistrationType())) {
                report.setLei(p1.getRegistrationId());
            }
        }
        if (hardStop) {
            report.setStatus("HARD_STOP");
            report.setOverallScore((short) 0);
        } else if (unverifiedSanctions) {
            report.setStatus("QUICK_SCANNING");
            report.setRiskLevel("Nghiêm trọng");
        } else {
            report.setStatus("QUICK_SCANNING");
            report.setOverallScore(p1Score.getScore() != null ? p1Score.getScore().shortValue() : null);
        }
        report.setUpdatedAt(Instant.now());
        report = reportRepository.save(report);

        log.info("QuickScan (chat lookup) done for report {} — found={}, hardStop={}, unverifiedSanctions={}", reportId, p1.isFound(), hardStop, unverifiedSanctions);
        return new QuickLookupResult(report, p1, p6);
    }

    public record QuickLookupResult(Report report, P1Data p1, P6Data p6) {}
}

package com.example.backend.partners;

import com.example.backend.verification.crawler.p1.CrawlerP1Router;
import com.example.backend.verification.crawler.p6.CrawlerP6;
import com.example.backend.domain.PillarResult;
import com.example.backend.domain.Report;
import com.example.backend.domain.Users;
import com.example.backend.shared.model.crawler.LeadResult;
import com.example.backend.shared.model.crawler.P1Data;
import com.example.backend.shared.model.crawler.P6Data;
import com.example.backend.shared.model.input.CompanyInput;
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
        report.setId(UUID.randomUUID());
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

        // Save P1 pillar result
        PillarResult p1Result = new PillarResult();
        p1Result.setReport(report);
        p1Result.setPillarNo((short) 1);
        p1Result.setPillarName("Entity Validation");
        p1Result.setStatus(p1.isFound() ? (p1.getState().name().equals("FOUND") ? "PASS" : "FAIL") : "SKIP");
        p1Result.setConfidence(p1.isFound() ? "HIGH" : "LOW");
        p1Result.setFindings(p1.getRawText());
        p1Result.setSourcesUsed(p1.getDataSource());
        pillarResultRepository.save(p1Result);

        // Update report with quick scan done
        boolean hardStop = p6.isSanctioned();
        report.setQuickScanDone(true);
        report.setHardStop(hardStop);
        if (p1 instanceof com.example.backend.shared.model.crawler.P1Data) {
            com.example.backend.shared.model.crawler.P1Data p1d = (com.example.backend.shared.model.crawler.P1Data) p1;
            report.setTaxId(p1d.getRegistrationId());
        }
        if (hardStop) {
            report.setStatus("HARD_STOP");
            report.setOverallScore((short) 0);
        } else {
            report.setStatus("QUICK_SCANNING");
        }
        report.setUpdatedAt(Instant.now());
        reportRepository.save(report);

        log.info("QuickScan done for report {} — hardStop={}", reportId, hardStop);
        return report;
    }
}

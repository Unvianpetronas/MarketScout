package com.example.backend.verification;

import com.example.backend.verification.crawler.p1.CrawlerP1Router;
import com.example.backend.verification.crawler.p2.CrawlerP2;
import com.example.backend.verification.crawler.p3.CrawlerP3Intl;
import com.example.backend.verification.crawler.p3.CrawlerP3VN;
import com.example.backend.verification.crawler.p4.CrawlerP4;
import com.example.backend.verification.crawler.p5.CrawlerP5Intl;
import com.example.backend.verification.crawler.p5.CrawlerP5VN;
import com.example.backend.verification.crawler.p6.CrawlerP6;
import com.example.backend.verification.crawler.p8.CrawlerP8;
import com.example.backend.shared.model.crawler.*;
import com.example.backend.shared.model.input.CompanyInput;
import com.example.backend.shared.model.scoring.FactJson;
import com.example.backend.shared.model.scoring.PillarScore;
import com.example.backend.shared.model.scoring.ScoringResult;
import com.example.backend.shared.model.scoring.Evidence;
import com.example.backend.domain.Users;
import com.example.backend.domain.Report;
import com.example.backend.domain.PillarResult;
import com.example.backend.domain.PillarResultRepository;
import com.example.backend.domain.ReportRepository;
import com.example.backend.domain.UsersRepository;
import com.example.backend.quota.QuotaService;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.function.Consumer;

@Slf4j
@Service
@RequiredArgsConstructor
public class ScoringEngine {

    // Dedicated daemon pool for blocking crawler HTTP — keeps these off
    // ForkJoinPool.commonPool() so they can't starve other parallel streams.
    private final ExecutorService crawlerPool = Executors.newFixedThreadPool(8, r -> {
        Thread t = new Thread(r, "crawler-pool");
        t.setDaemon(true);
        return t;
    });

    private final CrawlerP1Router crawlerP1;
    private final CrawlerP2 crawlerP2;
    private final CrawlerP3VN crawlerP3VN;
    private final CrawlerP3Intl crawlerP3Intl;
    private final CrawlerP4 crawlerP4;
    private final CrawlerP5VN crawlerP5VN;
    private final CrawlerP5Intl crawlerP5Intl;
    private final CrawlerP6 crawlerP6;
    private final CrawlerP8 crawlerP8;
    private final DealSafetyAgent dealSafetyAgent;
    private final FactExtractor factExtractor;
    private final ScoringRubricLoader rubricLoader;
    private final ReportRepository reportRepository;
    private final PillarResultRepository pillarResultRepository;
    private final UsersRepository usersRepository;
    private final QuotaService quotaService;
    private final ObjectMapper objectMapper;

    @Async("scoringExecutor")
    public CompletableFuture<ScoringResult> runAsync(UUID reportId, CompanyInput input, UUID userId,
                                                       Consumer<String> sseCallback) {
        Report report = reportRepository.findById(reportId)
            .orElseThrow(() -> new RuntimeException("Report not found: " + reportId));
        try {
            report.setStatus("DEEP_SCANNING");
            report.setUpdatedAt(Instant.now());
            reportRepository.save(report);

            ScoringResult result = runPipeline(input, reportId, sseCallback);

            // Persist
            report.setOverallScore(result.isHardStop() ? (short) 0 : (short) Math.round(result.getOverallScore()));
            report.setHardStop(result.isHardStop());
            report.setStatus(result.getStatus());
            report.setRiskLevel(result.getRiskLevel());
            if (result.getRegistrationId() != null && !result.getRegistrationId().isBlank()) {
                if ("MST_VN".equals(result.getRegistrationType())) {
                    report.setTaxId(result.getRegistrationId());
                } else if ("LEI_INTL".equals(result.getRegistrationType())) {
                    report.setLei(result.getRegistrationId());
                }
            }
            report.setUpdatedAt(Instant.now());
            reportRepository.save(report);

            savePillarResults(reportId, result.getPillars(), report);

            // Trigger deal safety async — skip entirely on hard-stop to save a Gemini call.
            if (!result.isHardStop()) {
                dealSafetyAgent.analyzeAsync(reportId, result);
            }

            if (sseCallback != null) {
                sseCallback.accept(toJson(result));
            }
            log.info("ScoringEngine done for report {} — score={}", reportId, result.getOverallScore());

            return CompletableFuture.completedFuture(result);

        } catch (Exception e) {
            log.error("ScoringEngine failed for report {}: {}", reportId, e.getMessage(), e);
            report.setStatus("FAILED");
            report.setUpdatedAt(Instant.now());
            reportRepository.save(report);
            // Refund quota on pipeline failure
            try {
                quotaService.refundOne(userId);
                log.info("Quota refunded for user {} after pipeline failure", userId);
            } catch (Exception re) {
                log.warn("Quota refund failed for user {}: {}", userId, re.getMessage());
            }
            if (sseCallback != null) {
                sseCallback.accept("{\"error\":\"Scoring pipeline failed: " + e.getMessage() + "\"}");
            }
            ScoringResult failed = ScoringResult.builder()
                .reportId(reportId)
                .companyName(input.getName())
                .status("FAILED")
                .build();
            return CompletableFuture.completedFuture(failed);
        }
    }

    private ScoringResult runPipeline(CompanyInput input, UUID reportId,
                                       Consumer<String> sseCallback) {
        emit(sseCallback, "crawler", "thinking", "Đang kiểm tra danh sách trừng phạt...");

        // Step 1: P6 FIRST and sequential. A sanctioned company is a hard-stop, so
        // there's no point spending Gemini/Tavily/Places on the other 7 pillars.
        P6Data p6 = crawlerP6.fetch(input);
        if (p6.isSanctioned()) {
            emit(sseCallback, "safety", "done", "HARD STOP — " + input.getName() + " nằm trong danh sách trừng phạt");
            return ScoringResult.builder()
                .reportId(reportId).companyName(input.getName())
                .overallScore(0).hardStop(true)
                .hardStopReason("Nằm trong danh sách trừng phạt: " + p6.getSanctionSource())
                .riskLevel("Nghiêm trọng").status("HARD_STOP")
                .pillars(List.of(rubricLoader.getRubric().scoreP6(
                    FactJson.P6Facts.builder().isSanctionHit(true).build())))
                .build();
        }

        // Step 2: not sanctioned — fan out the remaining crawlers on the dedicated pool.
        emit(sseCallback, "crawler", "thinking", "Đang thu thập dữ liệu từ các nguồn còn lại...");
        CompletableFuture<P1Data> p1f = CompletableFuture.supplyAsync(() -> crawlerP1.fetch(input), crawlerPool);
        CompletableFuture<P2Data> p2f = CompletableFuture.supplyAsync(() -> crawlerP2.fetch(input), crawlerPool);
        CompletableFuture<P3Data> p3f = CompletableFuture.supplyAsync(() ->
            input.isVietnam() ? crawlerP3VN.fetch(input) : crawlerP3Intl.fetch(input), crawlerPool);
        CompletableFuture<P4Data> p4f = CompletableFuture.supplyAsync(() -> crawlerP4.fetch(input), crawlerPool);
        CompletableFuture<P5Data> p5f = CompletableFuture.supplyAsync(() ->
            input.isVietnam() ? crawlerP5VN.fetch(input) : crawlerP5Intl.fetch(input), crawlerPool);
        CompletableFuture<P8Data> p8f = CompletableFuture.supplyAsync(() -> crawlerP8.fetch(input), crawlerPool);

        CompletableFuture.allOf(p1f, p2f, p3f, p4f, p5f, p8f).join();

        P1Data p1 = getOrSkip(p1f, input, "P1");
        P2Data p2 = getOrSkip(p2f, input, "P2");
        P3Data p3 = getOrSkip(p3f, input, "P3");
        P4Data p4 = getOrSkip(p4f, input, "P4");
        P5Data p5 = getOrSkip(p5f, input, "P5");
        P8Data p8 = getOrSkip(p8f, input, "P8");
        P7Data p7 = P7Data.builder().state(PillarData.DataState.SKIP).companyName(input.getName())
            .errorMsg("Chưa có thông tin giao dịch từ user").fetchedAt(java.time.LocalDateTime.now()).build();

        emit(sseCallback, "scoring", "thinking", "Đang phân tích và tính điểm...");

        // Step 3: Extract facts
        FactJson facts = factExtractor.extract(p1, p2, p3, p4, p5, p6, p7, p8);

        // Step 4: Score each pillar
        var rubric = rubricLoader.getRubric();
        List<PillarScore> pillars = List.of(
            rubric.scoreP1(facts.getP1()),
            rubric.scoreP2(facts.getP2()),
            rubric.scoreP3(facts.getP3()),
            rubric.scoreP4(facts.getP4()),
            rubric.scoreP5(facts.getP5()),
            rubric.scoreP6(facts.getP6()),
            rubric.scoreP7(facts.getP7()),
            rubric.scoreP8(facts.getP8())
        );

        // Step 5: Overall score
        double overallScore = rubric.calcOverallScore(pillars);
        String riskLevel = rubric.getRiskLevel(overallScore);

        return ScoringResult.builder()
            .reportId(reportId).companyName(input.getName())
            .overallScore(overallScore).hardStop(false).riskLevel(riskLevel)
            .status("DONE").pillars(pillars)
            .registrationId(p1.getRegistrationId())
            .registrationType(p1.getRegistrationType())
            .build();
    }

    @Transactional
    public void savePillarResults(UUID reportId, List<PillarScore> pillars, Report report) {
        pillarResultRepository.deleteAll(pillarResultRepository.findByReportIdOrderByPillarNoAsc(reportId));
        for (PillarScore ps : pillars) {
            PillarResult pr = new PillarResult();
            pr.setReport(report);
            pr.setPillarNo((short) ps.getPillarNo());
            pr.setScore(ps.getScore() != null ? ps.getScore().shortValue() : null);
            pr.setFindings(ps.getFindings());
            pr.setStatus(ps.getStatus());
            pr.setConfidence(ps.getConfidence());
            pr.setPillarName(ps.getPillarName());
            pr.setSourcesUsed(ps.getSourcesUsed());
            try {
                pr.setEvidences(objectMapper.writeValueAsString(ps.getEvidences()));
            } catch (Exception ignored) {}
            pillarResultRepository.save(pr);
        }
    }

    private <T extends PillarData> T getOrSkip(CompletableFuture<T> future, CompanyInput input, String label) {
        try {
            return future.get();
        } catch (Exception e) {
            log.warn("{} future failed: {}", label, e.getMessage());
            @SuppressWarnings("unchecked")
            T skip = (T) PillarData.skip(input, label + " future error");
            return skip;
        }
    }

    private void emit(Consumer<String> sseCallback, String agent, String status, String message) {
        if (sseCallback == null) return;
        try {
            String json = String.format("{\"agent\":\"%s\",\"status\":\"%s\",\"message\":\"%s\"}",
                agent, status, message.replace("\"", "'"));
            sseCallback.accept(json);
        } catch (Exception e) {
            log.debug("SSE emit failed: {}", e.getMessage());
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

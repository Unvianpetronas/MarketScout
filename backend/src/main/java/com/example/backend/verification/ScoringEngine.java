package com.example.backend.verification;

import com.example.backend.verification.crawler.p1.CrawlerP1Router;
import com.example.backend.verification.crawler.p2.CrawlerP2;
import com.example.backend.verification.crawler.p3.CrawlerP3;
import com.example.backend.verification.crawler.p4.CrawlerP4;
import com.example.backend.verification.crawler.p5.CrawlerP5Router;
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
import com.example.backend.contract.ContractP7Mapper;
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
    private final CrawlerP3 crawlerP3;
    private final CrawlerP4 crawlerP4;
    private final CrawlerP5Router crawlerP5Router;
    private final CrawlerP6 crawlerP6;
    private final CrawlerP8 crawlerP8;
    private final DealSafetyAgent dealSafetyAgent;
    private final com.example.backend.report.ReportRecommendationService recommendationService;
    private final FactExtractor factExtractor;
    private final ScoringRubricLoader rubricLoader;
    private final ReportRepository reportRepository;
    private final PillarResultRepository pillarResultRepository;
    private final UsersRepository usersRepository;
    private final QuotaService quotaService;
    private final ContractP7Mapper contractP7Mapper;
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

            String language = usersRepository.findById(userId).map(Users::getLanguage).orElse(null);
            ScoringResult result = runPipeline(input, reportId, report, sseCallback, language);

            // Persist
            report.setOverallScore(result.isHardStop() ? (short) 0 : (short) Math.round(result.getOverallScore()));
            report.setHardStop(result.isHardStop());
            report.setStatus(result.getStatus());
            report.setRiskLevel(result.getRiskLevel());
            // Show the registry's official name once we know it — a report started
            // from a tax ID was titled "0107781148" on every screen it appeared on.
            if (result.getCompanyName() != null && !result.getCompanyName().isBlank()) {
                report.setEntityName(result.getCompanyName());
            }
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

            // Trigger deal safety + AI recommendations async — both skipped on
            // hard-stop (a sanctioned entity needs no deal advice). Generated here,
            // right after pillars are persisted, so they reflect the final scores.
            if (!result.isHardStop()) {
                dealSafetyAgent.analyzeAsync(reportId, result);
                recommendationService.generateAndSaveAsync(reportId);
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

    private ScoringResult runPipeline(CompanyInput input, UUID reportId, Report report,
                                       Consumer<String> sseCallback, String language) {
        boolean en = isEnglish(language);
        emit(sseCallback, "crawler", "thinking",
            en ? "Screening sanctions lists..." : "Đang kiểm tra danh sách trừng phạt...");

        // Step 1: P6 FIRST and sequential. A sanctioned company is a hard-stop, so
        // there's no point spending Gemini/Tavily/Places on the other 7 pillars.
        P6Data p6 = crawlerP6.fetch(input);
        if (p6.isSanctioned()) {
            emit(sseCallback, "safety", "done", "HARD STOP — " + input.getName()
                + (en ? " appears on a sanctions list" : " nằm trong danh sách trừng phạt"));
            return ScoringResult.builder()
                .reportId(reportId).companyName(input.getName())
                .overallScore(0).hardStop(true)
                .hardStopReason((en ? "Listed on a sanctions list: " : "Nằm trong danh sách trừng phạt: ")
                    + p6.getSanctionSource())
                .riskLevel("Nghiêm trọng").status("HARD_STOP")
                .pillars(List.of(rubricLoader.getRubric().scoreP6(
                    FactJson.P6Facts.builder().isSanctionHit(true).build(), null, language)))
                .build();
        }

        // Step 2: P1 next, also sequential. It is the only pillar that establishes
        // WHICH company this is. Every other crawler searches by name, so running
        // them on the caller's raw input made them search a bare tax ID like
        // "0107781148" — P2 then locked onto the lookup site and ran RDAP/SSL
        // against masothue.com as if it were the partner's own website.
        emit(sseCallback, "crawler", "thinking",
            en ? "Establishing the company's identity..." : "Đang xác định danh tính doanh nghiệp...");
        P1Data p1 = crawlerP1.fetch(input);
        CompanyInput resolved = resolveIdentity(input, p1);
        if (!java.util.Objects.equals(resolved.getName(), input.getName())) {
            log.info("Resolved '{}' → '{}' for report {}", input.getName(), resolved.getName(), reportId);
            emit(sseCallback, "crawler", "done",
                (en ? "Identified: " : "Đã xác định: ") + resolved.getName());
        }

        // Step 3: fan out the remaining crawlers — on the RESOLVED identity.
        emit(sseCallback, "crawler", "thinking",
            en ? "Collecting data from the remaining sources..." : "Đang thu thập dữ liệu từ các nguồn còn lại...");
        CompletableFuture<P2Data> p2f = CompletableFuture.supplyAsync(() -> crawlerP2.fetch(resolved), crawlerPool);
        CompletableFuture<P3Data> p3f = CompletableFuture.supplyAsync(() -> crawlerP3.fetch(resolved), crawlerPool);
        CompletableFuture<P4Data> p4f = CompletableFuture.supplyAsync(() -> crawlerP4.fetch(resolved), crawlerPool);
        CompletableFuture<P5Data> p5f = CompletableFuture.supplyAsync(() ->
            crawlerP5Router.fetch(resolved), crawlerPool);
        CompletableFuture<P8Data> p8f = CompletableFuture.supplyAsync(() -> crawlerP8.fetch(resolved), crawlerPool);

        CompletableFuture.allOf(p2f, p3f, p4f, p5f, p8f).join();

        P2Data p2 = getOrSkip(p2f, resolved, "P2");
        P3Data p3 = getOrSkip(p3f, resolved, "P3");
        P4Data p4 = getOrSkip(p4f, resolved, "P4");
        P5Data p5 = getOrSkip(p5f, resolved, "P5");
        P8Data p8 = getOrSkip(p8f, resolved, "P8");
        // P7 has no crawler — a user has never provided transaction data at all on
        // a first scan, so this stays SKIP here. If a contract is later uploaded and
        // link-verified against this report, recomputeP7() replaces just this pillar
        // without re-running the rest of the pipeline (and without a second quota hit).
        P7Data p7 = P7Data.builder().state(PillarData.DataState.SKIP).companyName(input.getName())
            .errorMsg(en ? "No transaction information provided yet" : "Chưa có thông tin giao dịch từ user")
            .fetchedAt(java.time.LocalDateTime.now()).build();

        emit(sseCallback, "scoring", "thinking",
            en ? "Analysing and scoring..." : "Đang phân tích và tính điểm...");

        // Step 3: Extract facts
        FactJson facts = factExtractor.extract(p1, p2, p3, p4, p5, p6, p7, p8);

        // Step 4: Score each pillar. P7 comes from a link-verified contract when
        // one exists (rare on a first scan — see recomputeP7 for the usual path)
        // rather than facts.getP7(), which is always null (SKIP) today since no
        // crawler ever populates P7Data.
        var rubric = rubricLoader.getRubric();
        FactJson.P7Facts p7Facts = contractP7Mapper.resolve(report);
        List<PillarScore> pillars = List.of(
            rubric.scoreP1(facts.getP1(), language),
            rubric.scoreP2(facts.getP2(), language),
            rubric.scoreP3(facts.getP3(), language),
            rubric.scoreP4(facts.getP4(), language),
            rubric.scoreP5(facts.getP5(), language),
            rubric.scoreP6(facts.getP6(), p6.getErrorMsg(), language),
            rubric.scoreP7(p7Facts != null ? p7Facts : facts.getP7(), language),
            rubric.scoreP8(facts.getP8(), language)
        );

        // Step 5: Overall score
        double overallScore = rubric.calcOverallScore(pillars);
        String riskLevel = rubric.getRiskLevel(overallScore);

        return ScoringResult.builder()
            .reportId(reportId).companyName(resolved.getName())
            .overallScore(overallScore).hardStop(false).riskLevel(riskLevel)
            .status("DONE").pillars(pillars)
            .registrationId(p1.getRegistrationId())
            .registrationType(p1.getRegistrationType())
            .build();
    }

    /**
     * Swaps the caller's identity for the registry's own once P1 has found it.
     * A Deep Verify usually starts from a tax ID or an approximate name, while
     * every downstream crawler searches by name — so the registry's official name
     * is what they must be given. Falls back to the caller's input untouched when
     * P1 found nothing, so an unresolvable company still gets scanned.
     */
    private CompanyInput resolveIdentity(CompanyInput input, P1Data p1) {
        if (p1 == null || !p1.isFound()) return input;
        String registryName = p1.getCompanyName();
        if (registryName == null || registryName.isBlank()) return input;
        String taxId = input.getTaxId() != null ? input.getTaxId()
            : ("MST_VN".equals(p1.getRegistrationType()) ? p1.getRegistrationId() : null);
        // Discover the website once here rather than letting P2, P3 and P8 each
        // guess at it independently — one shared answer, one Tavily call.
        String website = input.getWebsite() != null && !input.getWebsite().isBlank()
            ? input.getWebsite()
            : crawlerP2.discoverWebsite(registryName, input.getCountry());
        return CompanyInput.builder()
            .companyName(registryName)
            .taxId(taxId)
            .country(input.getCountry())
            .website(website)
            .registryAddress(p1.getAddress())
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
            pr.setObtainablePoints(ps.getObtainablePoints() != null
                ? ps.getObtainablePoints().shortValue() : null);
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

    public record RecomputeResult(double overallScore, Integer p7Score) {}

    /**
     * Re-scores P7 only and recomputes the overall score from the report's
     * existing PillarResult rows — no crawler re-invocation, no quota deduction.
     * Called by ContractLinkService after a link/override/unlink changes what
     * P7 data (if any) this report's contract makes available.
     */
    @Transactional
    public RecomputeResult recomputeP7(UUID reportId) {
        Report report = reportRepository.findById(reportId)
            .orElseThrow(() -> new RuntimeException("Report not found: " + reportId));
        List<PillarResult> existing = pillarResultRepository.findByReportIdOrderByPillarNoAsc(reportId);
        String language = reportRepository.findUserLanguageByReportId(reportId);

        var rubric = rubricLoader.getRubric();
        PillarScore p7Score = rubric.scoreP7(contractP7Mapper.resolve(report), language);

        List<PillarScore> pillars = new ArrayList<>();
        boolean hadP7Row = false;
        for (PillarResult pr : existing) {
            if (pr.getPillarNo() == 7) {
                pillars.add(p7Score);
                hadP7Row = true;
            } else {
                pillars.add(toPillarScore(pr));
            }
        }
        if (!hadP7Row) pillars.add(p7Score);

        double overall = rubric.calcOverallScore(pillars);
        String riskLevel = rubric.getRiskLevel(overall);

        report.setOverallScore((short) Math.round(overall));
        report.setRiskLevel(riskLevel);
        report.setUpdatedAt(Instant.now());
        reportRepository.save(report);
        savePillarResults(reportId, pillars, report);

        log.info("recomputeP7 — report={} p7Score={} newOverall={}", reportId, p7Score.getScore(), overall);
        return new RecomputeResult(overall, p7Score.getScore());
    }

    private PillarScore toPillarScore(PillarResult pr) {
        List<Evidence> evidences = List.of();
        try {
            if (pr.getEvidences() != null) {
                evidences = objectMapper.readValue(pr.getEvidences(),
                    objectMapper.getTypeFactory().constructCollectionType(List.class, Evidence.class));
            }
        } catch (Exception ignored) {}
        return PillarScore.builder()
            .pillarNo(pr.getPillarNo())
            .pillarName(pr.getPillarName())
            .score(pr.getScore() != null ? pr.getScore().intValue() : null)
            .status(pr.getStatus())
            .confidence(pr.getConfidence())
            .evidences(evidences)
            .findings(pr.getFindings())
            .sourcesUsed(pr.getSourcesUsed())
            .build();
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

    /**
     * Deep Verify progress text and the hard-stop reason follow the user's UI
     * language. Report.riskLevel deliberately does NOT — it stays canonical
     * Vietnamese because other code compares it literally and the frontend
     * translates it for display.
     */
    private static boolean isEnglish(String language) {
        return "en".equalsIgnoreCase(language);
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

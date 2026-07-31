package com.example.backend.report;

import com.example.backend.report.ReportDTO;
import com.example.backend.config.JwtService;
import com.example.backend.exception.AppException;
import com.example.backend.domain.PillarResult;
import com.example.backend.domain.Report;
import com.example.backend.domain.ReportFlag;
import com.example.backend.domain.ReportFlagRepository;
import com.example.backend.domain.Users;
import com.example.backend.domain.UsersRepository;
import com.example.backend.shared.model.scoring.Evidence;
import com.example.backend.domain.PillarResultRepository;
import com.example.backend.domain.ReportRepository;
import com.example.backend.partners.QuickScanService;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.jsonwebtoken.Claims;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.nio.charset.StandardCharsets;
import java.text.Normalizer;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.regex.Pattern;

@RestController
@RequestMapping("/api/v1/reports")
@RequiredArgsConstructor
public class ReportController {

    private static final Set<String> VALID_FLAG_REASONS =
        Set.of("WRONG_SCORE", "WRONG_INFO", "SANCTIONS_FALSE_POSITIVE", "OTHER");

    private final ReportRepository reportRepository;
    private final PillarResultRepository pillarResultRepository;
    private final ReportFlagRepository reportFlagRepository;
    private final UsersRepository usersRepository;
    private final QuickScanService quickScanService;
    private final ReportRecommendationService recommendationService;
    private final ReportPdfService reportPdfService;
    private final JwtService jwtService;
    private final ObjectMapper objectMapper;

    @GetMapping
    public ResponseEntity<List<ReportDTO.ReportSummary>> listReports(
            @RequestHeader("Authorization") String authHeader) {
        UUID userId = extractUserId(authHeader);
        List<ReportDTO.ReportSummary> reports = reportRepository.findByUserIdOrderByCreatedAtDesc(userId)
            .stream().map(this::toSummary).toList();
        return ResponseEntity.ok(reports);
    }

    @GetMapping("/{id}")
    public ResponseEntity<ReportDTO.ReportDetail> getReport(
            @RequestHeader("Authorization") String authHeader,
            @PathVariable UUID id) {
        UUID userId = extractUserId(authHeader);
        Report report = reportRepository.findById(id)
            .filter(r -> r.getUser().getId().equals(userId))
            .orElseThrow(() -> new AppException(AppException.ErrorCode.REPORT_NOT_FOUND));
        List<PillarResult> pillars = pillarResultRepository.findByReportIdOrderByPillarNoAsc(id);
        return ResponseEntity.ok(toDetail(report, pillars));
    }

    @GetMapping("/{id}/status")
    public ResponseEntity<ReportDTO.ReportStatusResponse> getStatus(
            @RequestHeader("Authorization") String authHeader,
            @PathVariable UUID id) {
        UUID userId = extractUserId(authHeader);
        Report report = reportRepository.findById(id)
            .filter(r -> r.getUser().getId().equals(userId))
            .orElseThrow(() -> new AppException(AppException.ErrorCode.REPORT_NOT_FOUND));
        return ResponseEntity.ok(ReportDTO.ReportStatusResponse.builder()
            .id(report.getId()).status(report.getStatus())
            .overallScore(effectiveScore(report)).riskLevel(effectiveRiskLevel(report))
            .hardStop(effectiveHardStop(report)).build());
    }

    /**
     * POST /api/v1/reports/{id}/flag
     * Owner-only — "Báo kết quả sai". Does not touch scoring; just opens a
     * flag for admin review (GET /admin/report-flags).
     */
    @PostMapping("/{id}/flag")
    public ResponseEntity<ReportDTO.FlagResponse> flagReport(
            @RequestHeader("Authorization") String authHeader,
            @PathVariable UUID id,
            @Valid @RequestBody ReportDTO.FlagRequest request) {
        UUID userId = extractUserId(authHeader);
        Report report = reportRepository.findById(id)
            .filter(r -> r.getUser().getId().equals(userId))
            .orElseThrow(() -> new AppException(AppException.ErrorCode.REPORT_NOT_FOUND));

        String reason = request.getReason() == null ? "" : request.getReason().trim().toUpperCase();
        if (!VALID_FLAG_REASONS.contains(reason)) {
            throw new AppException(AppException.ErrorCode.BAD_REQUEST,
                "reason phải là một trong: " + VALID_FLAG_REASONS);
        }
        Users user = usersRepository.findById(userId)
            .orElseThrow(() -> new AppException(AppException.ErrorCode.USER_NOT_FOUND));

        ReportFlag flag = new ReportFlag();
        flag.setReport(report);
        flag.setUser(user);
        flag.setReason(reason);
        flag.setNote(request.getNote());
        flag = reportFlagRepository.save(flag);

        return ResponseEntity.ok(ReportDTO.FlagResponse.builder()
            .id(flag.getId()).reportId(report.getId()).reason(flag.getReason())
            .note(flag.getNote()).status(flag.getStatus()).createdAt(flag.getCreatedAt())
            .build());
    }

    /**
     * GET /api/v1/reports/{id}/export
     * Owner-only PDF export — the "Xuất báo cáo" / "Export" button on the
     * report detail and list pages.
     */
    @GetMapping("/{id}/export")
    public ResponseEntity<byte[]> exportPdf(
            @RequestHeader("Authorization") String authHeader,
            @PathVariable UUID id) {
        UUID userId = extractUserId(authHeader);
        Report report = reportRepository.findById(id)
            .filter(r -> r.getUser().getId().equals(userId))
            .orElseThrow(() -> new AppException(AppException.ErrorCode.REPORT_NOT_FOUND));
        List<PillarResult> pillars = pillarResultRepository.findByReportIdOrderByPillarNoAsc(id);
        byte[] pdf = reportPdfService.generate(report, pillars);

        String filename = slugFilename(report.getEntityName()) + "-" + id.toString().substring(0, 8) + ".pdf";
        return ResponseEntity.ok()
            .contentType(MediaType.APPLICATION_PDF)
            .header(HttpHeaders.CONTENT_DISPOSITION,
                ContentDisposition.attachment().filename(filename, StandardCharsets.UTF_8).build().toString())
            .body(pdf);
    }

    private static final Pattern NON_SLUG_CHARS = Pattern.compile("[^a-zA-Z0-9-]+");

    private String slugFilename(String entityName) {
        String normalized = Normalizer.normalize(entityName == null ? "report" : entityName, Normalizer.Form.NFD)
            .replaceAll("\\p{M}", "");
        String slug = NON_SLUG_CHARS.matcher(normalized.replace(' ', '-')).replaceAll("");
        return slug.isBlank() ? "report" : slug.toLowerCase();
    }

    // AI next-step recommendations (what to do / provide / verify) for a report.
    @GetMapping("/{id}/recommendations")
    public ResponseEntity<String> getRecommendations(
            @RequestHeader("Authorization") String authHeader,
            @PathVariable UUID id) {
        UUID userId = extractUserId(authHeader);
        Report report = reportRepository.findById(id)
            .filter(r -> r.getUser().getId().equals(userId))
            .orElseThrow(() -> new AppException(AppException.ErrorCode.REPORT_NOT_FOUND));

        // Prefer the version persisted at scoring time — stable, instant, no extra
        // Gemini call. Only generate (and cache) on-demand for older reports that
        // predate persistence or whose generation failed.
        String json = report.getAiRecommendations();
        if (json == null || json.isBlank()) {
            List<PillarResult> pillars = pillarResultRepository.findByReportIdOrderByPillarNoAsc(id);
            String language = reportRepository.findUserLanguageByReportId(id);
            json = recommendationService.generate(report, pillars, language);
            report.setAiRecommendations(json);
            reportRepository.save(report);
        }
        return ResponseEntity.ok()
            .contentType(org.springframework.http.MediaType.APPLICATION_JSON)
            .body(json);
    }

    /**
     * PATCH /api/v1/reports/{id}/deal-info
     * Self-reported "Thông tin giao dịch" — always reference-only (weight=0).
     * Never touches PillarResult/scoring; only an upload-and-cross-check-verified
     * contract (see the contract package) can move the P7 score.
     */
    @PatchMapping("/{id}/deal-info")
    public ResponseEntity<ReportDTO.ReportDetail> updateDealInfo(
            @RequestHeader("Authorization") String authHeader,
            @PathVariable UUID id,
            @RequestBody ReportDTO.SelfReportDealInfoRequest request) {
        UUID userId = extractUserId(authHeader);
        Report report = reportRepository.findById(id)
            .filter(r -> r.getUser().getId().equals(userId))
            .orElseThrow(() -> new AppException(AppException.ErrorCode.REPORT_NOT_FOUND));
        report.setSelfReportPaymentMethodSafety(request.getPaymentMethodSafety());
        report.setSelfReportDepositPercentage(request.getDepositPercentage());
        report.setSelfReportDealValueUsd(request.getDealValueUsd());
        report.setSelfReportHasWrittenContract(request.getHasWrittenContract());
        reportRepository.save(report);
        List<PillarResult> pillars = pillarResultRepository.findByReportIdOrderByPillarNoAsc(id);
        return ResponseEntity.ok(toDetail(report, pillars));
    }

    // Trigger quick scan for a lead from a Find Partners session
    @PostMapping("/quick-scan")
    public ResponseEntity<ReportDTO.ReportSummary> triggerQuickScan(
            @RequestHeader("Authorization") String authHeader,
            @RequestParam String sessionId,
            @RequestParam int leadIndex) {
        UUID userId = extractUserId(authHeader);
        Report report = quickScanService.quickScan(userId, sessionId, leadIndex);
        return ResponseEntity.ok(toSummary(report));
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private UUID extractUserId(String authHeader) {
        Claims claims = jwtService.parseToken(authHeader.replace("Bearer ", ""));
        return jwtService.getId(claims);
    }

    // Prefer the admin's correction over the AI-computed value — the raw
    // fields on Report are left untouched so the original pipeline output
    // stays intact for audit even after a correction is applied on top.
    private Short effectiveScore(Report r) {
        return r.getOverrideScore() != null ? r.getOverrideScore() : r.getOverallScore();
    }

    private String effectiveRiskLevel(Report r) {
        return r.getOverrideRiskLevel() != null ? r.getOverrideRiskLevel() : r.getRiskLevel();
    }

    private boolean effectiveHardStop(Report r) {
        return r.getOverrideHardStop() != null ? r.getOverrideHardStop() : Boolean.TRUE.equals(r.getHardStop());
    }

    private ReportDTO.ReportSummary toSummary(Report r) {
        return ReportDTO.ReportSummary.builder()
            .id(r.getId()).entityName(r.getEntityName()).countryIso2(r.getCountryIso2())
            .overallScore(effectiveScore(r)).hardStop(effectiveHardStop(r))
            .status(r.getStatus()).riskLevel(effectiveRiskLevel(r)).source(r.getSource())
            .quickScanDone(Boolean.TRUE.equals(r.getQuickScanDone())).createdAt(r.getCreatedAt()).updatedAt(r.getUpdatedAt())
            .corrected(r.isOverridden()).correctionNote(r.getOverrideNote())
            .build();
    }

    private ReportDTO.ReportDetail toDetail(Report r, List<PillarResult> pillars) {
        return ReportDTO.ReportDetail.builder()
            .id(r.getId()).entityName(r.getEntityName()).countryIso2(r.getCountryIso2())
            .overallScore(effectiveScore(r)).hardStop(effectiveHardStop(r)).status(r.getStatus())
            .riskLevel(effectiveRiskLevel(r)).source(r.getSource()).quickScanDone(Boolean.TRUE.equals(r.getQuickScanDone()))
            .website(r.getWebsite()).taxId(r.getTaxId()).lei(r.getLei())
            .createdAt(r.getCreatedAt()).updatedAt(r.getUpdatedAt())
            .pillars(pillars.stream().map(this::toPillarDTO).toList())
            .dealSafetyAnalysis(r.getDealSafetyAnalysis())
            .selfReportPaymentMethodSafety(r.getSelfReportPaymentMethodSafety())
            .selfReportDepositPercentage(r.getSelfReportDepositPercentage())
            .selfReportDealValueUsd(r.getSelfReportDealValueUsd())
            .selfReportHasWrittenContract(r.getSelfReportHasWrittenContract())
            .p7VerifiedContractId(r.getP7VerifiedContract() != null ? r.getP7VerifiedContract().getId() : null)
            .corrected(r.isOverridden()).correctionNote(r.getOverrideNote()).correctedAt(r.getOverriddenAt())
            .build();
    }

    @SuppressWarnings("unchecked")
    private ReportDTO.PillarResultDTO toPillarDTO(PillarResult pr) {
        List<Evidence> evidences = null;
        if (pr.getEvidences() != null) {
            try {
                evidences = objectMapper.readValue(pr.getEvidences(),
                    objectMapper.getTypeFactory().constructCollectionType(List.class, Evidence.class));
            } catch (Exception ignored) {}
        }
        return ReportDTO.PillarResultDTO.builder()
            .pillarNo(pr.getPillarNo()).pillarName(pr.getPillarName())
            .score(pr.getScore() != null ? pr.getScore().intValue() : null)
            .obtainablePoints(pr.getObtainablePoints() != null ? pr.getObtainablePoints().intValue() : null)
            .status(pr.getStatus()).confidence(pr.getConfidence())
            .findings(pr.getFindings()).sourcesUsed(pr.getSourcesUsed())
            .evidences(evidences).build();
    }
}

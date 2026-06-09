package com.example.backend.report;

import com.example.backend.report.ReportDTO;
import com.example.backend.config.JwtService;
import com.example.backend.exception.AppException;
import com.example.backend.domain.PillarResult;
import com.example.backend.domain.Report;
import com.example.backend.shared.model.scoring.Evidence;
import com.example.backend.domain.PillarResultRepository;
import com.example.backend.domain.ReportRepository;
import com.example.backend.partners.QuickScanService;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.jsonwebtoken.Claims;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/reports")
@RequiredArgsConstructor
public class ReportController {

    private final ReportRepository reportRepository;
    private final PillarResultRepository pillarResultRepository;
    private final QuickScanService quickScanService;
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
            .overallScore(report.getOverallScore()).riskLevel(report.getRiskLevel())
            .hardStop(report.getHardStop()).build());
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

    private ReportDTO.ReportSummary toSummary(Report r) {
        return ReportDTO.ReportSummary.builder()
            .id(r.getId()).entityName(r.getEntityName()).countryIso2(r.getCountryIso2())
            .overallScore(r.getOverallScore()).hardStop(r.getHardStop())
            .status(r.getStatus()).riskLevel(r.getRiskLevel()).source(r.getSource())
            .quickScanDone(r.getQuickScanDone()).createdAt(r.getCreatedAt()).updatedAt(r.getUpdatedAt())
            .build();
    }

    private ReportDTO.ReportDetail toDetail(Report r, List<PillarResult> pillars) {
        return ReportDTO.ReportDetail.builder()
            .id(r.getId()).entityName(r.getEntityName()).countryIso2(r.getCountryIso2())
            .overallScore(r.getOverallScore()).hardStop(r.getHardStop()).status(r.getStatus())
            .riskLevel(r.getRiskLevel()).source(r.getSource()).quickScanDone(r.getQuickScanDone())
            .website(r.getWebsite()).taxId(r.getTaxId()).lei(r.getLei())
            .createdAt(r.getCreatedAt()).updatedAt(r.getUpdatedAt())
            .pillars(pillars.stream().map(this::toPillarDTO).toList())
            .dealSafetyAnalysis(r.getRawData())
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
            .status(pr.getStatus()).confidence(pr.getConfidence())
            .findings(pr.getFindings()).sourcesUsed(pr.getSourcesUsed())
            .evidences(evidences).build();
    }
}

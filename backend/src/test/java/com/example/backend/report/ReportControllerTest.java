package com.example.backend.report;

import com.example.backend.config.JwtService;
import com.example.backend.domain.PillarResultRepository;
import com.example.backend.domain.Report;
import com.example.backend.domain.ReportFlagRepository;
import com.example.backend.domain.ReportRepository;
import com.example.backend.domain.UsersRepository;
import com.example.backend.partners.QuickScanService;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.jsonwebtoken.Claims;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.ResponseEntity;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ReportControllerTest {

    @Mock private ReportRepository reportRepository;
    @Mock private PillarResultRepository pillarResultRepository;
    @Mock private ReportFlagRepository reportFlagRepository;
    @Mock private UsersRepository usersRepository;
    @Mock private QuickScanService quickScanService;
    @Mock private ReportRecommendationService recommendationService;
    @Mock private ReportPdfService reportPdfService;
    @Mock private JwtService jwtService;
    @Mock private Claims claims;

    private ReportController controller;
    private static final UUID USER_ID = UUID.randomUUID();

    @BeforeEach
    void setUp() {
        controller = new ReportController(reportRepository, pillarResultRepository,
            reportFlagRepository, usersRepository,
            quickScanService, recommendationService, reportPdfService, jwtService, new ObjectMapper());
        when(jwtService.parseToken(any())).thenReturn(claims);
        when(jwtService.getId(claims)).thenReturn(USER_ID);
    }

    private Report reportWith(Boolean hardStop, Boolean quickScanDone) {
        Report r = new Report();
        r.setId(UUID.randomUUID());
        r.setEntityName("Some Co");
        r.setCountryIso2("VN");
        r.setStatus("DONE");
        r.setHardStop(hardStop);
        r.setQuickScanDone(quickScanDone);
        r.setCreatedAt(Instant.now());
        r.setUpdatedAt(Instant.now());
        return r;
    }

    // Reported bug: /reports ("Could not load your reports") 500ing for a user whose
    // history contains even one older/legacy report with a null hard_stop or
    // quick_scan_done column — Report exposes these as nullable Boolean, but the DTO
    // fields were primitive boolean, so Lombok's builder NPEs unboxing null.
    @Test
    void listReports_reportWithNullHardStopAndQuickScanDone_doesNotThrow() {
        when(reportRepository.findByUserIdOrderByCreatedAtDesc(USER_ID))
            .thenReturn(List.of(reportWith(null, null), reportWith(true, false)));

        ResponseEntity<List<ReportDTO.ReportSummary>> resp = controller.listReports("Bearer token");

        assertThat(resp.getBody()).hasSize(2);
        assertThat(resp.getBody().get(0).isHardStop()).isFalse();
        assertThat(resp.getBody().get(0).isQuickScanDone()).isFalse();
        assertThat(resp.getBody().get(1).isHardStop()).isTrue();
    }

    @Test
    void getReport_nullHardStopAndQuickScanDone_doesNotThrow() {
        Report report = reportWith(null, null);
        report.setUser(new com.example.backend.domain.Users());
        report.getUser().setId(USER_ID);
        when(reportRepository.findById(report.getId())).thenReturn(java.util.Optional.of(report));
        when(pillarResultRepository.findByReportIdOrderByPillarNoAsc(report.getId())).thenReturn(List.of());

        ResponseEntity<ReportDTO.ReportDetail> resp = controller.getReport("Bearer token", report.getId());

        assertThat(resp.getBody().isHardStop()).isFalse();
        assertThat(resp.getBody().isQuickScanDone()).isFalse();
    }

    @Test
    void getStatus_nullHardStop_doesNotThrow() {
        Report report = reportWith(null, null);
        report.setUser(new com.example.backend.domain.Users());
        report.getUser().setId(USER_ID);
        when(reportRepository.findById(report.getId())).thenReturn(java.util.Optional.of(report));

        ResponseEntity<ReportDTO.ReportStatusResponse> resp = controller.getStatus("Bearer token", report.getId());

        assertThat(resp.getBody().isHardStop()).isFalse();
    }

    @Test
    void exportPdf_ownedReport_returnsPdfBytesWithAttachmentHeader() {
        Report report = reportWith(false, true);
        report.setUser(new com.example.backend.domain.Users());
        report.getUser().setId(USER_ID);
        when(reportRepository.findById(report.getId())).thenReturn(java.util.Optional.of(report));
        when(pillarResultRepository.findByReportIdOrderByPillarNoAsc(report.getId())).thenReturn(List.of());
        byte[] fakePdf = {1, 2, 3};
        when(reportPdfService.generate(report, List.of())).thenReturn(fakePdf);

        ResponseEntity<byte[]> resp = controller.exportPdf("Bearer token", report.getId());

        assertThat(resp.getBody()).isEqualTo(fakePdf);
        assertThat(resp.getHeaders().getContentDisposition().isAttachment()).isTrue();
        assertThat(resp.getHeaders().getContentDisposition().getFilename()).endsWith(".pdf");
    }

    @Test
    void exportPdf_notOwner_throwsReportNotFound() {
        Report report = reportWith(false, true);
        report.setUser(new com.example.backend.domain.Users());
        report.getUser().setId(UUID.randomUUID()); // different owner
        when(reportRepository.findById(report.getId())).thenReturn(java.util.Optional.of(report));

        org.junit.jupiter.api.Assertions.assertThrows(
            com.example.backend.exception.AppException.class,
            () -> controller.exportPdf("Bearer token", report.getId()));
    }

    // ── Admin correction reflected to the user ──────────────────────────

    @Test
    void getReport_withAdminOverride_returnsOverriddenValuesNotRawAiOutput() {
        Report report = reportWith(false, true);
        report.setUser(new com.example.backend.domain.Users());
        report.getUser().setId(USER_ID);
        report.setOverallScore((short) 90);
        report.setRiskLevel("Thấp");
        report.setOverrideScore((short) 20);
        report.setOverrideRiskLevel("Nghiêm trọng");
        report.setOverrideHardStop(true);
        report.setOverrideNote("Xác minh lại thủ công — phát hiện chứng từ giả mạo.");
        when(reportRepository.findById(report.getId())).thenReturn(java.util.Optional.of(report));
        when(pillarResultRepository.findByReportIdOrderByPillarNoAsc(report.getId())).thenReturn(List.of());

        ReportDTO.ReportDetail body = controller.getReport("Bearer token", report.getId()).getBody();

        assertThat(body.getOverallScore()).isEqualTo((short) 20);
        assertThat(body.getRiskLevel()).isEqualTo("Nghiêm trọng");
        assertThat(body.isHardStop()).isTrue();
        assertThat(body.isCorrected()).isTrue();
        assertThat(body.getCorrectionNote()).contains("chứng từ giả mạo");
    }

    @Test
    void getReport_noOverride_returnsRawAiOutputAndNotCorrected() {
        Report report = reportWith(false, true);
        report.setUser(new com.example.backend.domain.Users());
        report.getUser().setId(USER_ID);
        report.setOverallScore((short) 90);
        report.setRiskLevel("Thấp");
        when(reportRepository.findById(report.getId())).thenReturn(java.util.Optional.of(report));
        when(pillarResultRepository.findByReportIdOrderByPillarNoAsc(report.getId())).thenReturn(List.of());

        ReportDTO.ReportDetail body = controller.getReport("Bearer token", report.getId()).getBody();

        assertThat(body.getOverallScore()).isEqualTo((short) 90);
        assertThat(body.isCorrected()).isFalse();
    }

    // ── "Báo kết quả sai" ────────────────────────────────────────────────

    @Test
    void flagReport_ownedReport_savesFlagAndReturnsIt() {
        Report report = reportWith(false, true);
        com.example.backend.domain.Users user = new com.example.backend.domain.Users();
        user.setId(USER_ID);
        report.setUser(user);
        when(reportRepository.findById(report.getId())).thenReturn(java.util.Optional.of(report));
        when(usersRepository.findById(USER_ID)).thenReturn(java.util.Optional.of(user));
        when(reportFlagRepository.save(org.mockito.ArgumentMatchers.any(com.example.backend.domain.ReportFlag.class)))
            .thenAnswer(inv -> {
                com.example.backend.domain.ReportFlag f = inv.getArgument(0);
                f.setId(UUID.randomUUID());
                f.setCreatedAt(Instant.now());
                return f;
            });

        ReportDTO.FlagRequest req = ReportDTO.FlagRequest.builder()
            .reason("wrong_score").note("Điểm này sai, công ty đã đóng cửa từ 2020").build();
        ReportDTO.FlagResponse resp = controller.flagReport("Bearer token", report.getId(), req).getBody();

        assertThat(resp.getReason()).isEqualTo("WRONG_SCORE");
        assertThat(resp.getStatus()).isEqualTo("open");
        assertThat(resp.getReportId()).isEqualTo(report.getId());
    }

    @Test
    void flagReport_invalidReason_throwsBadRequest() {
        Report report = reportWith(false, true);
        com.example.backend.domain.Users user = new com.example.backend.domain.Users();
        user.setId(USER_ID);
        report.setUser(user);
        when(reportRepository.findById(report.getId())).thenReturn(java.util.Optional.of(report));

        ReportDTO.FlagRequest req = ReportDTO.FlagRequest.builder().reason("NOT_A_REAL_REASON").build();

        org.junit.jupiter.api.Assertions.assertThrows(
            com.example.backend.exception.AppException.class,
            () -> controller.flagReport("Bearer token", report.getId(), req));
    }

    @Test
    void flagReport_notOwner_throwsReportNotFound() {
        Report report = reportWith(false, true);
        com.example.backend.domain.Users user = new com.example.backend.domain.Users();
        user.setId(UUID.randomUUID()); // different owner
        report.setUser(user);
        when(reportRepository.findById(report.getId())).thenReturn(java.util.Optional.of(report));

        ReportDTO.FlagRequest req = ReportDTO.FlagRequest.builder().reason("OTHER").build();

        org.junit.jupiter.api.Assertions.assertThrows(
            com.example.backend.exception.AppException.class,
            () -> controller.flagReport("Bearer token", report.getId(), req));
    }
}

package com.example.backend.report;

import com.example.backend.config.JwtService;
import com.example.backend.domain.PillarResultRepository;
import com.example.backend.domain.Report;
import com.example.backend.domain.ReportRepository;
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
    @Mock private QuickScanService quickScanService;
    @Mock private ReportRecommendationService recommendationService;
    @Mock private JwtService jwtService;
    @Mock private Claims claims;

    private ReportController controller;
    private static final UUID USER_ID = UUID.randomUUID();

    @BeforeEach
    void setUp() {
        controller = new ReportController(reportRepository, pillarResultRepository,
            quickScanService, recommendationService, jwtService, new ObjectMapper());
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
}

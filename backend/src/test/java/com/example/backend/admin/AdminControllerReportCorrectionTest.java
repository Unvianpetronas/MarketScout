package com.example.backend.admin;

import com.example.backend.domain.*;
import com.example.backend.exception.AppException;
import com.example.backend.quota.QuotaService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.core.userdetails.UserDetails;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

/** Covers the admin report-override and report-flags endpoints added alongside the "báo kết quả sai" feature. */
@ExtendWith(MockitoExtension.class)
class AdminControllerReportCorrectionTest {

    @Mock private QuotaService quotaService;
    @Mock private UsersRepository usersRepository;
    @Mock private ReportRepository reportRepository;
    @Mock private ReportJobRepository reportJobRepository;
    @Mock private PillarResultRepository pillarResultRepository;
    @Mock private AuditLogRepository auditLogRepository;
    @Mock private SystemAlertRepository systemAlertRepository;
    @Mock private PlanRepository planRepository;
    @Mock private PaymentSettingsRepository paymentSettingsRepository;
    @Mock private ReportFlagRepository reportFlagRepository;
    @Mock private UserDetails actor;

    private AdminController controller;
    private static final UUID REPORT_ID = UUID.randomUUID();

    @BeforeEach
    void setUp() {
        controller = new AdminController(quotaService, usersRepository, reportRepository,
                reportJobRepository, pillarResultRepository, auditLogRepository,
                systemAlertRepository, planRepository, paymentSettingsRepository,
                reportFlagRepository);
        // lenient — not every test reaches the audit-log write that consumes this.
        lenient().when(actor.getUsername()).thenReturn("admin@marketscout.vn");
    }

    private Report reportWithAiScore() {
        Report r = new Report();
        r.setId(REPORT_ID);
        r.setEntityName("Some Co");
        r.setOverallScore((short) 85);
        r.setRiskLevel("Thấp");
        r.setHardStop(false);
        r.setCreatedAt(Instant.now());
        r.setUpdatedAt(Instant.now());
        return r;
    }

    @Test
    void overrideReport_missingNote_throwsBadRequest() {
        AdminDTO.ReportOverrideRequest req = new AdminDTO.ReportOverrideRequest((short) 10, "Cao", null, "  ", false);

        assertThatThrownBy(() -> controller.overrideReport(REPORT_ID, req, actor))
                .isInstanceOf(AppException.class);
        verifyNoInteractions(reportRepository);
    }

    @Test
    void overrideReport_noFieldsAndNotClear_throwsBadRequest() {
        when(reportRepository.findById(REPORT_ID)).thenReturn(Optional.of(reportWithAiScore()));
        AdminDTO.ReportOverrideRequest req = new AdminDTO.ReportOverrideRequest(null, null, null, "lý do", false);

        assertThatThrownBy(() -> controller.overrideReport(REPORT_ID, req, actor))
                .isInstanceOf(AppException.class);
    }

    @Test
    void overrideReport_validRequest_savesOverrideAndWritesAuditLog() {
        Report report = reportWithAiScore();
        when(reportRepository.findById(REPORT_ID)).thenReturn(Optional.of(report));
        when(usersRepository.findByEmail("admin@marketscout.vn")).thenReturn(Optional.empty());

        AdminDTO.ReportOverrideRequest req = new AdminDTO.ReportOverrideRequest(
                (short) 15, "Nghiêm trọng", true, "Xác minh lại: phát hiện sanctions hit thật", false);

        AdminDTO.ReportSummary result = controller.overrideReport(REPORT_ID, req, actor).getBody();

        assertThat(result.overrideScore()).isEqualTo((short) 15);
        assertThat(result.overrideRiskLevel()).isEqualTo("Nghiêm trọng");
        assertThat(result.overrideHardStop()).isTrue();
        // The raw AI-computed fields must survive untouched underneath the override.
        assertThat(report.getOverallScore()).isEqualTo((short) 85);
        verify(reportRepository).save(report);
        verify(auditLogRepository).save(argThat(log -> "REPORT_OVERRIDE".equals(log.getAction())));
    }

    @Test
    void overrideReport_clear_resetsOverrideFieldsButKeepsNote() {
        Report report = reportWithAiScore();
        report.setOverrideScore((short) 15);
        report.setOverrideRiskLevel("Nghiêm trọng");
        report.setOverrideHardStop(true);
        when(reportRepository.findById(REPORT_ID)).thenReturn(Optional.of(report));
        when(usersRepository.findByEmail("admin@marketscout.vn")).thenReturn(Optional.empty());

        AdminDTO.ReportOverrideRequest req = new AdminDTO.ReportOverrideRequest(
                null, null, null, "Đã xác minh lại — điểm AI gốc là đúng", true);

        controller.overrideReport(REPORT_ID, req, actor);

        assertThat(report.getOverrideScore()).isNull();
        assertThat(report.getOverrideRiskLevel()).isNull();
        assertThat(report.getOverrideHardStop()).isNull();
        assertThat(report.isOverridden()).isFalse();
        verify(auditLogRepository).save(argThat(log -> "REPORT_OVERRIDE_CLEAR".equals(log.getAction())));
    }

    @Test
    void listReportFlags_filteredByReportId_bypassesPagingAndReturnsAllForThatReport() {
        ReportFlag flag = new ReportFlag();
        flag.setId(UUID.randomUUID());
        flag.setReport(reportWithAiScore());
        Users user = new Users();
        user.setId(UUID.randomUUID());
        user.setEmail("user@example.com");
        flag.setUser(user);
        flag.setReason("WRONG_SCORE");
        flag.setCreatedAt(Instant.now());
        when(reportFlagRepository.findByReport_IdOrderByCreatedAtDesc(REPORT_ID)).thenReturn(List.of(flag));

        var body = controller.listReportFlags(0, 20, null, REPORT_ID).getBody();

        @SuppressWarnings("unchecked")
        List<AdminDTO.ReportFlagDTO> flags = (List<AdminDTO.ReportFlagDTO>) body.get("flags");
        assertThat(flags).hasSize(1);
        assertThat(flags.get(0).reportId()).isEqualTo(REPORT_ID);
        verify(reportFlagRepository).findByReport_IdOrderByCreatedAtDesc(REPORT_ID);
        verify(reportFlagRepository, never()).findAllByOrderByCreatedAtDesc(any());
        verify(reportFlagRepository, never()).findByStatusOrderByCreatedAtDesc(any(), any());
    }

    @Test
    void resolveReportFlag_invalidStatus_throwsBadRequest() {
        AdminDTO.ReportFlagResolveRequest req = new AdminDTO.ReportFlagResolveRequest("bogus", null);

        assertThatThrownBy(() -> controller.resolveReportFlag(UUID.randomUUID(), req, actor))
                .isInstanceOf(AppException.class);
    }

    @Test
    void resolveReportFlag_resolved_setsResolvedByAndTimestamp() {
        ReportFlag flag = new ReportFlag();
        UUID flagId = UUID.randomUUID();
        flag.setId(flagId);
        flag.setReport(reportWithAiScore());
        Users user = new Users();
        user.setId(UUID.randomUUID());
        user.setEmail("user@example.com");
        flag.setUser(user);
        flag.setReason("OTHER");
        flag.setStatus("open");
        flag.setCreatedAt(Instant.now());
        when(reportFlagRepository.findById(flagId)).thenReturn(Optional.of(flag));
        when(usersRepository.findByEmail("admin@marketscout.vn")).thenReturn(Optional.empty());

        AdminDTO.ReportFlagResolveRequest req = new AdminDTO.ReportFlagResolveRequest("resolved", "Đã xác minh, điểm đúng");

        AdminDTO.ReportFlagDTO result = controller.resolveReportFlag(flagId, req, actor).getBody();

        assertThat(result.status()).isEqualTo("resolved");
        assertThat(flag.getResolvedAt()).isNotNull();
        assertThat(flag.getNote()).contains("Đã xác minh, điểm đúng");
        verify(auditLogRepository).save(argThat(log -> "REPORT_FLAG_RESOLVED".equals(log.getAction())));
    }
}

package com.example.backend.admin;

import com.example.backend.domain.*;
import com.example.backend.exception.AppException;
import com.example.backend.quota.QuotaService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.userdetails.UserDetails;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AdminControllerPaymentSettingsTest {

    @Mock private QuotaService quotaService;
    @Mock private UsersRepository usersRepository;
    @Mock private ReportRepository reportRepository;
    @Mock private ReportJobRepository reportJobRepository;
    @Mock private PillarResultRepository pillarResultRepository;
    @Mock private AuditLogRepository auditLogRepository;
    @Mock private SystemAlertRepository systemAlertRepository;
    @Mock private PlanRepository planRepository;
    @Mock private PaymentSettingsRepository paymentSettingsRepository;
    @Mock private UserDetails actor;

    private AdminController controller;

    @BeforeEach
    void setUp() {
        controller = new AdminController(quotaService, usersRepository, reportRepository,
                reportJobRepository, pillarResultRepository, auditLogRepository,
                systemAlertRepository, planRepository, paymentSettingsRepository);
    }

    @Test
    void getPaymentSettings_returnsCurrentPrice() {
        Instant now = Instant.now();
        PaymentSettings settings = new PaymentSettings(1, new BigDecimal("200000"), now);
        when(paymentSettingsRepository.findById(1)).thenReturn(Optional.of(settings));

        ResponseEntity<AdminDTO.PaymentSettingsDTO> resp = controller.getPaymentSettings();

        assertThat(resp.getBody().pricePerCreditVnd()).isEqualByComparingTo("200000");
        assertThat(resp.getBody().updatedAt()).isEqualTo(now);
    }

    @Test
    void getPaymentSettings_missingRow_throws() {
        when(paymentSettingsRepository.findById(1)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> controller.getPaymentSettings())
                .isInstanceOf(AppException.class);
    }

    @Test
    void updatePaymentSettings_savesNewPrice_andWritesAuditLog() {
        PaymentSettings settings = new PaymentSettings(1, new BigDecimal("200000"), Instant.now());
        when(paymentSettingsRepository.findById(1)).thenReturn(Optional.of(settings));
        when(usersRepository.findByEmail(any())).thenReturn(Optional.empty());

        ResponseEntity<AdminDTO.PaymentSettingsDTO> resp = controller.updatePaymentSettings(
                new AdminDTO.PaymentSettingsUpdateRequest(new BigDecimal("250000")), actor);

        assertThat(resp.getBody().pricePerCreditVnd()).isEqualByComparingTo("250000");
        verify(paymentSettingsRepository).save(argThat(s -> s.getPricePerCreditVnd().compareTo(new BigDecimal("250000")) == 0));
        verify(auditLogRepository).save(any());
    }

    @Test
    void updatePaymentSettings_rejectsZeroOrNegativePrice() {
        assertThatThrownBy(() -> controller.updatePaymentSettings(
                new AdminDTO.PaymentSettingsUpdateRequest(BigDecimal.ZERO), actor))
                .isInstanceOf(AppException.class);

        assertThatThrownBy(() -> controller.updatePaymentSettings(
                new AdminDTO.PaymentSettingsUpdateRequest(new BigDecimal("-100")), actor))
                .isInstanceOf(AppException.class);

        verifyNoInteractions(paymentSettingsRepository);
    }

    @Test
    void updatePaymentSettings_rejectsNullPrice() {
        assertThatThrownBy(() -> controller.updatePaymentSettings(
                new AdminDTO.PaymentSettingsUpdateRequest(null), actor))
                .isInstanceOf(AppException.class);
    }
}

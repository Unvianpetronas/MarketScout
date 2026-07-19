package com.example.backend.admin;

import com.example.backend.domain.*;
import com.example.backend.exception.AppException;
import com.example.backend.quota.QuotaDTO;
import com.example.backend.quota.QuotaService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@RestController
@RequestMapping("/api/v1/admin")
@RequiredArgsConstructor
public class AdminController {

    private final QuotaService quotaService;
    private final UsersRepository usersRepository;
    private final ReportRepository reportRepository;
    private final ReportJobRepository reportJobRepository;
    private final PillarResultRepository pillarResultRepository;
    private final AuditLogRepository auditLogRepository;
    private final SystemAlertRepository systemAlertRepository;
    private final PlanRepository planRepository;
    private final PaymentSettingsRepository paymentSettingsRepository;
    private final ReportFlagRepository reportFlagRepository;

    // ═══════════════════════════════════════════════════════════════════
    // GROUP 1 — ANALYTICS OVERVIEW
    // ═══════════════════════════════════════════════════════════════════

    @GetMapping("/analytics/overview")
    public ResponseEntity<AdminDTO.AnalyticsOverview> getOverview() {
        Instant now = Instant.now();
        Instant startOfMonth = now.truncatedTo(ChronoUnit.DAYS)
                .minus(now.atZone(java.time.ZoneOffset.UTC).getDayOfMonth() - 1L, ChronoUnit.DAYS);
        Instant startOfLastMonth = startOfMonth.minus(1, ChronoUnit.DAYS)
                .truncatedTo(ChronoUnit.DAYS)
                .minus(startOfMonth.minus(1, ChronoUnit.DAYS)
                        .atZone(java.time.ZoneOffset.UTC).getDayOfMonth() - 1L, ChronoUnit.DAYS);

        long totalUsers        = usersRepository.count();
        long activeUsers       = usersRepository.countByIsActiveTrue();
        long newUsersThisMonth = usersRepository.countByCreatedAtBetween(startOfMonth, now);
        long newUsersLastMonth = usersRepository.countByCreatedAtBetween(startOfLastMonth, startOfMonth);

        long totalReports        = reportRepository.count();
        long reportsThisMonth    = reportRepository.countByCreatedAtBetween(startOfMonth, now);
        long reportsLastMonth    = reportRepository.countByCreatedAtBetween(startOfLastMonth, startOfMonth);

        Map<String, Long> byStatus = reportRepository.countGroupByStatus().stream()
                .collect(Collectors.toMap(r -> (String) r[0], r -> (Long) r[1]));

        Map<String, Long> byRisk = reportRepository.countGroupByRiskLevel().stream()
                .collect(Collectors.toMap(r -> (String) r[0], r -> (Long) r[1]));

        List<AdminDTO.TopCompany> topCompanies = reportRepository
                .findTopEntities(PageRequest.of(0, 5))
                .stream()
                .map(r -> new AdminDTO.TopCompany((String) r[0], (Long) r[1]))
                .toList();

        Map<String, Long> usersByPlan = usersRepository.countGroupByPlanName().stream()
                .collect(Collectors.toMap(r -> (String) r[0], r -> (Long) r[1]));

        long totalJobs   = reportJobRepository.count();
        long failedJobs  = reportJobRepository.countByStatus("failed");
        long runningJobs = reportJobRepository.countByStatus("running");
        long openAlerts  = systemAlertRepository.countByIsResolvedFalse();

        return ResponseEntity.ok(new AdminDTO.AnalyticsOverview(
                totalUsers, activeUsers, newUsersThisMonth, newUsersLastMonth,
                totalReports, reportsThisMonth, reportsLastMonth,
                byStatus, byRisk, topCompanies, usersByPlan,
                totalJobs, failedJobs, runningJobs, openAlerts));
    }

    // ═══════════════════════════════════════════════════════════════════
    // GROUP 2 — USER MANAGEMENT
    // ═══════════════════════════════════════════════════════════════════

    @GetMapping("/users")
    public ResponseEntity<Map<String, Object>> listUsers(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(defaultValue = "") String search) {

        Page<Users> result = usersRepository.searchUsers(
                search,
                PageRequest.of(page, size, Sort.by("createdAt").descending()));

        List<AdminDTO.AdminUser> items = result.getContent().stream().map(this::toAdminUser).toList();

        return ResponseEntity.ok(Map.of(
                "users", items, "total", result.getTotalElements(), "page", page, "size", size));
    }

    @GetMapping("/users/{id}")
    public ResponseEntity<AdminDTO.AdminUser> getUserDetail(@PathVariable UUID id) {
        Users u = usersRepository.findByIdWithPlan(id)
                .orElseThrow(() -> new AppException(AppException.ErrorCode.USER_NOT_FOUND));
        return ResponseEntity.ok(toAdminUser(u));
    }

    @PatchMapping("/users/{id}/active")
    public ResponseEntity<Map<String, Object>> toggleUserActive(
            @PathVariable UUID id,
            @RequestBody Map<String, Boolean> body,
            @AuthenticationPrincipal UserDetails actor) {

        boolean active = Boolean.TRUE.equals(body.get("active"));
        usersRepository.setActiveStatus(id, active);
        writeAuditLog(actor, active ? "USER_ACTIVATE" : "USER_DEACTIVATE", "user", id, null);
        return ResponseEntity.ok(Map.of("id", id, "isActive", active));
    }

    @PatchMapping("/users/{id}/role")
    public ResponseEntity<Map<String, Object>> changeUserRole(
            @PathVariable UUID id,
            @RequestBody Map<String, String> body,
            @AuthenticationPrincipal UserDetails actor) {

        String role = body.get("role");
        if (role == null || (!role.equals("user") && !role.equals("admin")))
            return ResponseEntity.badRequest().body(Map.of("error", "role must be 'user' or 'admin'"));

        usersRepository.setRole(id, role);
        writeAuditLog(actor, "USER_ROLE_CHANGE", "user", id, "{\"role\":\"" + role + "\"}");
        return ResponseEntity.ok(Map.of("id", id, "role", role));
    }

    // ═══════════════════════════════════════════════════════════════════
    // GROUP 2b — QUOTA (existing endpoints kept + grant)
    // ═══════════════════════════════════════════════════════════════════

    @PatchMapping("/users/{id}/quota")
    public ResponseEntity<QuotaDTO.QuotaResponse> setQuota(
            @PathVariable UUID id,
            @Valid @RequestBody QuotaDTO.AdminSetRequest req,
            @AuthenticationPrincipal UserDetails actor) {

        quotaService.adminSetQuota(id, req.getQuota());
        Users user = usersRepository.findById(id)
                .orElseThrow(() -> new AppException(AppException.ErrorCode.USER_NOT_FOUND));
        writeAuditLog(actor, "QUOTA_SET", "user", id, "{\"quota\":" + req.getQuota() + "}");
        return ResponseEntity.ok(new QuotaDTO.QuotaResponse(id, user.getQuotaRemaining(), "Quota updated successfully"));
    }

    @PostMapping("/users/{id}/quota/refund")
    public ResponseEntity<QuotaDTO.QuotaResponse> refundQuota(
            @PathVariable UUID id,
            @AuthenticationPrincipal UserDetails actor) {

        quotaService.refundOne(id);
        Users user = usersRepository.findById(id)
                .orElseThrow(() -> new AppException(AppException.ErrorCode.USER_NOT_FOUND));
        writeAuditLog(actor, "QUOTA_REFUND", "user", id, null);
        return ResponseEntity.ok(new QuotaDTO.QuotaResponse(id, user.getQuotaRemaining(), "Quota refunded successfully"));
    }

    // ═══════════════════════════════════════════════════════════════════
    // GROUP 3 — REPORT MANAGEMENT
    // ═══════════════════════════════════════════════════════════════════

    @GetMapping("/reports")
    public ResponseEntity<Map<String, Object>> listReports(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) String entityName,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String riskLevel,
            @RequestParam(required = false) UUID userId) {

        Page<Report> result = reportRepository.searchReports(
                entityName, status, riskLevel, userId,
                PageRequest.of(page, size, Sort.by("createdAt").descending()));

        List<AdminDTO.ReportSummary> items = result.getContent().stream()
                .map(this::toReportSummary).toList();

        return ResponseEntity.ok(Map.of(
                "reports", items, "total", result.getTotalElements(),
                "page", page, "size", size, "totalPages", result.getTotalPages()));
    }

    @GetMapping("/reports/{id}")
    public ResponseEntity<AdminDTO.ReportDetail> getReportDetail(@PathVariable UUID id) {
        Report r = reportRepository.findById(id)
                .orElseThrow(() -> new AppException(AppException.ErrorCode.REPORT_NOT_FOUND));
        List<PillarResult> pillars = pillarResultRepository.findByReportIdOrderByPillarNoAsc(id);
        return ResponseEntity.ok(new AdminDTO.ReportDetail(toReportSummary(r), pillars.stream().map(this::toPillarDTO).toList()));
    }

    @DeleteMapping("/reports/{id}")
    public ResponseEntity<Map<String, Object>> deleteReport(
            @PathVariable UUID id,
            @AuthenticationPrincipal UserDetails actor) {

        Report r = reportRepository.findById(id)
                .orElseThrow(() -> new AppException(AppException.ErrorCode.REPORT_NOT_FOUND));
        reportRepository.delete(r);
        writeAuditLog(actor, "REPORT_DELETE", "report", id, "{\"entity\":\"" + r.getEntityName() + "\"}");
        return ResponseEntity.ok(Map.of("deleted", id));
    }

    @PostMapping("/reports/{id}/retry")
    public ResponseEntity<Map<String, Object>> retryReport(
            @PathVariable UUID id,
            @AuthenticationPrincipal UserDetails actor) {

        Report r = reportRepository.findById(id)
                .orElseThrow(() -> new AppException(AppException.ErrorCode.REPORT_NOT_FOUND));
        r.setStatus("PENDING");
        r.setHardStop(false);
        reportRepository.save(r);
        writeAuditLog(actor, "REPORT_RETRY", "report", id, null);
        return ResponseEntity.ok(Map.of("id", id, "status", "PENDING"));
    }

    /**
     * PATCH /api/v1/admin/reports/{id}/override
     * Corrects a report's score/risk-level/hard-stop without touching the
     * AI-computed fields underneath — those stay intact for audit. A note
     * explaining the correction is mandatory (also required to clear one),
     * and every call is written to the audit log.
     */
    @PatchMapping("/reports/{id}/override")
    public ResponseEntity<AdminDTO.ReportSummary> overrideReport(
            @PathVariable UUID id,
            @Valid @RequestBody AdminDTO.ReportOverrideRequest req,
            @AuthenticationPrincipal UserDetails actor) {

        if (req.note() == null || req.note().isBlank()) {
            throw new AppException(AppException.ErrorCode.BAD_REQUEST,
                    "note là bắt buộc — giải thích lý do điều chỉnh hoặc gỡ điều chỉnh.");
        }
        Report r = reportRepository.findById(id)
                .orElseThrow(() -> new AppException(AppException.ErrorCode.REPORT_NOT_FOUND));
        Users actorUser = usersRepository.findByEmail(actor.getUsername()).orElse(null);

        if (req.clear()) {
            r.setOverrideScore(null);
            r.setOverrideRiskLevel(null);
            r.setOverrideHardStop(null);
        } else {
            if (req.overrideScore() == null && req.overrideRiskLevel() == null && req.overrideHardStop() == null) {
                throw new AppException(AppException.ErrorCode.BAD_REQUEST,
                        "Cần ít nhất một trong overrideScore/overrideRiskLevel/overrideHardStop, hoặc clear=true.");
            }
            r.setOverrideScore(req.overrideScore());
            r.setOverrideRiskLevel(req.overrideRiskLevel());
            r.setOverrideHardStop(req.overrideHardStop());
        }
        r.setOverrideNote(req.note());
        r.setOverriddenBy(actorUser);
        r.setOverriddenAt(Instant.now());
        reportRepository.save(r);

        writeAuditLog(actor, req.clear() ? "REPORT_OVERRIDE_CLEAR" : "REPORT_OVERRIDE", "report", id,
                "{\"overrideScore\":" + req.overrideScore()
                        + ",\"overrideRiskLevel\":" + quoteOrNull(req.overrideRiskLevel())
                        + ",\"overrideHardStop\":" + req.overrideHardStop()
                        + ",\"note\":" + quoteOrNull(req.note()) + "}");
        return ResponseEntity.ok(toReportSummary(r));
    }

    // ═══════════════════════════════════════════════════════════════════
    // GROUP 3b — REPORT FLAGS ("báo kết quả sai" queue)
    // ═══════════════════════════════════════════════════════════════════

    @GetMapping("/report-flags")
    public ResponseEntity<Map<String, Object>> listReportFlags(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) UUID reportId) {

        if (reportId != null) {
            List<AdminDTO.ReportFlagDTO> items = reportFlagRepository.findByReport_IdOrderByCreatedAtDesc(reportId)
                    .stream().map(this::toReportFlagDTO).toList();
            return ResponseEntity.ok(Map.of("flags", items, "total", (long) items.size(), "page", 0, "size", items.size()));
        }
        Page<ReportFlag> result = (status != null && !status.isBlank())
                ? reportFlagRepository.findByStatusOrderByCreatedAtDesc(status, PageRequest.of(page, size))
                : reportFlagRepository.findAllByOrderByCreatedAtDesc(PageRequest.of(page, size));

        List<AdminDTO.ReportFlagDTO> items = result.getContent().stream().map(this::toReportFlagDTO).toList();
        return ResponseEntity.ok(Map.of(
                "flags", items, "total", result.getTotalElements(), "page", page, "size", size));
    }

    @PatchMapping("/report-flags/{id}")
    public ResponseEntity<AdminDTO.ReportFlagDTO> resolveReportFlag(
            @PathVariable UUID id,
            @RequestBody AdminDTO.ReportFlagResolveRequest req,
            @AuthenticationPrincipal UserDetails actor) {

        String status = req.status();
        if (!"resolved".equals(status) && !"dismissed".equals(status)) {
            throw new AppException(AppException.ErrorCode.BAD_REQUEST, "status phải là 'resolved' hoặc 'dismissed'");
        }
        ReportFlag flag = reportFlagRepository.findById(id)
                .orElseThrow(() -> new AppException(AppException.ErrorCode.RESOURCE_NOT_FOUND));
        Users actorUser = usersRepository.findByEmail(actor.getUsername()).orElse(null);

        flag.setStatus(status);
        flag.setResolvedBy(actorUser);
        flag.setResolvedAt(Instant.now());
        if (req.resolutionNote() != null && !req.resolutionNote().isBlank()) {
            flag.setNote((flag.getNote() != null ? flag.getNote() + "\n\n" : "")
                    + "[admin] " + req.resolutionNote());
        }
        reportFlagRepository.save(flag);
        writeAuditLog(actor, "REPORT_FLAG_" + status.toUpperCase(), "report_flag", id,
                "{\"reportId\":\"" + flag.getReport().getId() + "\"}");
        return ResponseEntity.ok(toReportFlagDTO(flag));
    }

    // ═══════════════════════════════════════════════════════════════════
    // GROUP 4 — AI PIPELINE / JOB MONITORING
    // ═══════════════════════════════════════════════════════════════════

    @GetMapping("/jobs")
    public ResponseEntity<Map<String, Object>> listJobs(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) String status) {

        Page<ReportJob> result = (status != null && !status.isBlank())
                ? reportJobRepository.findByStatusOrderByUpdatedAtDesc(status, PageRequest.of(page, size))
                : reportJobRepository.findAllByOrderByUpdatedAtDesc(PageRequest.of(page, size));

        List<AdminDTO.JobSummary> items = result.getContent().stream().map(this::toJobSummary).toList();
        return ResponseEntity.ok(Map.of(
                "jobs", items, "total", result.getTotalElements(),
                "page", page, "size", size));
    }

    @PostMapping("/jobs/{id}/retry")
    public ResponseEntity<Map<String, Object>> retryJob(
            @PathVariable UUID id,
            @AuthenticationPrincipal UserDetails actor) {

        ReportJob job = reportJobRepository.findById(id)
                .orElseThrow(() -> new AppException(AppException.ErrorCode.RESOURCE_NOT_FOUND));
        job.setStatus("queued");
        job.setAttemptCount(0);
        job.setErrorMessage(null);
        reportJobRepository.save(job);
        writeAuditLog(actor, "JOB_RETRY", "job", id, null);
        return ResponseEntity.ok(Map.of("id", id, "status", "queued"));
    }

    // ═══════════════════════════════════════════════════════════════════
    // GROUP 5 — AUDIT LOGS
    // ═══════════════════════════════════════════════════════════════════

    @GetMapping("/audit-logs")
    public ResponseEntity<Map<String, Object>> listAuditLogs(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "30") int size) {

        Page<AuditLog> result = auditLogRepository.findAllByOrderByCreatedAtDesc(PageRequest.of(page, size));
        List<AdminDTO.AuditLogEntry> items = result.getContent().stream().map(l -> new AdminDTO.AuditLogEntry(
                l.getId(), l.getActor() != null ? l.getActor().getEmail() : "system",
                l.getAction(), l.getTargetType(), l.getTargetId(),
                l.getIpAddress(), l.getCreatedAt())).toList();
        return ResponseEntity.ok(Map.of(
                "logs", items, "total", result.getTotalElements(), "page", page, "size", size));
    }

    // ═══════════════════════════════════════════════════════════════════
    // GROUP 6 — SYSTEM ALERTS
    // ═══════════════════════════════════════════════════════════════════

    @GetMapping("/alerts")
    public ResponseEntity<Map<String, Object>> listAlerts(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(defaultValue = "false") boolean unresolvedOnly) {

        Page<SystemAlert> result = unresolvedOnly
                ? systemAlertRepository.findByIsResolvedFalseOrderByCreatedAtDesc(PageRequest.of(page, size))
                : systemAlertRepository.findAllByOrderByCreatedAtDesc(PageRequest.of(page, size));

        List<AdminDTO.AlertEntry> items = result.getContent().stream().map(a -> new AdminDTO.AlertEntry(
                a.getId(), a.getAlertType(), a.getSeverity(), a.getMessage(),
                a.getIsResolved(), a.getCreatedAt(), a.getResolvedAt())).toList();
        return ResponseEntity.ok(Map.of("alerts", items, "total", result.getTotalElements()));
    }

    @PatchMapping("/alerts/{id}/resolve")
    public ResponseEntity<Map<String, Object>> resolveAlert(
            @PathVariable UUID id,
            @AuthenticationPrincipal UserDetails actor) {

        SystemAlert alert = systemAlertRepository.findById(id)
                .orElseThrow(() -> new AppException(AppException.ErrorCode.RESOURCE_NOT_FOUND));
        alert.setIsResolved(true);
        alert.setResolvedAt(Instant.now());
        systemAlertRepository.save(alert);
        writeAuditLog(actor, "ALERT_RESOLVE", "alert", id, null);
        return ResponseEntity.ok(Map.of("id", id, "resolved", true));
    }

    // ═══════════════════════════════════════════════════════════════════
    // GROUP 7 — PLANS CONFIG
    // ═══════════════════════════════════════════════════════════════════

    @GetMapping("/plans")
    public ResponseEntity<List<AdminDTO.PlanDTO>> listPlans() {
        return ResponseEntity.ok(planRepository.findAll().stream().map(this::toPlanDTO).toList());
    }

    @PatchMapping("/plans/{id}")
    public ResponseEntity<AdminDTO.PlanDTO> updatePlan(
            @PathVariable Integer id,
            @RequestBody AdminDTO.PlanUpdateRequest req,
            @AuthenticationPrincipal UserDetails actor) {

        Plan plan = planRepository.findById(id)
                .orElseThrow(() -> new AppException(AppException.ErrorCode.RESOURCE_NOT_FOUND));
        if (req.monthlyQuota() != null) plan.setMonthlyQuota(req.monthlyQuota());
        if (req.priceVnd() != null)     plan.setPriceVnd(req.priceVnd());
        if (req.priceUsd() != null)     plan.setPriceUsd(req.priceUsd());
        if (req.features() != null)     plan.setFeatures(req.features());
        if (req.isActive() != null)     plan.setIsActive(req.isActive());
        planRepository.save(plan);
        writeAuditLog(actor, "PLAN_UPDATE", "plan", null, "{\"planId\":" + id + "}");
        return ResponseEntity.ok(toPlanDTO(plan));
    }

    // ═══════════════════════════════════════════════════════════════════
    // GROUP 7b — PAYMENT SETTINGS (top-up credit price)
    // ═══════════════════════════════════════════════════════════════════

    @GetMapping("/payment-settings")
    public ResponseEntity<AdminDTO.PaymentSettingsDTO> getPaymentSettings() {
        PaymentSettings settings = paymentSettingsRepository.findById(1)
                .orElseThrow(() -> new AppException(AppException.ErrorCode.RESOURCE_NOT_FOUND,
                        "Payment settings not configured — run db/payment_settings.sql"));
        return ResponseEntity.ok(toPaymentSettingsDTO(settings));
    }

    @PatchMapping("/payment-settings")
    public ResponseEntity<AdminDTO.PaymentSettingsDTO> updatePaymentSettings(
            @RequestBody AdminDTO.PaymentSettingsUpdateRequest req,
            @AuthenticationPrincipal UserDetails actor) {

        if (req.pricePerCreditVnd() == null || req.pricePerCreditVnd().signum() <= 0) {
            throw new AppException(AppException.ErrorCode.BAD_REQUEST, "pricePerCreditVnd must be greater than 0");
        }
        PaymentSettings settings = paymentSettingsRepository.findById(1)
                .orElseThrow(() -> new AppException(AppException.ErrorCode.RESOURCE_NOT_FOUND,
                        "Payment settings not configured — run db/payment_settings.sql"));
        settings.setPricePerCreditVnd(req.pricePerCreditVnd());
        settings.setUpdatedAt(Instant.now());
        paymentSettingsRepository.save(settings);
        writeAuditLog(actor, "PAYMENT_SETTINGS_UPDATE", "payment_settings", null,
                "{\"pricePerCreditVnd\":" + req.pricePerCreditVnd() + "}");
        return ResponseEntity.ok(toPaymentSettingsDTO(settings));
    }

    // ═══════════════════════════════════════════════════════════════════
    // INTERNAL HELPERS
    // ═══════════════════════════════════════════════════════════════════

    private void writeAuditLog(UserDetails actor, String action, String targetType, UUID targetId, String payload) {
        try {
            Users actorUser = usersRepository.findByEmail(actor.getUsername()).orElse(null);
            AuditLog log = new AuditLog();
            log.setActor(actorUser);
            log.setAction(action);
            log.setTargetType(targetType);
            log.setTargetId(targetId);
            log.setPayload(payload);
            auditLogRepository.save(log);
        } catch (Exception e) {
            log.warn("Failed to write audit log for action={}: {}", action, e.getMessage());
        }
    }

    private AdminDTO.AdminUser toAdminUser(Users u) {
        return new AdminDTO.AdminUser(
                u.getId(), u.getEmail(),
                u.getFullName() != null ? u.getFullName() : u.getEmail().split("@")[0],
                u.getRole(),
                u.getPlan() != null ? u.getPlan().getName() : "Free",
                u.getPlan() != null && u.getPlan().getMonthlyQuota() != null ? u.getPlan().getMonthlyQuota() : 3,
                u.getQuotaRemaining(), u.getQuotaUsedThisCycle(),
                u.getIsActive() != null && u.getIsActive(),
                u.getEmailVerified() != null && u.getEmailVerified(),
                u.getCreatedAt(), u.getLastLoginAt());
    }

    private AdminDTO.ReportSummary toReportSummary(Report r) {
        return new AdminDTO.ReportSummary(
                r.getId(), r.getEntityName(), r.getCountryIso2(), r.getTier(),
                r.getStatus(), r.getRiskLevel(), r.getOverallScore(), r.getHardStop(),
                r.getSource(), r.getWebsite(), r.getTaxId(),
                r.getUser() != null ? r.getUser().getEmail() : null,
                r.getUser() != null ? r.getUser().getId() : null,
                r.getCreatedAt(), r.getUpdatedAt(),
                r.getOverrideScore(), r.getOverrideRiskLevel(), r.getOverrideHardStop(),
                r.getOverrideNote(), r.getOverriddenBy() != null ? r.getOverriddenBy().getEmail() : null,
                r.getOverriddenAt());
    }

    private AdminDTO.ReportFlagDTO toReportFlagDTO(ReportFlag f) {
        return new AdminDTO.ReportFlagDTO(
                f.getId(), f.getReport().getId(), f.getReport().getEntityName(),
                f.getUser().getId(), f.getUser().getEmail(),
                f.getReason(), f.getNote(), f.getStatus(),
                f.getResolvedBy() != null ? f.getResolvedBy().getEmail() : null,
                f.getResolvedAt(), f.getCreatedAt());
    }

    /** JSON-string-escapes a nullable value for the flat audit-log payload strings used throughout this class. */
    private static String quoteOrNull(String s) {
        return s == null ? "null" : "\"" + s.replace("\"", "'") + "\"";
    }

    private AdminDTO.PillarDTO toPillarDTO(PillarResult p) {
        return new AdminDTO.PillarDTO(
                p.getId(), p.getPillarNo(), p.getPillarName(), p.getScore(),
                p.getStatus(), p.getConfidence(), p.getFindings(), p.getLatencyMs());
    }

    private AdminDTO.JobSummary toJobSummary(ReportJob j) {
        return new AdminDTO.JobSummary(
                j.getId(), j.getStatus(), j.getCurrentPillar(),
                j.getAttemptCount(), j.getErrorMessage(),
                j.getStartedAt(), j.getCompletedAt(), j.getUpdatedAt());
    }

    private AdminDTO.PlanDTO toPlanDTO(Plan p) {
        return new AdminDTO.PlanDTO(
                p.getId(), p.getName(), p.getBillingCycle(),
                p.getPriceUsd(), p.getPriceVnd(), p.getMonthlyQuota(),
                p.getFeatures(), p.getIsActive());
    }

    private AdminDTO.PaymentSettingsDTO toPaymentSettingsDTO(PaymentSettings s) {
        return new AdminDTO.PaymentSettingsDTO(s.getPricePerCreditVnd(), s.getUpdatedAt());
    }
}

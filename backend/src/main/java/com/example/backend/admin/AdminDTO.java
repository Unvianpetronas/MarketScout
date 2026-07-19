package com.example.backend.admin;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;

public class AdminDTO {

    public record AnalyticsOverview(
            long totalUsers,
            long activeUsers,
            long newUsersThisMonth,
            long newUsersLastMonth,
            long totalReports,
            long reportsThisMonth,
            long reportsLastMonth,
            Map<String, Long> reportsByStatus,
            Map<String, Long> reportsByRiskLevel,
            List<TopCompany> topCompanies,
            Map<String, Long> usersByPlan,
            long totalJobs,
            long failedJobs,
            long runningJobs,
            long openAlerts
    ) {}

    public record TopCompany(String name, Long count) {}

    public record AdminUser(
            UUID id,
            String email,
            String fullName,
            String role,
            String planName,
            int monthlyQuota,
            int quotaRemaining,
            int quotaUsed,
            boolean isActive,
            boolean emailVerified,
            Instant createdAt,
            Instant lastLoginAt
    ) {}

    public record ReportSummary(
            UUID id,
            String entityName,
            String countryIso2,
            String tier,
            String status,
            String riskLevel,
            Short overallScore,
            Boolean hardStop,
            String source,
            String website,
            String taxId,
            String userEmail,
            UUID userId,
            Instant createdAt,
            Instant updatedAt,
            Short overrideScore,
            String overrideRiskLevel,
            Boolean overrideHardStop,
            String overrideNote,
            String overriddenByEmail,
            Instant overriddenAt
    ) {}

    public record ReportDetail(
            ReportSummary report,
            List<PillarDTO> pillars
    ) {}

    /** clear=true resets the correction (note still required — explain why). */
    public record ReportOverrideRequest(
            Short overrideScore,
            String overrideRiskLevel,
            Boolean overrideHardStop,
            String note,
            boolean clear
    ) {}

    public record ReportFlagDTO(
            UUID id,
            UUID reportId,
            String reportEntityName,
            UUID userId,
            String userEmail,
            String reason,
            String note,
            String status,
            String resolvedByEmail,
            Instant resolvedAt,
            Instant createdAt
    ) {}

    public record ReportFlagResolveRequest(
            String status, // resolved | dismissed
            String resolutionNote
    ) {}

    public record PillarDTO(
            UUID id,
            Short pillarNo,
            String pillarName,
            Short score,
            String status,
            String confidence,
            String findings,
            Integer latencyMs
    ) {}

    public record JobSummary(
            UUID id,
            String status,
            Short currentPillar,
            Integer attemptCount,
            String errorMessage,
            Instant startedAt,
            Instant completedAt,
            Instant updatedAt
    ) {}

    public record AuditLogEntry(
            UUID id,
            String actorEmail,
            String action,
            String targetType,
            UUID targetId,
            String ipAddress,
            Instant createdAt
    ) {}

    public record AlertEntry(
            UUID id,
            String alertType,
            String severity,
            String message,
            Boolean isResolved,
            Instant createdAt,
            Instant resolvedAt
    ) {}

    public record PlanDTO(
            Integer id,
            String name,
            String billingCycle,
            BigDecimal priceUsd,
            BigDecimal priceVnd,
            Integer monthlyQuota,
            String features,
            Boolean isActive
    ) {}

    public record PlanUpdateRequest(
            Integer monthlyQuota,
            BigDecimal priceVnd,
            BigDecimal priceUsd,
            String features,
            Boolean isActive
    ) {}

    public record PaymentSettingsDTO(
            BigDecimal pricePerCreditVnd,
            Instant updatedAt
    ) {}

    public record PaymentSettingsUpdateRequest(
            BigDecimal pricePerCreditVnd
    ) {}
}

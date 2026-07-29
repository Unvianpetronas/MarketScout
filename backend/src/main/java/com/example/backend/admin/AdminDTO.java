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
            long openAlerts,
            List<MonthlyCount> reportsOverTime,
            List<CountryCount> reportsByCountry
    ) {}

    public record TopCompany(String name, Long count) {}

    public record MonthlyCount(String label, long count) {}

    public record CountryCount(String code, long count) {}

    // ── Revenue analytics (real collected money) ──
    public record RevenueAnalytics(
            BigDecimal revenueThisMonth,
            BigDecimal revenueLastMonth,
            BigDecimal revenueThisYear,
            BigDecimal revenueAllTime,
            BigDecimal pendingFailedAmount,
            long completedCountThisMonth,
            long failedCountThisMonth,
            long pendingCountThisMonth,
            long payingUsers,
            long totalUsers,
            List<MonthlyRevenue> revenueOverTime,
            List<NamedAmount> revenueByPlan,
            List<NamedAmount> revenueByProvider,
            List<TopPayer> topPayers,
            List<RecentTx> recentTransactions
    ) {}

    public record MonthlyRevenue(String label, BigDecimal amount) {}

    public record NamedAmount(String name, BigDecimal amount) {}

    public record TopPayer(String name, String email, BigDecimal amount, String plan) {}

    // ── System evaluation (quality of the AI verification) ──
    public record EvaluationAnalytics(
            long totalReports,
            long overriddenCount,
            long flaggedTotal,
            long flagsOpen,
            long flagsResolved,
            long flagsDismissed,
            long sanctionsFalsePositive,
            double accuracyPct,
            double overrideRatePct,
            double flagRatePct,
            Double avgStars,
            long ratingCount,
            List<Bucket> starDistribution,
            List<Bucket> confidenceDistribution,
            List<Bucket> flagsByReason,
            List<RatingEntry> recentRatings,
            SusSummary sus
    ) {}

    public record Bucket(String label, long count) {}

    public record RatingEntry(Short stars, String comment, String reportEntity, String userEmail, Instant createdAt) {}

    /**
     * System Usability Scale results — usability of the product, kept separate
     * from {@code avgStars} (which rates individual report correctness) so the
     * two are never read as one satisfaction number.
     *
     * {@code avgScore} is null until someone responds; the UI must render that
     * as "chưa có dữ liệu" rather than 0, which would read as a terrible score.
     */
    public record SusSummary(
            Double avgScore,
            long responseCount,
            long dismissedCount,
            double benchmark,
            List<SusItem> itemAverages,
            List<SusEntry> recentResponses
    ) {}

    /**
     * @param avgAnswer       raw 1–5 mean, as answered
     * @param contributionPct that item normalised to 0–100 where higher is
     *                        always better — even-numbered SUS items are worded
     *                        negatively, so raw means are not comparable across
     *                        items without this
     */
    public record SusItem(int item, double avgAnswer, double contributionPct) {}

    /**
     * @param answers the respondent's ten raw 1–5 answers in question order, so
     *                an admin can read an individual response rather than only
     *                the aggregate. Empty for a dismissal.
     */
    public record SusEntry(Double score, List<Short> answers, String comment,
                           String userEmail, Instant createdAt) {}

    public record RecentTx(String customer, String email, String plan,
                           BigDecimal amount, String provider, String status, Instant date) {}

    /** One page of the full transaction history behind "Xem tất cả". */
    public record TransactionPage(List<RecentTx> items, long total) {}

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

package com.example.backend.admin;

import com.example.backend.domain.PaymentTransaction;
import com.example.backend.domain.PlanPurchase;
import com.example.backend.domain.PlanPurchaseRepository;
import com.example.backend.domain.QuotaTopup;
import com.example.backend.domain.QuotaTopupRepository;
import com.example.backend.domain.PaymentTransactionRepository;
import com.example.backend.domain.UsersRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.YearMonth;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Revenue analytics for the admin panel. Kept separate from {@link AdminController}
 * so its unit tests' hand-built constructor stays stable. Every figure here is
 * REAL collected money — completed {@code PaymentTransaction}s — not a modelled
 * recurring metric, because MarketScout billing is one-time top-up + manual renewal.
 */
@RestController
@RequestMapping("/api/v1/admin/analytics")
@RequiredArgsConstructor
public class AdminRevenueController {

    /** Bucket name for credits bought outside a plan. */
    static final String REVENUE_LABEL_TOPUP = "Nạp quota lẻ";

    private final PaymentTransactionRepository txRepository;
    private final UsersRepository usersRepository;
    private final PlanPurchaseRepository planPurchaseRepository;
    private final QuotaTopupRepository quotaTopupRepository;

    @GetMapping("/revenue")
    @Transactional(readOnly = true)
    public ResponseEntity<AdminDTO.RevenueAnalytics> getRevenue() {
        ZoneOffset utc = ZoneOffset.UTC;
        Instant now = Instant.now();
        YearMonth curMonth = YearMonth.now(utc);
        Instant thisMonthStart = curMonth.atDay(1).atStartOfDay(utc).toInstant();
        Instant nextMonthStart = curMonth.plusMonths(1).atDay(1).atStartOfDay(utc).toInstant();
        Instant lastMonthStart = curMonth.minusMonths(1).atDay(1).atStartOfDay(utc).toInstant();
        Instant yearStart = YearMonth.of(curMonth.getYear(), 1).atDay(1).atStartOfDay(utc).toInstant();

        BigDecimal revenueThisMonth = txRepository.sumCompletedBetween(thisMonthStart, nextMonthStart);
        BigDecimal revenueLastMonth = txRepository.sumCompletedBetween(lastMonthStart, thisMonthStart);
        BigDecimal revenueThisYear  = txRepository.sumCompletedBetween(yearStart, nextMonthStart);
        BigDecimal revenueAllTime   = txRepository.sumCompletedAll();
        BigDecimal pendingFailed    = txRepository.sumPendingFailed();

        Map<String, Long> statusCounts = txRepository.countByStatusBetween(thisMonthStart, nextMonthStart).stream()
                .collect(Collectors.toMap(r -> (String) r[0], r -> (Long) r[1]));

        long completedCount = statusCounts.getOrDefault("completed", 0L);
        long failedCount    = statusCounts.getOrDefault("failed", 0L);
        long pendingCount   = statusCounts.getOrDefault("pending", 0L);

        long payingUsers = txRepository.countDistinctPayingUsers();
        long totalUsers  = usersRepository.count();

        // Revenue for the last 6 calendar months (oldest → newest).
        List<AdminDTO.MonthlyRevenue> revenueOverTime = new ArrayList<>();
        for (int i = 5; i >= 0; i--) {
            YearMonth ym = curMonth.minusMonths(i);
            Instant s = ym.atDay(1).atStartOfDay(utc).toInstant();
            Instant e = ym.plusMonths(1).atDay(1).atStartOfDay(utc).toInstant();
            revenueOverTime.add(new AdminDTO.MonthlyRevenue("T" + ym.getMonthValue(), txRepository.sumCompletedBetween(s, e)));
        }

        // Split by what the money was actually spent on: each plan that was
        // bought, then standalone quota credits. Previously this grouped by the
        // payer's CURRENT plan, so a top-up showed up as plan revenue and an
        // upgrade retroactively moved a customer's whole payment history onto
        // the new plan.
        List<AdminDTO.NamedAmount> revenueByPlan = new ArrayList<>(
                planPurchaseRepository.sumCompletedRevenueByPurchasedPlan().stream()
                        .map(r -> new AdminDTO.NamedAmount(
                                r[0] != null ? (String) r[0] : "Gói không xác định",
                                (BigDecimal) r[1]))
                        .toList());

        BigDecimal topupRevenue = zeroIfNull(quotaTopupRepository.sumCompletedTopupRevenue());
        if (topupRevenue.signum() > 0) {
            revenueByPlan.add(new AdminDTO.NamedAmount(REVENUE_LABEL_TOPUP, topupRevenue));
        }

        // Anything collected that is linked to neither a plan purchase nor a
        // top-up (older rows predating those tables). Kept visible so the
        // breakdown always adds up to the headline total instead of quietly
        // under-reporting.
        BigDecimal attributed = revenueByPlan.stream()
                .map(AdminDTO.NamedAmount::amount).reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal unattributed = zeroIfNull(revenueAllTime).subtract(attributed);
        if (unattributed.signum() > 0) {
            revenueByPlan.add(new AdminDTO.NamedAmount("Khác", unattributed));
        }

        List<AdminDTO.NamedAmount> revenueByProvider = txRepository.sumCompletedByProvider().stream()
                .map(r -> new AdminDTO.NamedAmount((String) r[0], (BigDecimal) r[1]))
                .toList();

        List<AdminDTO.TopPayer> topPayers = txRepository.topPayingCustomers(PageRequest.of(0, 5)).stream()
                .map(r -> new AdminDTO.TopPayer(
                        displayName((String) r[0], (String) r[1]), (String) r[1],
                        (BigDecimal) r[2], r[3] != null ? (String) r[3] : "Free"))
                .toList();

        List<PaymentTransaction> recent = txRepository.findRecentWithUser(PageRequest.of(0, 8));
        Map<UUID, String> boughtLabels = boughtLabelsFor(recent);
        List<AdminDTO.RecentTx> recentTransactions = recent.stream()
                .map(t -> toRecentTx(t, boughtLabels))
                .toList();

        return ResponseEntity.ok(new AdminDTO.RevenueAnalytics(
                revenueThisMonth, revenueLastMonth, revenueThisYear, revenueAllTime, pendingFailed,
                completedCount, failedCount, pendingCount, payingUsers, totalUsers,
                revenueOverTime, revenueByPlan, revenueByProvider, topPayers, recentTransactions));
    }

    /**
     * What each transaction actually paid for, keyed by transaction id. Looked
     * up in two batch queries rather than per row, so listing N transactions
     * stays at a fixed number of queries.
     */
    private Map<UUID, String> boughtLabelsFor(List<PaymentTransaction> transactions) {
        if (transactions.isEmpty()) return Map.of();
        List<UUID> ids = transactions.stream().map(PaymentTransaction::getId).toList();
        Map<UUID, String> labels = new HashMap<>();
        for (PlanPurchase pp : planPurchaseRepository.findByTransaction_IdIn(ids)) {
            if (pp.getTransaction() != null && pp.getPlan() != null) {
                labels.put(pp.getTransaction().getId(), pp.getPlan().getName());
            }
        }
        for (QuotaTopup qt : quotaTopupRepository.findByTransaction_IdIn(ids)) {
            if (qt.getTransaction() != null) {
                labels.put(qt.getTransaction().getId(), REVENUE_LABEL_TOPUP);
            }
        }
        return labels;
    }

    private AdminDTO.RecentTx toRecentTx(PaymentTransaction t, Map<UUID, String> boughtLabels) {
        var user = t.getInvoice().getUser();
        // What this payment bought — NOT the customer's current plan, which
        // would label a quota top-up with whatever plan they happen to be on.
        String bought = boughtLabels.getOrDefault(t.getId(), "Khác");
        Instant date = t.getCompletedAt() != null ? t.getCompletedAt() : t.getInitiatedAt();
        return new AdminDTO.RecentTx(
                displayName(user.getFullName(), user.getEmail()), user.getEmail(), bought,
                t.getAmountVnd(), t.getProvider(), t.getStatus(), date);
    }

    private static BigDecimal zeroIfNull(BigDecimal v) {
        return v != null ? v : BigDecimal.ZERO;
    }

    private static String displayName(String fullName, String email) {
        if (fullName != null && !fullName.isBlank()) return fullName;
        return email != null ? email.split("@")[0] : "—";
    }
}

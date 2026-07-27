package com.example.backend.admin;

import com.example.backend.domain.PaymentTransaction;
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
import java.util.List;
import java.util.Map;
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

    private final PaymentTransactionRepository txRepository;
    private final UsersRepository usersRepository;

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

        List<AdminDTO.NamedAmount> revenueByPlan = txRepository.sumCompletedByPlan().stream()
                .map(r -> new AdminDTO.NamedAmount(r[0] != null ? (String) r[0] : "Khác", (BigDecimal) r[1]))
                .toList();

        List<AdminDTO.NamedAmount> revenueByProvider = txRepository.sumCompletedByProvider().stream()
                .map(r -> new AdminDTO.NamedAmount((String) r[0], (BigDecimal) r[1]))
                .toList();

        List<AdminDTO.TopPayer> topPayers = txRepository.topPayingCustomers(PageRequest.of(0, 5)).stream()
                .map(r -> new AdminDTO.TopPayer(
                        displayName((String) r[0], (String) r[1]), (String) r[1],
                        (BigDecimal) r[2], r[3] != null ? (String) r[3] : "Free"))
                .toList();

        List<AdminDTO.RecentTx> recentTransactions = txRepository.findRecentWithUser(PageRequest.of(0, 8)).stream()
                .map(this::toRecentTx).toList();

        return ResponseEntity.ok(new AdminDTO.RevenueAnalytics(
                revenueThisMonth, revenueLastMonth, revenueThisYear, revenueAllTime, pendingFailed,
                completedCount, failedCount, pendingCount, payingUsers, totalUsers,
                revenueOverTime, revenueByPlan, revenueByProvider, topPayers, recentTransactions));
    }

    private AdminDTO.RecentTx toRecentTx(PaymentTransaction t) {
        var user = t.getInvoice().getUser();
        String plan = user.getPlan() != null ? user.getPlan().getName() : "Free";
        Instant date = t.getCompletedAt() != null ? t.getCompletedAt() : t.getInitiatedAt();
        return new AdminDTO.RecentTx(
                displayName(user.getFullName(), user.getEmail()), user.getEmail(), plan,
                t.getAmountVnd(), t.getProvider(), t.getStatus(), date);
    }

    private static String displayName(String fullName, String email) {
        if (fullName != null && !fullName.isBlank()) return fullName;
        return email != null ? email.split("@")[0] : "—";
    }
}

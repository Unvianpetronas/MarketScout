package com.example.backend.domain;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface PlanPurchaseRepository extends JpaRepository<PlanPurchase, UUID> {
    Optional<PlanPurchase> findByTransaction_Id(UUID transactionId);

    /**
     * Collected money grouped by the plan that was actually bought.
     *
     * <p>Rooted at PlanPurchase on purpose. Grouping instead by the payer's
     * current plan (users.plan) reports every past payment under whatever plan
     * that customer happens to be on today, so an upgrade silently rewrites
     * historical revenue and quota top-ups get counted as plan revenue.
     */
    @Query("SELECT pp.plan.name, COALESCE(SUM(t.amountVnd), 0) "
            + "FROM PlanPurchase pp JOIN pp.transaction t "
            + "WHERE t.status = 'completed' "
            + "GROUP BY pp.plan.name ORDER BY SUM(t.amountVnd) DESC")
    List<Object[]> sumCompletedRevenueByPurchasedPlan();

    List<PlanPurchase> findByTransaction_IdIn(Collection<UUID> transactionIds);
}

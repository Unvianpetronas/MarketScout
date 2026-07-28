package com.example.backend.domain;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.math.BigDecimal;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface QuotaTopupRepository extends JpaRepository<QuotaTopup, UUID> {
    Optional<QuotaTopup> findByTransaction_Id(UUID transactionId);

    /** Collected money from standalone quota top-ups, i.e. credits bought outside a plan. */
    @Query("SELECT COALESCE(SUM(t.amountVnd), 0) "
            + "FROM QuotaTopup qt JOIN qt.transaction t "
            + "WHERE t.status = 'completed'")
    BigDecimal sumCompletedTopupRevenue();

    List<QuotaTopup> findByTransaction_IdIn(Collection<UUID> transactionIds);
}

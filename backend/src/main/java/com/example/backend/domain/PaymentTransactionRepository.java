package com.example.backend.domain;

import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface PaymentTransactionRepository extends JpaRepository<PaymentTransaction, UUID> {
    Optional<PaymentTransaction> findByInvoice_Id(UUID invoiceId);

    // ── Revenue analytics (real collected money = completed transactions) ──

    @Query("SELECT COALESCE(SUM(t.amountVnd), 0) FROM PaymentTransaction t " +
           "WHERE t.status = 'completed' AND t.completedAt >= :start AND t.completedAt < :end")
    BigDecimal sumCompletedBetween(@Param("start") Instant start, @Param("end") Instant end);

    @Query("SELECT COALESCE(SUM(t.amountVnd), 0) FROM PaymentTransaction t WHERE t.status = 'completed'")
    BigDecimal sumCompletedAll();

    @Query("SELECT COALESCE(SUM(t.amountVnd), 0) FROM PaymentTransaction t WHERE t.status IN ('pending', 'failed')")
    BigDecimal sumPendingFailed();

    @Query("SELECT t.provider, COALESCE(SUM(t.amountVnd), 0) FROM PaymentTransaction t " +
           "WHERE t.status = 'completed' GROUP BY t.provider ORDER BY SUM(t.amountVnd) DESC")
    List<Object[]> sumCompletedByProvider();

    @Query("SELECT p.name, COALESCE(SUM(t.amountVnd), 0) FROM PaymentTransaction t " +
           "JOIN t.invoice i JOIN i.user u LEFT JOIN u.plan p " +
           "WHERE t.status = 'completed' GROUP BY p.name ORDER BY SUM(t.amountVnd) DESC")
    List<Object[]> sumCompletedByPlan();

    // Rows: [fullName, email, sumAmount, planName]
    @Query("SELECT u.fullName, u.email, COALESCE(SUM(t.amountVnd), 0), p.name FROM PaymentTransaction t " +
           "JOIN t.invoice i JOIN i.user u LEFT JOIN u.plan p " +
           "WHERE t.status = 'completed' GROUP BY u.id, u.fullName, u.email, p.name " +
           "ORDER BY COALESCE(SUM(t.amountVnd), 0) DESC")
    List<Object[]> topPayingCustomers(Pageable pageable);

    @Query("SELECT t.status, COUNT(t) FROM PaymentTransaction t " +
           "WHERE t.initiatedAt >= :start AND t.initiatedAt < :end GROUP BY t.status")
    List<Object[]> countByStatusBetween(@Param("start") Instant start, @Param("end") Instant end);

    @Query("SELECT COUNT(DISTINCT i.user.id) FROM PaymentTransaction t JOIN t.invoice i WHERE t.status = 'completed'")
    long countDistinctPayingUsers();

    // Recent transactions with customer eagerly fetched for DTO mapping.
    @Query("SELECT t FROM PaymentTransaction t JOIN FETCH t.invoice i JOIN FETCH i.user ORDER BY t.initiatedAt DESC")
    List<PaymentTransaction> findRecentWithUser(Pageable pageable);
}

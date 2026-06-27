package com.example.backend.domain;

import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface VietqrPaymentRepository extends JpaRepository<VietqrPayment, UUID> {

    boolean existsByTransferContent(String transferContent);

    Optional<VietqrPayment> findByInvoice_Id(UUID invoiceId);

    /**
     * Webhook confirmation path. Locks the matching row so concurrent SePay
     * webhook retries serialize and cannot credit quota twice for the same
     * transfer code.
     */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT v FROM VietqrPayment v WHERE v.transferContent = :code")
    Optional<VietqrPayment> findByTransferContentForUpdate(@Param("code") String code);

    @Query("SELECT v FROM VietqrPayment v WHERE v.status = :status AND v.expiresAt < :now")
    List<VietqrPayment> findExpired(@Param("status") String status, @Param("now") Instant now);
}

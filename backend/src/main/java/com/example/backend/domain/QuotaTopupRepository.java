package com.example.backend.domain;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface QuotaTopupRepository extends JpaRepository<QuotaTopup, UUID> {
    Optional<QuotaTopup> findByTransaction_Id(UUID transactionId);
}

package com.example.backend.domain;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface PlanPurchaseRepository extends JpaRepository<PlanPurchase, UUID> {
    Optional<PlanPurchase> findByTransaction_Id(UUID transactionId);
}

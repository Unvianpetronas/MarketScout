package com.example.backend.domain;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface BillingEventRepository extends JpaRepository<BillingEvent, UUID> {
}

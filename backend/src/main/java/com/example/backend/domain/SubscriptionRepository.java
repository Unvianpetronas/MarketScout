package com.example.backend.domain;

import com.example.backend.domain.Subscription;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public interface SubscriptionRepository extends JpaRepository<Subscription, UUID> {

    List<Subscription> findByUser_IdAndStatus(UUID userId, String status);

    List<Subscription> findByStatusAndCurrentPeriodEndBetween(String status, Instant start, Instant end);

    List<Subscription> findByStatusAndCurrentPeriodEndBefore(String status, Instant cutoff);
}

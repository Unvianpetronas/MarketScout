package com.example.backend.domain;

import com.example.backend.domain.Subscription;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface SubscriptionRepository extends JpaRepository<Subscription, UUID> {

    List<Subscription> findByUser_IdAndStatus(UUID userId, String status);
}

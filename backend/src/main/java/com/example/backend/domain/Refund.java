package com.example.backend.domain;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.ColumnDefault;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Getter
@Setter
@Entity
@Table(name = "refunds")
public class Refund {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", nullable = false)
    private UUID id;

    @NotNull
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "transaction_id", nullable = false)
    private PaymentTransaction transaction;

    @NotNull
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "requested_by", nullable = false)
    private Users requestedBy;

    @NotNull
    @Column(name = "amount_vnd", nullable = false, precision = 18)
    private BigDecimal amountVnd;

    @Size(max = 500)
    @NotNull
    @Column(name = "reason", nullable = false, length = 500)
    private String reason;

    @Size(max = 20)
    @NotNull
    @ColumnDefault("'pending'")
    @Column(name = "status", nullable = false, length = 20)
    private String status;

    @Size(max = 255)
    @Column(name = "provider_ref")
    private String providerRef;

    @NotNull
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "completed_at")
    private Instant completedAt;

    @PrePersist
    protected void onCreate() {
        if (createdAt == null) createdAt = Instant.now();
    }
}
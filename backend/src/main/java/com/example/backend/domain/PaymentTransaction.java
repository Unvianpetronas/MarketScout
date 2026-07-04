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
@Table(name = "payment_transactions")
public class PaymentTransaction {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", nullable = false)
    private UUID id;

    @NotNull
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "invoice_id", nullable = false)
    private Invoice invoice;

    @Size(max = 20)
    @NotNull
    @Column(name = "provider", nullable = false, length = 20)
    private String provider;

    @Size(max = 255)
    @Column(name = "provider_ref")
    private String providerRef;

    @Size(max = 20)
    @NotNull
    @ColumnDefault("'pending'")
    @Column(name = "status", nullable = false, length = 20)
    private String status;

    @NotNull
    @Column(name = "amount_vnd", nullable = false, precision = 18)
    private BigDecimal amountVnd;

    @Column(name = "provider_response", columnDefinition = "text")
    private String providerResponse;

    @Size(max = 255)
    @Column(name = "failure_reason")
    private String failureReason;

    @NotNull
    @ColumnDefault("0")
    @Column(name = "retry_count", nullable = false)
    private Integer retryCount;

    @NotNull
    @Column(name = "initiated_at", nullable = false, updatable = false)
    private Instant initiatedAt;

    @Column(name = "completed_at")
    private Instant completedAt;

    @PrePersist
    protected void onCreate() {
        if (initiatedAt == null) initiatedAt = Instant.now();
    }
}
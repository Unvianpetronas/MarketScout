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
@Table(name = "quota_topups")
public class QuotaTopup {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", nullable = false)
    private UUID id;

    @NotNull
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private Users user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "transaction_id")
    private PaymentTransaction transaction;

    @NotNull
    @Column(name = "quota_added", nullable = false)
    private Integer quotaAdded;

    @NotNull
    @Column(name = "price_vnd", nullable = false, precision = 18)
    private BigDecimal priceVnd;

    @Size(max = 20)
    @NotNull
    @ColumnDefault("'pending'")
    @Column(name = "status", nullable = false, length = 20)
    private String status;

    @NotNull
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @PrePersist
    protected void onCreate() {
        if (createdAt == null) createdAt = Instant.now();
    }
}
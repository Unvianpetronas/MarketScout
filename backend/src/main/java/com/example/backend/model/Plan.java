package com.example.backend.model;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.*;
import org.hibernate.annotations.ColumnDefault;
import org.hibernate.annotations.Nationalized;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Getter @Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "plans")
public class Plan {
    @NotNull
    @ColumnDefault("getutcdate()")
    @Column(name = "created_at", nullable = false)
    private Instant createdAt;
    @NotNull
    @ColumnDefault("1")
    @Column(name = "is_active", nullable = false)
    private Boolean isActive;
    @Column(name = "features", columnDefinition = "text")
    private String features;
    @Size(max = 20)
    @NotNull
    @Nationalized
    @ColumnDefault("'monthly'")
    @Column(name = "billing_cycle", nullable = false, length = 20)
    private String billingCycle;
    @Column(name = "price_usd", precision = 18, scale = 2)
    private BigDecimal priceUsd;
    @Column(name = "price_vnd", precision = 18)
    private BigDecimal priceVnd;
    @NotNull
    @Column(name = "monthly_quota", nullable = false)
    private Integer monthlyQuota;
    @Size(max = 50)
    @NotNull
    @Nationalized
    @Column(name = "name", nullable = false, length = 50)
    private String name;
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id", nullable = false)
    private Integer id;


}
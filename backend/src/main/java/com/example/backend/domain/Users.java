package com.example.backend.domain;


import jakarta.persistence.*;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.ColumnDefault;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "users")
@Data @NoArgsConstructor
@AllArgsConstructor
@Builder
public class Users {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", nullable = false)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "plan_id")
    private Plan plan;

    @Size(max = 255)
    @NotNull
    @Column(name = "email", nullable = false)
    private String email;

    @Size(max = 255)
    @NotNull
    @Column(name = "password_hash", nullable = false)
    private String passwordHash;

    @Size(max = 200)
    @Column(name = "full_name", length = 200)
    private String fullName;

    @NotNull
    @ColumnDefault("0")
    @Column(name = "quota_remaining", nullable = false)
    private Integer quotaRemaining;

    @NotNull
    @ColumnDefault("0")
    @Column(name = "quota_used_this_cycle", nullable = false)
    private Integer quotaUsedThisCycle;

    @Column(name = "cycle_reset_at")
    private Instant cycleResetAt;

    @NotNull
    @ColumnDefault("true")
    @Column(name = "is_active", nullable = false)
    private Boolean isActive;

    @Column(name = "last_login_at")
    private Instant lastLoginAt;

    @NotNull
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at")
    private Instant updatedAt;

    @Column(name = "deleted_at")
    private Instant deletedAt;

    @Size(max = 20)
    @NotNull
    @ColumnDefault("'user'")
    @Column(name = "role", nullable = false, length = 20)
    private String role;

    @Size(max = 50)
    @Column(name = "tax_id", length = 50)
    private String taxId;

    @Size(max = 30)
    @Column(name = "phone", length = 30)
    private String phone;

    @Size(max = 300)
    @Column(name = "company_website", length = 300)
    private String companyWebsite;

    @Size(max = 500)
    @Column(name = "headquarters_addr", length = 500)
    private String headquartersAddr;

    @Size(max = 100)
    @Column(name = "industry", length = 100)
    private String industry;

    @Size(max = 50)
    @Column(name = "annual_revenue", length = 50)
    private String annualRevenue;

    @Column(name = "business_desc", columnDefinition = "text")
    private String businessDesc;

    @Column(name = "target_markets", columnDefinition = "text")
    private String targetMarkets;

    @Column(name = "certifications", columnDefinition = "text")
    private String certifications;

    @Size(max = 10)
    @NotNull
    @ColumnDefault("'system'")
    @Column(name = "theme", nullable = false, length = 10)
    private String theme;

    @Size(max = 2)
    @NotNull
    @ColumnDefault("'vi'")
    @Column(name = "language", nullable = false, length = 2)
    private String language;
    
    @NotNull
    @ColumnDefault("true")
    @Column(name = "ai_optimization", nullable = false)
    private Boolean aiOptimization;

    @Size(max = 300)
    @Column(name = "company_name", length = 300)
    private String companyName;

    @NotNull
    @ColumnDefault("false")
    @Column(name = "email_verified", nullable = false)
    private Boolean emailVerified;

    // ── Deferred plan change (2026-07-20) — SePay can't auto-charge, so an
    // upgrade or downgrade requested mid-cycle is recorded here and only
    // takes effect (with a fresh checkout) when the current cycle ends; the
    // active plan/quota above are untouched until then. ──
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "pending_plan_id")
    private Plan pendingPlan;

    @Column(name = "pending_plan_requested_at")
    private Instant pendingPlanRequestedAt;

    @PrePersist
    protected void onCreate() {
        if (createdAt == null) createdAt = Instant.now();
        updatedAt = Instant.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = Instant.now();
    }
}

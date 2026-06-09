package com.example.backend.domain;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.*;
import org.hibernate.annotations.ColumnDefault;
import org.hibernate.annotations.Nationalized;

import java.time.Instant;
import java.util.UUID;


@Getter
@Setter
@Entity
@Table(name = "subscriptions")
@Data @NoArgsConstructor @AllArgsConstructor @Builder
public class Subscription {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", nullable = false, columnDefinition = "UNIQUEIDENTIFIER")
    private UUID id;

    @NotNull
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private Users user;

    @NotNull
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "plan_id", nullable = false)
    private Plan plan;

    @Size(max = 20)
    @NotNull
    @Nationalized
    @ColumnDefault("'trialing'")
    @Column(name = "status", nullable = false, length = 20)
    private String status;

    @Size(max = 20)
    @NotNull
    @Nationalized
    @ColumnDefault("'monthly'")
    @Column(name = "billing_cycle", nullable = false, length = 20)
    private String billingCycle;

    @NotNull
    @ColumnDefault("getutcdate()")
    @Column(name = "current_period_start", nullable = false)
    private Instant currentPeriodStart;

    @NotNull
    @Column(name = "current_period_end", nullable = false)
    private Instant currentPeriodEnd;

    @Column(name = "trial_end")
    private Instant trialEnd;

    @Column(name = "cancel_at")
    private Instant cancelAt;

    @NotNull
    @ColumnDefault("getutcdate()")
    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "updated_at")
    private Instant updatedAt;


}
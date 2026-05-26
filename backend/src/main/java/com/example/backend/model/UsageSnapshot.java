package com.example.backend.model;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.ColumnDefault;
import org.hibernate.annotations.Nationalized;

import java.time.Instant;
import java.util.UUID;

@Getter
@Setter
@Entity
@Table(name = "usage_snapshots")
public class UsageSnapshot {
    @Id
    @ColumnDefault("newid()")
    @Column(name = "id", nullable = false)
    private UUID id;

    @NotNull
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private Users user;

    @Size(max = 10)
    @NotNull
    @Nationalized
    @Column(name = "period_type", nullable = false, length = 10)
    private String periodType;

    @NotNull
    @Column(name = "period_start", nullable = false)
    private Instant periodStart;

    @NotNull
    @Column(name = "period_end", nullable = false)
    private Instant periodEnd;

    @NotNull
    @ColumnDefault("0")
    @Column(name = "reports_generated", nullable = false)
    private Integer reportsGenerated;

    @NotNull
    @ColumnDefault("0")
    @Column(name = "quota_consumed", nullable = false)
    private Integer quotaConsumed;

    @NotNull
    @ColumnDefault("0")
    @Column(name = "api_calls", nullable = false)
    private Integer apiCalls;

    @NotNull
    @ColumnDefault("getutcdate()")
    @Column(name = "created_at", nullable = false)
    private Instant createdAt;


}
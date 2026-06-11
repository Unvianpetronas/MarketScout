package com.example.backend.domain;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.ColumnDefault;

import java.time.Instant;
import java.util.UUID;

@Getter
@Setter
@Entity
@Table(name = "scoring_configs")
public class ScoringConfig {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", nullable = false)
    private UUID id;

    @NotNull
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "plan_id", nullable = false)
    private Plan plan;

    @Size(max = 20)
    @NotNull
    @ColumnDefault("'v1.0'")
    @Column(name = "config_version", nullable = false, length = 20)
    private String configVersion;

    @NotNull
    @Column(name = "pillar_weights", nullable = false, columnDefinition = "text")
    private String pillarWeights;

    @NotNull
    @Column(name = "thresholds", nullable = false, columnDefinition = "text")
    private String thresholds;

    @NotNull
    @ColumnDefault("true")
    @Column(name = "is_active", nullable = false)
    private Boolean isActive;

    @NotNull
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @PrePersist
    protected void onCreate() {
        if (createdAt == null) createdAt = Instant.now();
    }
}
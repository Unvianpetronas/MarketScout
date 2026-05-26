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
@Table(name = "scoring_configs")
public class ScoringConfig {
    @Id
    @ColumnDefault("newid()")
    @Column(name = "id", nullable = false)
    private UUID id;

    @NotNull
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "plan_id", nullable = false)
    private Plan plan;

    @Size(max = 20)
    @NotNull
    @Nationalized
    @ColumnDefault("'v1.0'")
    @Column(name = "config_version", nullable = false, length = 20)
    private String configVersion;

    @NotNull
    @Nationalized
    @Lob
    @Column(name = "pillar_weights", nullable = false)
    private String pillarWeights;

    @NotNull
    @Nationalized
    @Lob
    @Column(name = "thresholds", nullable = false)
    private String thresholds;

    @NotNull
    @ColumnDefault("1")
    @Column(name = "is_active", nullable = false)
    private Boolean isActive;

    @NotNull
    @ColumnDefault("getutcdate()")
    @Column(name = "created_at", nullable = false)
    private Instant createdAt;


}
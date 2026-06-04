package com.example.backend.model;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.ColumnDefault;
import org.hibernate.annotations.Nationalized;

import java.util.UUID;

@Getter
@Setter
@Entity
@Table(name = "pillar_results")
public class PillarResult {
    @Id
    @ColumnDefault("newid()")
    @Column(name = "id", nullable = false)
    private UUID id;

    @NotNull
    @Column(name = "pillar_no", nullable = false)
    private Short pillarNo;

    @Column(name = "score")
    private Short score;

    @Column(name = "findings", columnDefinition = "text")
    private String findings;

    @Column(name = "sources_used", columnDefinition = "text")
    private String sourcesUsed;

    @Column(name = "latency_ms")
    private Integer latencyMs;


}
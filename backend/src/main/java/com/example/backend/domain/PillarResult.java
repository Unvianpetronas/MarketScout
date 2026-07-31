package com.example.backend.domain;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.util.UUID;

@Getter
@Setter
@Entity
@Table(name = "pillar_results")
public class PillarResult {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", nullable = false)
    private UUID id;

    @NotNull
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "report_id", nullable = false)
    private Report report;

    @NotNull
    @Column(name = "pillar_no", nullable = false)
    private Short pillarNo;

    @Column(name = "score")
    private Short score;

    /** Max points this pillar could earn given available data; null for pre-V11 rows. */
    @Column(name = "obtainable_points")
    private Short obtainablePoints;

    @Column(name = "findings", columnDefinition = "text")
    private String findings;

    @Column(name = "sources_used", columnDefinition = "text")
    private String sourcesUsed;

    @Column(name = "latency_ms")
    private Integer latencyMs;

    // v3: array of { type: PASS|WARN|FAIL, text, source } as JSONB
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "evidences", columnDefinition = "jsonb")
    private String evidences;

    // v3: PASS | WARN | FAIL | SKIP
    @Size(max = 10)
    @Column(name = "status", length = 10)
    private String status;

    // v3: HIGH | MEDIUM | LOW
    @Size(max = 10)
    @Column(name = "confidence", length = 10)
    private String confidence;

    // v3: denormalized pillar name for FE rendering
    @Size(max = 50)
    @Column(name = "pillar_name", length = 50)
    private String pillarName;
}

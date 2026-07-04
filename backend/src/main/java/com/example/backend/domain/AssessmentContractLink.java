package com.example.backend.domain;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.ColumnDefault;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.Instant;
import java.util.UUID;

/**
 * Links a {@link Contract} to a {@link Report} and records the verification
 * outcome for THAT USE ONLY — re-linking the same pair always re-runs the
 * cross-check rather than trusting a prior VERIFIED status.
 */
@Getter
@Setter
@Entity
@Table(name = "assessment_contract_links")
public class AssessmentContractLink {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", nullable = false)
    private UUID id;

    @NotNull
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "report_id", nullable = false)
    private Report report;

    @NotNull
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "contract_id", nullable = false)
    private Contract contract;

    // PENDING | VERIFIED | MISMATCH | MANUALLY_EDITED
    @Size(max = 20)
    @NotNull
    @ColumnDefault("'PENDING'")
    @Column(name = "verification_status", nullable = false, length = 20)
    private String verificationStatus = "PENDING";

    /** e.g. {"signatoryTaxIdMatch": true, "signatoryNameMatch": true, "matchedAgainst": "P1"} */
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "match_details", columnDefinition = "jsonb")
    private String matchDetails;

    /**
     * Per-field manual-edit overrides, e.g. {"depositPercent": {"editedValue": 50, "editedAt": "...", "verified": false}}.
     * Editing a field always sets verified=false for that field only — it must
     * never silently re-inherit the link's overall verification_status.
     */
    @JdbcTypeCode(SqlTypes.JSON)
    @ColumnDefault("'{}'")
    @Column(name = "field_overrides", columnDefinition = "jsonb")
    private String fieldOverrides = "{}";

    @Column(name = "verified_at")
    private Instant verifiedAt;

    @NotNull
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @PrePersist
    protected void onCreate() {
        if (createdAt == null) createdAt = Instant.now();
    }
}

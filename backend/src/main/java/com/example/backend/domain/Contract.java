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
 * A reusable contract file in a user's library. "Verified" is NOT a property
 * of this entity — it belongs to a specific {@link AssessmentContractLink}
 * (the same contract can verify against one report and mismatch another).
 */
@Getter
@Setter
@Entity
@Table(name = "contracts")
public class Contract {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", nullable = false)
    private UUID id;

    @NotNull
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private Users user;

    @Size(max = 255)
    @NotNull
    @Column(name = "file_name", nullable = false, length = 255)
    private String fileName;

    @Column(name = "file_size_bytes")
    private Long fileSizeBytes;

    /** MIME type of file_data, needed to serve it back with the right Content-Type. */
    @Size(max = 100)
    @NotNull
    @Column(name = "content_type", nullable = false, length = 100)
    private String contentType;

    /** Raw file bytes (PDF/JPG/PNG, capped at 10MB) — stored directly in Postgres, no external storage service. */
    @NotNull
    @Column(name = "file_data", nullable = false, columnDefinition = "bytea")
    private byte[] fileData;

    @NotNull
    @Column(name = "uploaded_at", nullable = false)
    private Instant uploadedAt;

    /**
     * AI-extracted fields, each as {"value":..., "confidence":0-1, "sourceText":"..."}.
     * See README_contract_verification_feature.md §2 for the schema.
     */
    @JdbcTypeCode(SqlTypes.JSON)
    @NotNull
    @ColumnDefault("'{}'")
    @Column(name = "extracted_data", nullable = false, columnDefinition = "jsonb")
    private String extractedData = "{}";

    // PENDING | PROCESSING | COMPLETED | FAILED
    @Size(max = 20)
    @NotNull
    @ColumnDefault("'PENDING'")
    @Column(name = "extraction_status", nullable = false, length = 20)
    private String extractionStatus = "PENDING";

    @NotNull
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at")
    private Instant updatedAt;

    @PrePersist
    protected void onCreate() {
        Instant now = Instant.now();
        if (createdAt == null) createdAt = now;
        if (uploadedAt == null) uploadedAt = now;
        updatedAt = now;
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = Instant.now();
    }
}

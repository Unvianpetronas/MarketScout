package com.example.backend.model;

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
@Table(name = "reports")
public class Report {
    @Id
    @ColumnDefault("gen_random_uuid()")
    @Column(name = "id", nullable = false)
    private UUID id;

    @NotNull
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private Users user;

    @Size(max = 500)
    @NotNull
    @Column(name = "entity_name", nullable = false, length = 500)
    private String entityName;

    @Size(max = 2)
    @Column(name = "country_iso2", length = 2)
    private String countryIso2;

    @Size(max = 20)
    @NotNull
    @ColumnDefault("'standard'")
    @Column(name = "tier", nullable = false, length = 20)
    private String tier;

    @Column(name = "overall_score")
    private Short overallScore;

    @NotNull
    @ColumnDefault("false")
    @Column(name = "hard_stop", nullable = false)
    private Boolean hardStop;

    @Column(name = "raw_data", columnDefinition = "text")
    private String rawData;

    // v3: status of the report pipeline
    // PENDING | QUICK_SCANNING | DEEP_SCANNING | DONE | HARD_STOP | FAILED
    @Size(max = 20)
    @NotNull
    @ColumnDefault("'PENDING'")
    @Column(name = "status", nullable = false, length = 20)
    private String status = "PENDING";

    // v3: company website (from Tavily leads or user input)
    @Size(max = 300)
    @Column(name = "website", length = 300)
    private String website;

    // v3: Vietnamese tax ID (MST)
    @Size(max = 50)
    @Column(name = "tax_id", length = 50)
    private String taxId;

    // v3: Legal Entity Identifier for international companies (GLEIF)
    @Size(max = 50)
    @Column(name = "lei", length = 50)
    private String lei;

    // v3: FIND_PARTNERS | MANUAL | COMPARE
    @Size(max = 20)
    @NotNull
    @ColumnDefault("'MANUAL'")
    @Column(name = "source", nullable = false, length = 20)
    private String source = "MANUAL";

    // v3: true when P1 + P6 quick scan is done
    @NotNull
    @ColumnDefault("false")
    @Column(name = "quick_scan_done", nullable = false)
    private Boolean quickScanDone = false;

    // v3: Thấp | Trung bình | Cao | Nghiêm trọng
    @Size(max = 20)
    @Column(name = "risk_level", length = 20)
    private String riskLevel;

    @NotNull
    @ColumnDefault("now()")
    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "updated_at")
    private Instant updatedAt;
}

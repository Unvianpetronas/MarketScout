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
@Table(name = "reports")
public class Report {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
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

    // DealSafetyAgent's structured JSON verdict ({warningLabel, recommendation,
    // requiredProtocols}) — own column so a rescan/retry always overwrites
    // cleanly instead of accumulating onto raw_data.
    @Column(name = "deal_safety_analysis", columnDefinition = "text")
    private String dealSafetyAnalysis;

    // AI next-step recommendations (JSON: summary/actionItems/infoToProvide/infoToVerify).
    // Generated ONCE right after scoring and persisted here — re-opening the report
    // reads from DB instead of calling Gemini again (stable + instant + no extra cost).
    @Column(name = "ai_recommendations", columnDefinition = "text")
    private String aiRecommendations;

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
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at")
    private Instant updatedAt;

    // ── Self-reported "Thông tin giao dịch" (P7) — reference only, never
    // read by scoring. Only a currently-VERIFIED linked contract feeds P7. ──
    @Size(max = 10)
    @Column(name = "self_report_payment_method_safety", length = 10)
    private String selfReportPaymentMethodSafety;

    @Column(name = "self_report_deposit_percentage")
    private Short selfReportDepositPercentage;

    @Column(name = "self_report_deal_value_usd")
    private java.math.BigDecimal selfReportDealValueUsd;

    @Column(name = "self_report_has_written_contract")
    private Boolean selfReportHasWrittenContract;

    /** The contract link currently authoritative for this report's P7 score, or null if unverified/unlinked. */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "p7_verified_contract_id")
    private Contract p7VerifiedContract;

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

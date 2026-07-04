package com.example.backend.contract;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.Map;
import java.util.UUID;

public class ContractDTO {

    /** One AI-extracted field, per README_contract_verification_feature.md §2. */
    @Data @NoArgsConstructor @AllArgsConstructor @Builder
    public static class ExtractedField {
        private Object value;
        private Double confidence;
        private String sourceText;
    }

    // ── Library list/detail ────────────────────────────────────────────

    @Data @NoArgsConstructor @AllArgsConstructor @Builder
    public static class ContractSummary {
        private UUID id;
        private String fileName;
        private Instant uploadedAt;
        private String extractionStatus;
        private Map<String, ExtractedField> extractedData;
    }

    @Data @NoArgsConstructor @AllArgsConstructor @Builder
    public static class ContractDetail {
        private UUID id;
        private String fileName;
        private Long fileSizeBytes;
        private Instant uploadedAt;
        private String extractionStatus;
        private Map<String, ExtractedField> extractedData;
    }

    // ── Link / cross-check ─────────────────────────────────────────────

    @Data @NoArgsConstructor @AllArgsConstructor @Builder
    public static class LinkResponse {
        private UUID contractId;
        private UUID reportId;
        private String verificationStatus; // PENDING | VERIFIED | MISMATCH | MANUALLY_EDITED
        private Map<String, Object> matchDetails;
        private Double newOverallScore;
        private Integer newP7Score;
    }

    @Data @NoArgsConstructor @AllArgsConstructor
    public static class FieldOverrideRequest {
        private String field;
        private Object value;
    }

    /** One link attempt for a report — including MISMATCH ones, for the "why is P7 N/A" UX. */
    @Data @NoArgsConstructor @AllArgsConstructor @Builder
    public static class LinkSummary {
        private UUID contractId;
        private String fileName;
        private String verificationStatus; // PENDING | VERIFIED | MISMATCH | MANUALLY_EDITED
        private Instant createdAt;
    }

    @Data @NoArgsConstructor @AllArgsConstructor
    public static class RenameRequest {
        private String fileName;
    }
}

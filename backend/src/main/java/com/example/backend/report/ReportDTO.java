package com.example.backend.report;

import com.example.backend.shared.model.scoring.Evidence;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

public class ReportDTO {

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class ReportSummary {
        private UUID id;
        private String entityName;
        private String countryIso2;
        private Short overallScore;
        private boolean hardStop;
        private String status;
        private String riskLevel;
        private String source;
        private boolean quickScanDone;
        private Instant createdAt;
        private Instant updatedAt;
    }

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class ReportDetail {
        private UUID id;
        private String entityName;
        private String countryIso2;
        private Short overallScore;
        private boolean hardStop;
        private String status;
        private String riskLevel;
        private String source;
        private boolean quickScanDone;
        private String website;
        private String taxId;
        private String lei;
        private Instant createdAt;
        private Instant updatedAt;
        private List<PillarResultDTO> pillars;
        private String dealSafetyAnalysis;

        // Self-reported "Thông tin giao dịch" — reference only, never fed to
        // scoring. Only a link-verified uploaded contract can move P7's score.
        private String selfReportPaymentMethodSafety;
        private Short selfReportDepositPercentage;
        private BigDecimal selfReportDealValueUsd;
        private Boolean selfReportHasWrittenContract;
        private UUID p7VerifiedContractId;
    }

    // ── Self-reported deal info (manual entry, always weight=0) ────────────
    @Data @NoArgsConstructor @AllArgsConstructor @Builder
    public static class SelfReportDealInfoRequest {
        private String paymentMethodSafety; // SAFE | MODERATE | RISKY
        private Short depositPercentage;
        private BigDecimal dealValueUsd;
        private Boolean hasWrittenContract;
    }

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class PillarResultDTO {
        private int pillarNo;
        private String pillarName;
        private Integer score;
        private String status;
        private String confidence;
        private String findings;
        private String sourcesUsed;
        private List<Evidence> evidences;
    }

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class ReportStatusResponse {
        private UUID id;
        private String status;
        private Short overallScore;
        private String riskLevel;
        private boolean hardStop;
    }

    // Chat pipeline message request (replaces simple content-only request)
    @Data @NoArgsConstructor @AllArgsConstructor @Builder
    public static class ChatMessageRequest {
        private String message;
        private String sessionId;
        private UUID reportId;   // nullable — null = global chatbox, set = viewing specific report

        // Self-reported "Thông tin giao dịch" from the pre-scan form (optional).
        // Written straight to Report.selfReport* columns — reference only, NEVER
        // fed into scoring (see CompanyInput's note on why).
        private Integer depositPercentage;
        private Boolean hasWrittenContract;
        private String  paymentMethodSafety; // SAFE | MODERATE | RISKY
        private Double  dealValueUsd;

        // A contract already uploaded/picked in the library (before this report even
        // exists — see ContractPickerModal on the pre-scan page). If set, it's
        // linked + cross-checked against the newly created report right before
        // scoring runs, so P7 is scored for real on the very first pass.
        private UUID contractId;
    }
}

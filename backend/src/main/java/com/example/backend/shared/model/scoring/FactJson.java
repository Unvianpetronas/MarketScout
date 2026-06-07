package com.example.backend.shared.model.scoring;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FactJson {

    @Data @NoArgsConstructor @AllArgsConstructor @Builder
    public static class P1Facts {
        private String status;             // ACTIVE | INACTIVE | UNKNOWN
        private Double ageYears;
        private Boolean hasLegalRepresentative;
        private String industryMatch;      // MATCH | PARTIAL | NO_MATCH
    }

    @Data @NoArgsConstructor @AllArgsConstructor @Builder
    public static class P2Facts {
        private Boolean hasOfficialWebsite;
        private Integer domainAgeMonths;
        private Boolean usesFreeEmail;
        private Boolean hasSsl;
        private String socialMediaScore;   // LOW | MEDIUM | HIGH
    }

    @Data @NoArgsConstructor @AllArgsConstructor @Builder
    public static class P3Facts {
        private Boolean hasTradeHistory;
        private Integer shipmentCountYear;
        private Boolean isIndustryMatched;
        private String tradeTrend;         // GROWING | STABLE | DECLINING
    }

    @Data @NoArgsConstructor @AllArgsConstructor @Builder
    public static class P4Facts {
        private String identityMatchLevel; // COMPLETELY_MATCHED | MINOR_MISMATCH | MAJOR_MISMATCH
        private Boolean addressVerified;
        private Boolean ceoVerified;
    }

    @Data @NoArgsConstructor @AllArgsConstructor @Builder
    public static class P5Facts {
        private String taxComplianceStatus; // NORMAL | PENALIZED | DISSOLVING
        private Double registeredCapitalUsd;
        private Boolean hasFinancialReport;
        private String revenueTrend;        // GROWING | STABLE | DECLINING | UNKNOWN
    }

    @Data @NoArgsConstructor @AllArgsConstructor @Builder
    public static class P6Facts {
        private Boolean isSanctionHit;
        private Boolean isPersonalAccountRequested;
        private Boolean bicVerified;
        private String accountType;         // CORPORATE | PERSONAL | UNKNOWN
    }

    @Data @NoArgsConstructor @AllArgsConstructor @Builder
    public static class P7Facts {
        private Integer depositPercentage;
        private Boolean hasWrittenContract;
        private String paymentMethodSafety; // SAFE | MODERATE | RISKY
        private Double dealValueUsd;
    }

    @Data @NoArgsConstructor @AllArgsConstructor @Builder
    public static class P8Facts {
        private Boolean hasVerifiedLocation;
        private Boolean isStockImageUsed;
        private Boolean hasPhysicalEvidence;
        private String employeeCountRange;  // MICRO | SMALL | MEDIUM | LARGE | UNKNOWN
    }

    private P1Facts p1;
    private P2Facts p2;
    private P3Facts p3;
    private P4Facts p4;
    private P5Facts p5;
    private P6Facts p6;
    private P7Facts p7;
    private P8Facts p8;
}

package com.example.backend.shared.model.scoring;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

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
        // Ground truth from P1Data, not Gemini-interpreted — lets the rubric link
        // each evidence line back to the exact registry record it came from.
        private String registrationId;     // MST (VN) or LEI (international)
        private String registrationType;   // MST_VN | LEI_INTL
    }

    @Data @NoArgsConstructor @AllArgsConstructor @Builder
    public static class P2Facts {
        private Boolean hasOfficialWebsite;
        private Integer domainAgeMonths;
        private Boolean usesFreeEmail;
        private Boolean hasSsl;
        private String socialMediaScore;   // LOW | MEDIUM | HIGH
        private List<String> facebookPages; // candidate URLs — unverified, see P2Data
        private String domain;              // ground truth from P2Data — lets the rubric link evidence to the site/RDAP record
    }

    /**
     * Trade PRESENCE, not trade history. Customs manifest data (shipment counts,
     * routes, volume trends) has no free source anywhere — the two the pipeline
     * used to scrape are gone (ecosys.vcci.com.vn no longer resolves, importyeti
     * blocks server-side clients). Everything here is an indirect signal that must
     * carry a URL the customer can open, so the report never asserts trade activity
     * it cannot show.
     */
    @Data @NoArgsConstructor @AllArgsConstructor @Builder
    public static class P3Facts {
        private String b2bProfileUrl;        // Alibaba / Made-in-China / EC21 / TradeIndia profile
        private String directoryUrl;         // industry directory or trade-fair exhibitor listing
        private Boolean websiteHasTradeContent; // import/export or HS-code content on their own site
        private Integer tradeNewsMentions;   // distinct trade-related news/press hits
        private Boolean isIndustryMatched;   // declared trade lines vs the registry's recorded industry
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
        // Which crawler actually produced this — ground truth from P5Data, not
        // Gemini-interpreted, so ScoringRubric can label the real source instead
        // of a hardcoded guess (dangkykinhdoanh | companies_house | sec_edgar | tavily).
        private String dataSource;
    }

    @Data @NoArgsConstructor @AllArgsConstructor @Builder
    public static class P6Facts {
        private Boolean isSanctionHit;
        private Boolean isPersonalAccountRequested;
        private Boolean bicVerified;
        private String accountType;         // CORPORATE | PERSONAL | UNKNOWN
        // Ground truth from P6Data — lets the rubric link a sanctions hit to its
        // OpenSanctions entity profile page for manual review.
        private String matchedEntityId;
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

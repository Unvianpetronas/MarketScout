package com.example.backend.shared.model.input;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CompanyInput {
    private String companyName;
    private String taxId;
    private String country;
    private String website;

    // ── P7 — Deal Structure Risk (optional, user-supplied) ──────────────────
    // P7 scores the structure of THIS deal, not the company. It can only be
    // computed from facts the user provides about their intended transaction.
    // When all of these are null the pillar stays N/A (SKIP) — scoring deal risk
    // with no deal data would be fabrication, so N/A is the correct outcome.
    private Integer depositPercentage;       // % paid upfront (e.g. 30)
    private Boolean hasWrittenContract;      // signed written contract in place?
    private String  paymentMethodSafety;     // SAFE | MODERATE | RISKY
    private Double  dealValueUsd;            // headline deal value in USD

    /** True when the user supplied at least one deal parameter → P7 is scorable. */
    public boolean hasDealParams() {
        return depositPercentage != null || hasWrittenContract != null
            || (paymentMethodSafety != null && !paymentMethodSafety.isBlank())
            || dealValueUsd != null;
    }

    public boolean isVietnam() {
        return "VN".equalsIgnoreCase(country);
    }

    public boolean hasTaxId() {
        return taxId != null && taxId.matches("\\d{10}(\\d{3})?");
    }

    public String getName() {
        return companyName;
    }
}

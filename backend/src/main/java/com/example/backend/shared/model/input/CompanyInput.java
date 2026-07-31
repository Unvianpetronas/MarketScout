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
    /**
     * The address exactly as the registry records it, filled in by ScoringEngine
     * once P1 has resolved the entity. P4's whole job is consistency, which needs
     * two independent statements of the same fact — without this it was geocoding
     * the company NAME and had nothing to compare the result against.
     */
    private String registryAddress;

    // NOTE: P7 (Deal Structure Risk) deliberately has NO fields here. Self-reported
    // deal info (deposit %, payment method, etc.) is never verifiable at this stage
    // and must never influence scoring — see Report.selfReport* columns, which are
    // reference-only and read by nothing but the UI. Only a contract that has been
    // uploaded, AI-extracted, and cross-checked against this company (via
    // ContractLinkService, see ContractP7Mapper) can move the real P7 score.

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

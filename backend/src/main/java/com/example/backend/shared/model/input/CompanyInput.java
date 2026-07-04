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

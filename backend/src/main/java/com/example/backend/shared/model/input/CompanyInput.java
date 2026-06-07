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

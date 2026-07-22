package com.example.backend.shared.model.agent;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class IntentResult {
    // FIND_BUYER | FIND_SELLER | VERIFY_PARTNER | COMPARE_PARTNERS | EXPLAIN_REPORT | GENERAL_QA
    private String intent;

    // For FIND_BUYER/FIND_SELLER
    private String product;
    private String market;
    private String role;

    // For VERIFY_PARTNER/COMPARE_PARTNERS
    private String companyName;
    private String country;
    private String taxId;

    // For COMPARE_PARTNERS — both company names, extracted by the LLM so
    // "so sánh giúp mình A và B" doesn't leak the command prefix into name 1
    private java.util.List<String> companyNames;

    // For EXPLAIN_REPORT — already provided in request
    // For GENERAL_QA — direct reply
    private String reply;
}

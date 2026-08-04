package com.example.backend.shared.model.crawler;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.NoArgsConstructor;
import lombok.experimental.SuperBuilder;

import java.util.List;

@Data
@EqualsAndHashCode(callSuper = true)
@SuperBuilder
@NoArgsConstructor
@AllArgsConstructor
public class P2Data extends PillarData {
    private Boolean hasOfficialWebsite;
    // Did the domain prove it belongs to this company (name in the domain, or the
    // homepage naming the company)? FALSE means a candidate was found and rejected —
    // reported as such instead of silently crediting the company with a stranger's
    // domain age and certificate. Null = nothing to check, or the check failed.
    private Boolean websiteVerified;
    private Integer domainAgeMonths;
    private Boolean usesFreeEmail;
    private Boolean hasSsl;
    private String socialMediaScore; // LOW | MEDIUM | HIGH
    private String domain;
    private String registrar;
    // Candidate Facebook page URLs found via search — NOT a verified "this is the
    // official page" (Facebook content sits behind a login wall, so search engines
    // can't confirm ownership). More than one entry means genuinely ambiguous —
    // surfaced as-is on the report rather than silently picking the first result.
    private List<String> facebookPages;
}

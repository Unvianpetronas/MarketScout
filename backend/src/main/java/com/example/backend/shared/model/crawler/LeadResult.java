package com.example.backend.shared.model.crawler;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LeadResult {
    private String companyName;
    private String website;
    private String description;
    private String source;
    // The market the search was scoped to, not an independently-verified
    // per-company location (Tavily gives no structured geo field) — see
    // TavilyClient.search().
    private String country;
    private boolean sanctionHit;
    private String sanctionNote;
    // Populated by FindPartnersService.enrichWithTaxId() from a real P1 registry
    // lookup (masothue.vn MST or GLEIF LEI) — null until/unless that lookup finds
    // the company, never guessed.
    private String taxId;
}

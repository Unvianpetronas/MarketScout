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
    private String country;
    private boolean sanctionHit;
    private String sanctionNote;
}

package com.example.backend.shared.model.crawler;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.NoArgsConstructor;
import lombok.experimental.SuperBuilder;

@Data
@EqualsAndHashCode(callSuper = true)
@SuperBuilder
@NoArgsConstructor
@AllArgsConstructor
public class P2Data extends PillarData {
    private Boolean hasOfficialWebsite;
    private Integer domainAgeMonths;
    private Boolean usesFreeEmail;
    private Boolean hasSsl;
    private String socialMediaScore; // LOW | MEDIUM | HIGH
    private String domain;
    private String registrar;
}

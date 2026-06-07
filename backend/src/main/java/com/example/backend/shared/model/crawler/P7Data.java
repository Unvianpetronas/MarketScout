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
public class P7Data extends PillarData {
    private Integer depositPercentage;
    private Boolean hasWrittenContract;
    private String paymentMethodSafety; // SAFE | MODERATE | RISKY
    private Double dealValueUsd;
    private String recommendedIncoterm;
    private String dealAnalysisSummary;
}

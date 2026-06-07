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
public class P5Data extends PillarData {
    private String taxComplianceStatus; // NORMAL | PENALIZED | DISSOLVING
    private Double registeredCapitalUsd;
    private Boolean hasFinancialReport;
    private String revenueTrend;        // GROWING | STABLE | DECLINING | UNKNOWN
}

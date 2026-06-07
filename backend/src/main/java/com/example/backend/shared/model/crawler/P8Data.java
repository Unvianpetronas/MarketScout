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
public class P8Data extends PillarData {
    private Boolean hasVerifiedLocation;
    private Boolean isStockImageUsed;
    private Boolean hasPhysicalEvidence;
    private String employeeCountRange; // MICRO | SMALL | MEDIUM | LARGE | UNKNOWN
}

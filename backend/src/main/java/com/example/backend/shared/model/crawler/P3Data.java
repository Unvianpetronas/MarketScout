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
public class P3Data extends PillarData {
    private Boolean hasTradeHistory;
    private Integer shipmentCountYear;
    private Boolean isIndustryMatched;
    private String tradeTrend; // GROWING | STABLE | DECLINING
    private String tradeCountries;
}

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
/**
 * Trade presence signals. Shipment counts and volume trends were removed with the
 * scrapers that once (nominally) supplied them — no free source publishes customs
 * manifests, so those fields could only ever be null or invented.
 */
public class P3Data extends PillarData {
    private String b2bProfileUrl;
    private String directoryUrl;
    private Boolean websiteHasTradeContent;
    private Integer tradeNewsMentions;
    private Boolean isIndustryMatched;
    private String tradeCountries;
}

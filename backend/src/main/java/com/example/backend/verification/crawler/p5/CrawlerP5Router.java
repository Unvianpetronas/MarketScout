package com.example.backend.verification.crawler.p5;

import com.example.backend.shared.model.crawler.P5Data;
import com.example.backend.shared.model.input.CompanyInput;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

/**
 * Routes P5 (Financial & Tax) to the strongest real source available for the
 * company's country, falling back to weak text-search everywhere else:
 *
 *   VN → CrawlerP5VN (dangkykinhdoanh.gov.vn structured lookup)
 *   GB → CrawlerP5UK (Companies House — real filed-accounts data, free API)
 *   US → CrawlerP5US (SEC EDGAR — real, but only covers public companies)
 *   everything else → CrawlerP5Intl (Tavily text search — weak signal; already
 *     returns SKIP instead of a fabricated result when it has nothing)
 *
 * This list is intentionally short — most countries have no free/official source
 * of private-company financial data at all (the same legal-disclosure gap as
 * Vietnam), so there is nothing better to route them to yet.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class CrawlerP5Router {

    private final CrawlerP5VN crawlerP5VN;
    private final CrawlerP5UK crawlerP5UK;
    private final CrawlerP5US crawlerP5US;
    private final CrawlerP5Intl crawlerP5Intl;

    public P5Data fetch(CompanyInput input) {
        if (input.isVietnam()) {
            return crawlerP5VN.fetch(input);
        }

        String country = input.getCountry() != null ? input.getCountry().toUpperCase() : "";
        P5Data official = switch (country) {
            case "GB" -> crawlerP5UK.fetch(input);
            case "US" -> crawlerP5US.fetch(input);
            default -> null;
        };

        if (official != null && official.isFound()) {
            return official;
        }
        if (official != null) {
            log.debug("P5 official registry ({}) had nothing usable for {}, falling back to Tavily", country, input.getName());
        }
        return crawlerP5Intl.fetch(input);
    }
}

package com.example.backend.verification.crawler.p3;

import com.example.backend.shared.model.crawler.P3Data;
import com.example.backend.shared.model.crawler.PillarData;
import com.example.backend.shared.model.input.CompanyInput;
import com.example.backend.shared.cache.CacheService;
import com.example.backend.partners.TavilyClient;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.jsoup.select.Elements;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Slf4j
@Service
@RequiredArgsConstructor
public class CrawlerP3Intl {

    @Value("${app.cache.p3-ttl-days:3}")
    private int ttlDays;

    private final CacheService cacheService;
    private final TavilyClient tavilyClient;

    public P3Data fetch(CompanyInput input) {
        String slug = input.getName().toLowerCase().replaceAll("[^a-z0-9]", "-");
        String key = "p3:intl:" + slug;

        Optional<P3Data> cached = cacheService.get(key, P3Data.class);
        if (cached.isPresent()) {
            log.debug("P3 Intl cache hit for {}", input.getName());
            return cached.get();
        }

        try {
            P3Data result = doFetch(input, slug);
            if (result.isFound()) {
                cacheService.set(key, result, Duration.ofDays(ttlDays), (short) 3, "importyeti+tavily", input.getCountry());
            }
            return result;
        } catch (Exception e) {
            log.warn("P3 Intl fetch failed for {}: {}", input.getName(), e.getMessage());
            return P3Data.builder().state(PillarData.DataState.SKIP).companyName(input.getName()).errorMsg("P3 Intl error: " + e.getMessage()).fetchedAt(java.time.LocalDateTime.now()).build();
        }
    }

    private P3Data doFetch(CompanyInput input, String slug) {
        // Try ImportYeti first
        boolean hasTradeHistory = false;
        boolean importYetiSucceeded = false;
        int shipmentCount = 0;
        String trend = "STABLE";

        try {
            String importYetiUrl = "https://www.importyeti.com/company/" + slug;
            Document doc = Jsoup.connect(importYetiUrl)
                .userAgent("Mozilla/5.0")
                .timeout(10000)
                .get();
            // Only count rows with a recognizable shipment-row class — a bare
            // "table tr" selector counts every HTML table row on the page (nav,
            // unrelated tables), inflating shipmentCount with noise.
            Elements shipmentRows = doc.select(".shipment-row, .data-row");
            if (!shipmentRows.isEmpty()) {
                hasTradeHistory = true;
                importYetiSucceeded = true;
                shipmentCount = shipmentRows.size();
                trend = shipmentCount > 10 ? "GROWING" : "STABLE";
            }
        } catch (Exception e) {
            log.debug("ImportYeti failed for {}, using Tavily fallback: {}", input.getName(), e.getMessage());
        }

        // Tavily supplement
        String tavilyQuery = input.getName() + " import export shipment trade history B2B";
        List<String> tavilyResults = tavilyClient.searchText(tavilyQuery, 3);
        String combined = String.join(" ", tavilyResults).toLowerCase();

        // Neither source returned anything — asserting "no trade history found" here
        // would present an unchecked company as if it were confirmed to have none.
        if (!importYetiSucceeded && tavilyResults.isEmpty()) {
            return P3Data.builder().state(PillarData.DataState.SKIP).companyName(input.getName())
                .errorMsg("Không tìm được dữ liệu thương mại từ ImportYeti hoặc Tavily").fetchedAt(LocalDateTime.now()).build();
        }

        if (!hasTradeHistory) {
            hasTradeHistory = combined.contains("import") || combined.contains("export")
                || combined.contains("shipment") || combined.contains("cargo");
            if (hasTradeHistory) shipmentCount = estimateFromText(combined);
        }
        if (combined.contains("growing") || combined.contains("increased") || combined.contains("tăng trưởng")) trend = "GROWING";
        else if (combined.contains("declined") || combined.contains("decreased")) trend = "DECLINING";

        String rawText = String.format(
            "Company: %s | HasTradeHistory: %b | ShipmentCount: %d | Trend: %s | Tavily: %s",
            input.getName(), hasTradeHistory, shipmentCount, trend, combined.substring(0, Math.min(300, combined.length()))
        );

        return P3Data.builder()
            .state(PillarData.DataState.FOUND)
            .companyName(input.getName())
            .hasTradeHistory(hasTradeHistory)
            .shipmentCountYear(shipmentCount > 0 ? shipmentCount : null)
            .isIndustryMatched(null)
            .tradeTrend(trend)
            .rawText(rawText)
            .dataSource("importyeti+tavily")
            .fetchedAt(LocalDateTime.now())
            .build();
    }

    private int estimateFromText(String text) {
        if (text.contains("hundreds") || text.contains("large volume")) return 50;
        if (text.contains("dozens") || text.contains("multiple")) return 15;
        if (text.contains("few")) return 3;
        return 5;
    }
}

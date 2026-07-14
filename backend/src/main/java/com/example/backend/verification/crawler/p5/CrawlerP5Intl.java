package com.example.backend.verification.crawler.p5;

import com.example.backend.shared.model.crawler.P5Data;
import com.example.backend.shared.model.crawler.PillarData;
import com.example.backend.shared.model.input.CompanyInput;
import com.example.backend.shared.cache.CacheService;
import com.example.backend.partners.TavilyClient;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Slf4j
@Service
@RequiredArgsConstructor
public class CrawlerP5Intl {

    @Value("${app.cache.p5-ttl-days:3}")
    private int ttlDays;

    private final CacheService cacheService;
    private final TavilyClient tavilyClient;

    public P5Data fetch(CompanyInput input) {
        String key = "p5:intl:" + input.getName().toLowerCase().replaceAll("\\s+", "_");

        Optional<P5Data> cached = cacheService.get(key, P5Data.class);
        if (cached.isPresent()) {
            log.debug("P5 Intl cache hit for {}", input.getName());
            return cached.get();
        }

        try {
            P5Data result = doFetch(input);
            if (result.isFound()) {
                cacheService.set(key, result, Duration.ofDays(ttlDays), (short) 5, "tavily", input.getCountry());
            }
            return result;
        } catch (Exception e) {
            log.warn("P5 Intl fetch failed for {}: {}", input.getName(), e.getMessage());
            return P5Data.builder().state(PillarData.DataState.SKIP).companyName(input.getName()).errorMsg("P5 Intl error: " + e.getMessage()).fetchedAt(java.time.LocalDateTime.now()).build();
        }
    }

    private P5Data doFetch(CompanyInput input) {
        String query = input.getName() + " annual report revenue 2024 financial";
        List<String> results = tavilyClient.searchText(query, 5);

        // Tavily is the ONLY source here. An empty result (missing API key, quota
        // exhausted, or genuinely no matches) must not silently become a fabricated
        // "NORMAL" tax-compliance finding — that reads as a verified clean bill of
        // health when in fact nothing was checked at all.
        if (results.isEmpty()) {
            return P5Data.builder().state(PillarData.DataState.SKIP).companyName(input.getName())
                .errorMsg("Không có kết quả tìm kiếm để đánh giá tài chính").fetchedAt(LocalDateTime.now()).build();
        }

        String combined = String.join(" ", results).toLowerCase();

        String taxStatus = "NORMAL";
        if (combined.contains("bankrupt") || combined.contains("liquidat") || combined.contains("insolvent")) {
            taxStatus = "DISSOLVING";
        } else if (combined.contains("penalty") || combined.contains("fine") || combined.contains("sanction")) {
            taxStatus = "PENALIZED";
        }

        String revenueTrend = "UNKNOWN";
        if (combined.contains("revenue grew") || combined.contains("sales increased") || combined.contains("growth")) {
            revenueTrend = "GROWING";
        } else if (combined.contains("revenue declined") || combined.contains("revenue fell") || combined.contains("decreased revenue")) {
            revenueTrend = "DECLINING";
        } else if (combined.contains("stable") || combined.contains("steady")) {
            revenueTrend = "STABLE";
        }

        boolean hasFinancialReport = combined.contains("annual report") || combined.contains("financial statement")
            || combined.contains("10-k") || combined.contains("earnings");

        Double capital = extractCapital(combined);

        String rawText = String.format(
            "Company: %s | TaxStatus: %s | RevenueTrend: %s | HasReport: %b | Capital: %s | Tavily: %s",
            input.getName(), taxStatus, revenueTrend, hasFinancialReport, capital,
            combined.substring(0, Math.min(300, combined.length()))
        );

        return P5Data.builder()
            .state(PillarData.DataState.FOUND)
            .companyName(input.getName())
            .taxComplianceStatus(taxStatus)
            .registeredCapitalUsd(capital)
            .hasFinancialReport(hasFinancialReport)
            .revenueTrend(revenueTrend)
            .rawText(rawText)
            .dataSource("tavily")
            .fetchedAt(LocalDateTime.now())
            .build();
    }

    private Double extractCapital(String text) {
        java.util.regex.Matcher m = java.util.regex.Pattern.compile("\\$(\\d+[,.]?\\d*)\\s*(million|billion|M|B)")
            .matcher(text);
        if (m.find()) {
            try {
                double val = Double.parseDouble(m.group(1).replace(",", ""));
                String unit = m.group(2).toLowerCase();
                return unit.startsWith("b") ? val * 1_000_000_000 : val * 1_000_000;
            } catch (Exception ignored) {}
        }
        return null;
    }
}

package com.example.backend.verification.crawler.p5;

import com.example.backend.shared.model.crawler.P5Data;
import com.example.backend.shared.model.crawler.PillarData;
import com.example.backend.shared.model.input.CompanyInput;
import com.example.backend.shared.cache.CacheService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.jsoup.nodes.Element;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.Optional;

@Slf4j
@Service
@RequiredArgsConstructor
public class CrawlerP5VN {

    @Value("${app.cache.p5-ttl-days:3}")
    private int ttlDays;

    private final CacheService cacheService;

    public P5Data fetch(CompanyInput input) {
        String mst = input.getTaxId();
        String key = mst != null ? "p5:vn:" + mst : "p5:vn:name:" + input.getName().toLowerCase().replaceAll("\\s+", "_");

        Optional<P5Data> cached = cacheService.get(key, P5Data.class);
        if (cached.isPresent()) {
            log.debug("P5 VN cache hit for {}", input.getName());
            return cached.get();
        }

        try {
            P5Data result = scrape(input, mst);
            if (result.isFound()) {
                cacheService.set(key, result, Duration.ofDays(ttlDays), (short) 5, "dangkykinhdoanh", "VN");
            }
            return result;
        } catch (Exception e) {
            log.warn("P5 VN fetch failed for {}: {}", input.getName(), e.getMessage());
            return P5Data.builder().state(PillarData.DataState.SKIP).companyName(input.getName()).errorMsg("dangkykinhdoanh.gov.vn error: " + e.getMessage()).fetchedAt(java.time.LocalDateTime.now()).build();
        }
    }

    private P5Data scrape(CompanyInput input, String mst) {
        try {
            String query = mst != null ? mst : input.getName();
            String url = "https://dangkykinhdoanh.gov.vn/en/Pages/search.aspx?q=" + java.net.URLEncoder.encode(query, "UTF-8");
            Document doc = Jsoup.connect(url)
                .userAgent("Mozilla/5.0")
                .timeout(8000)
                .get();

            String pageText = doc.text().toLowerCase();
            boolean isPenalized = pageText.contains("vi phạm") || pageText.contains("xử phạt") || pageText.contains("phạt");
            boolean isDissolving = pageText.contains("giải thể") || pageText.contains("dissolved");
            String status = isDissolving ? "DISSOLVING" : isPenalized ? "PENALIZED" : "NORMAL";

            // Try to extract capital from page text
            Double capital = null;
            java.util.regex.Matcher m = java.util.regex.Pattern.compile("(\\d+[,.]?\\d*)\\s*(tỷ|triệu|billion|million)")
                .matcher(pageText);
            if (m.find()) {
                try {
                    double val = Double.parseDouble(m.group(1).replace(",", ""));
                    String unit = m.group(2).toLowerCase();
                    if (unit.contains("tỷ") || unit.contains("billion")) capital = val * 1_000_000_000 / 24_000;
                    else capital = val * 1_000_000 / 24_000;
                } catch (Exception ignored) {}
            }

            String rawText = String.format(
                "Company: %s | Status: %s | Capital: %s | Source: dangkykinhdoanh.gov.vn",
                input.getName(), status, capital
            );

            return P5Data.builder()
                .state(PillarData.DataState.FOUND)
                .companyName(input.getName())
                .taxComplianceStatus(status)
                .registeredCapitalUsd(capital)
                .hasFinancialReport(null)
                .revenueTrend("UNKNOWN")
                .rawText(rawText)
                .dataSource("dangkykinhdoanh")
                .fetchedAt(LocalDateTime.now())
                .build();

        } catch (Exception e) {
            log.warn("dangkykinhdoanh scrape failed for {}: {}", input.getName(), e.getMessage());
            return P5Data.builder().state(PillarData.DataState.SKIP).companyName(input.getName()).errorMsg("dangkykinhdoanh error: " + e.getMessage()).fetchedAt(java.time.LocalDateTime.now()).build();
        }
    }
}

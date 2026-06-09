package com.example.backend.verification.crawler.p3;

import com.example.backend.shared.model.crawler.P3Data;
import com.example.backend.shared.model.crawler.PillarData;
import com.example.backend.shared.model.input.CompanyInput;
import com.example.backend.shared.cache.CacheService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.jsoup.nodes.Element;
import org.jsoup.select.Elements;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.Optional;

@Slf4j
@Service
@RequiredArgsConstructor
public class CrawlerP3VN {

    @Value("${app.cache.p3-ttl-days:3}")
    private int ttlDays;

    private final CacheService cacheService;

    public P3Data fetch(CompanyInput input) {
        String mst = input.getTaxId();
        String key = mst != null ? "p3:vn:" + mst : "p3:vn:name:" + input.getName().toLowerCase().replaceAll("\\s+", "_");

        Optional<P3Data> cached = cacheService.get(key, P3Data.class);
        if (cached.isPresent()) {
            log.debug("P3 VN cache hit for {}", input.getName());
            return cached.get();
        }

        try {
            P3Data result = scrapeVCCI(input, mst);
            if (result.isFound()) {
                cacheService.set(key, result, Duration.ofDays(ttlDays), (short) 3, "vcci_ecosys", "VN");
            }
            return result;
        } catch (Exception e) {
            log.warn("P3 VN fetch failed for {}: {}", input.getName(), e.getMessage());
            return P3Data.builder().state(PillarData.DataState.SKIP).companyName(input.getName()).errorMsg("VCCI eCoSys error: " + e.getMessage()).fetchedAt(java.time.LocalDateTime.now()).build();
        }
    }

    private P3Data scrapeVCCI(CompanyInput input, String mst) {
        try {
            String query = mst != null ? mst : input.getName();
            String url = "https://ecosys.vcci.com.vn/search?q=" + java.net.URLEncoder.encode(query, "UTF-8");
            Document doc = Jsoup.connect(url)
                .userAgent("Mozilla/5.0")
                .timeout(8000)
                .get();

            Elements rows = doc.select(".company-row, .result-item, tr");
            boolean found = !rows.isEmpty();
            int shipmentCount = rows.size() > 1 ? rows.size() - 1 : 0;
            String trend = shipmentCount > 10 ? "GROWING" : shipmentCount > 3 ? "STABLE" : "DECLINING";

            String rawText = String.format(
                "Company: %s | VCCI results: %d rows | Query: %s",
                input.getName(), rows.size(), query
            );

            if (!found) {
                return P3Data.builder()
                    .state(PillarData.DataState.NOT_FOUND)
                    .companyName(input.getName())
                    .hasTradeHistory(false)
                    .errorMsg("Không tìm thấy trong VCCI eCoSys")
                    .rawText(rawText)
                    .dataSource("vcci_ecosys")
                    .fetchedAt(LocalDateTime.now())
                    .build();
            }

            return P3Data.builder()
                .state(PillarData.DataState.FOUND)
                .companyName(input.getName())
                .hasTradeHistory(true)
                .shipmentCountYear(shipmentCount)
                .isIndustryMatched(true)
                .tradeTrend(trend)
                .rawText(rawText)
                .dataSource("vcci_ecosys")
                .fetchedAt(LocalDateTime.now())
                .build();

        } catch (Exception e) {
            log.warn("VCCI scrape failed for {}: {}", input.getName(), e.getMessage());
            return P3Data.builder().state(PillarData.DataState.SKIP).companyName(input.getName()).errorMsg("VCCI không phản hồi: " + e.getMessage()).fetchedAt(java.time.LocalDateTime.now()).build();
        }
    }
}

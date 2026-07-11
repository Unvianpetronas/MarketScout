package com.example.backend.verification.crawler.p5;

import com.example.backend.shared.cache.CacheService;
import com.example.backend.shared.model.crawler.P5Data;
import com.example.backend.shared.model.crawler.PillarData;
import com.example.backend.shared.model.input.CompanyInput;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * Pillar 5 (US) — SEC EDGAR full-text search. Free, no API key (SEC only requires
 * an identifying User-Agent on every request — unidentified traffic gets
 * rate-limited). No financial-figure parsing: presence of a recent 10-K/10-Q filing
 * IS itself a strong, real signal — public companies face real audit/regulatory
 * scrutiny private companies don't.
 *
 * Most trade-partner SMEs are privately held and simply won't appear here — that's
 * an expected NOT_FOUND (US law doesn't require private companies to disclose
 * financials, same constraint as Vietnam), and the caller falls back to
 * CrawlerP5Intl for those, same as any other unsupported case.
 *
 * Response shape verified live against efts.sec.gov (2026-07):
 * {hits: {hits: [{_source: {ciks, display_names, form, file_date, period_ending}}]}}.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class CrawlerP5US {

    private static final String SEARCH_URL = "https://efts.sec.gov/LATEST/search-index";

    @Value("${app.nominatim.contact-email:hello@marketscout.io.vn}")
    private String contactEmail;

    @Value("${app.cache.p5-ttl-days:3}")
    private int ttlDays;

    private final RestTemplate restTemplate;
    private final CacheService cacheService;

    public P5Data fetch(CompanyInput input) {
        String key = "p5:us:" + input.getName().toLowerCase().replaceAll("\\s+", "_");
        Optional<P5Data> cached = cacheService.get(key, P5Data.class);
        if (cached.isPresent()) {
            log.debug("P5 US cache hit for {}", input.getName());
            return cached.get();
        }

        try {
            P5Data result = doFetch(input);
            if (result.isFound()) {
                cacheService.set(key, result, Duration.ofDays(ttlDays), (short) 5, "sec_edgar", "US");
            }
            return result;
        } catch (Exception e) {
            log.warn("P5 US (SEC EDGAR) fetch failed for {}: {}", input.getName(), e.getMessage());
            return P5Data.builder().state(PillarData.DataState.SKIP).companyName(input.getName())
                .errorMsg("SEC EDGAR error: " + e.getMessage()).fetchedAt(LocalDateTime.now()).build();
        }
    }

    @SuppressWarnings("unchecked")
    private P5Data doFetch(CompanyInput input) {
        String query = "\"" + input.getName() + "\"";
        String url = SEARCH_URL + "?q=" + URLEncoder.encode(query, StandardCharsets.UTF_8) + "&forms=10-K,10-Q";

        HttpHeaders headers = new HttpHeaders();
        headers.set("User-Agent", "MarketScout-Verification/1.0 (" + contactEmail + ")");

        ResponseEntity<Map> resp = restTemplate.exchange(url, HttpMethod.GET, new HttpEntity<>(headers), Map.class);
        Map<String, Object> body = resp.getBody();
        Map<String, Object> hitsWrapper = body != null ? (Map<String, Object>) body.get("hits") : null;
        List<Map<String, Object>> hits = hitsWrapper != null ? (List<Map<String, Object>>) hitsWrapper.get("hits") : null;

        if (hits == null || hits.isEmpty()) {
            return P5Data.builder().state(PillarData.DataState.NOT_FOUND).companyName(input.getName())
                .errorMsg("Không tìm thấy hồ sơ SEC — có thể là công ty tư nhân, luật Mỹ không bắt buộc công khai báo cáo tài chính")
                .fetchedAt(LocalDateTime.now()).build();
        }

        Map<String, Object> source = (Map<String, Object>) hits.get(0).get("_source");
        List<String> displayNames = source != null ? (List<String>) source.get("display_names") : null;
        String form = source != null ? (String) source.get("form") : null;
        String fileDate = source != null ? (String) source.get("file_date") : null;

        String rawText = String.format("Company: %s | SEC filer: %s | LatestForm: %s | FileDate: %s",
            input.getName(), displayNames, form, fileDate);

        return P5Data.builder()
            .state(PillarData.DataState.FOUND)
            .companyName(input.getName())
            .taxComplianceStatus("NORMAL") // actively filing with SEC = real regulatory compliance, not guessed
            .hasFinancialReport(true) // 10-K/10-Q are real audited/reviewed financial statements
            .revenueTrend("UNKNOWN") // would need XBRL figure parsing — not fabricated here
            .rawText(rawText)
            .dataSource("sec_edgar")
            .fetchedAt(LocalDateTime.now())
            .build();
    }
}

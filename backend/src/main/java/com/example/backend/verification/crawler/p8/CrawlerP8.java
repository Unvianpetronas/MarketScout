package com.example.backend.verification.crawler.p8;

import com.example.backend.shared.model.crawler.P8Data;
import com.example.backend.shared.model.crawler.PillarData;
import com.example.backend.shared.model.input.CompanyInput;
import com.example.backend.shared.cache.CacheService;
import com.example.backend.partners.TavilyClient;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Slf4j
@Service
@RequiredArgsConstructor
public class CrawlerP8 {

    @Value("${app.tineye.api-key:}")
    private String tineyeApiKey;

    @Value("${app.tineye.base-url:https://api.tineye.com/rest}")
    private String tineyeUrl;

    @Value("${app.cache.p8-ttl-days:7}")
    private int ttlDays;

    private final RestTemplate restTemplate;
    private final CacheService cacheService;
    private final TavilyClient tavilyClient;

    public P8Data fetch(CompanyInput input) {
        String domain = extractDomain(input.getWebsite());
        String key = "p8:" + (domain != null ? domain : input.getName().toLowerCase().replaceAll("\\s+", "_"));

        Optional<P8Data> cached = cacheService.get(key, P8Data.class);
        if (cached.isPresent()) {
            log.debug("P8 cache hit for {}", input.getName());
            return cached.get();
        }

        try {
            P8Data result = doFetch(input, domain);
            if (result.isFound()) {
                cacheService.set(key, result, Duration.ofDays(ttlDays), (short) 8, "tineye+tavily", input.getCountry());
            }
            return result;
        } catch (Exception e) {
            log.warn("P8 fetch failed for {}: {}", input.getName(), e.getMessage());
            return P8Data.builder().state(PillarData.DataState.SKIP).companyName(input.getName()).errorMsg("P8 error: " + e.getMessage()).fetchedAt(java.time.LocalDateTime.now()).build();
        }
    }

    private P8Data doFetch(CompanyInput input, String domain) {
        Boolean isStockImage = null;

        // TinEye check if we have a logo URL
        if (!tineyeApiKey.isBlank() && domain != null) {
            String logoUrl = "https://" + domain + "/favicon.ico";
            isStockImage = checkTinEye(logoUrl);
        }

        // Tavily physical evidence search
        String tavilyQuery = input.getName() + " office photo warehouse factory building";
        List<String> results = tavilyClient.searchText(tavilyQuery, 4);
        String combined = String.join(" ", results).toLowerCase();

        boolean hasPhysicalEvidence = combined.contains("office") || combined.contains("factory")
            || combined.contains("warehouse") || combined.contains("facility") || combined.contains("nhà máy");
        boolean hasVerifiedLocation = combined.contains("address") || combined.contains("located")
            || combined.contains("headquarter") || combined.contains("trụ sở");

        String employeeRange = estimateEmployees(combined);

        String rawText = String.format(
            "Company: %s | Domain: %s | HasPhysicalEvidence: %b | HasVerifiedLocation: %b | StockImage: %s | Employees: %s | Tavily: %s",
            input.getName(), domain, hasPhysicalEvidence, hasVerifiedLocation, isStockImage, employeeRange,
            combined.substring(0, Math.min(300, combined.length()))
        );

        return P8Data.builder()
            .state(PillarData.DataState.FOUND)
            .companyName(input.getName())
            .hasVerifiedLocation(hasVerifiedLocation)
            .isStockImageUsed(isStockImage)
            .hasPhysicalEvidence(hasPhysicalEvidence)
            .employeeCountRange(employeeRange)
            .rawText(rawText)
            .dataSource("tineye+tavily")
            .fetchedAt(LocalDateTime.now())
            .build();
    }

    @SuppressWarnings("unchecked")
    private Boolean checkTinEye(String imageUrl) {
        if (tineyeApiKey.isBlank()) return null;
        try {
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_FORM_URLENCODED);
            headers.setBasicAuth("api", tineyeApiKey);
            HttpEntity<String> req = new HttpEntity<>("url=" + java.net.URLEncoder.encode(imageUrl, "UTF-8"), headers);
            ResponseEntity<Map> resp = restTemplate.exchange(tineyeUrl + "/search/", HttpMethod.POST, req, Map.class);
            if (resp.getBody() != null) {
                Map<String, Object> statsObject = (Map<String, Object>) resp.getBody().get("stats");
                if (statsObject != null) {
                    Object count = statsObject.get("total_results");
                    int total = count instanceof Number ? ((Number) count).intValue() : 0;
                    return total > 20; // many matches = stock image
                }
            }
        } catch (Exception e) {
            log.debug("TinEye check failed for {}: {}", imageUrl, e.getMessage());
        }
        return null;
    }

    private String estimateEmployees(String text) {
        if (text.contains("thousand") || text.contains("10,000") || text.contains("1000+")) return "LARGE";
        if (text.contains("hundred") || text.contains("500") || text.contains("employees")) return "MEDIUM";
        if (text.contains("small") || text.contains("startup") || text.contains("team")) return "SMALL";
        return "UNKNOWN";
    }

    private String extractDomain(String website) {
        if (website == null || website.isBlank()) return null;
        return website.replaceAll("https?://(www\\.)?", "").split("/")[0];
    }
}

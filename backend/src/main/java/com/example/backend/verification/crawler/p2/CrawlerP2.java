package com.example.backend.verification.crawler.p2;

import com.example.backend.shared.model.crawler.P2Data;
import com.example.backend.shared.model.crawler.PillarData;
import com.example.backend.shared.model.input.CompanyInput;
import com.example.backend.shared.cache.CacheService;
import com.example.backend.partners.TavilyClient;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
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
public class CrawlerP2 {

    @Value("${app.whois.api-key:}")
    private String whoisApiKey;

    @Value("${app.whois.base-url:https://www.whoisxmlapi.com/whoisserver/WhoisService}")
    private String whoisBaseUrl;

    @Value("${app.cache.p2-ttl-days:7}")
    private int ttlDays;

    private final RestTemplate restTemplate;
    private final CacheService cacheService;
    private final TavilyClient tavilyClient;

    public P2Data fetch(CompanyInput input) {
        String domain = extractDomain(input.getWebsite());
        String key = "p2:" + (domain != null ? domain : input.getName().toLowerCase().replaceAll("\\s+", "_"));

        Optional<P2Data> cached = cacheService.get(key, P2Data.class);
        if (cached.isPresent()) {
            log.debug("P2 cache hit for {}", domain);
            return cached.get();
        }

        try {
            P2Data result = doFetch(input, domain);
            if (result.isFound()) {
                cacheService.set(key, result, Duration.ofDays(ttlDays), (short) 2, "whoisxmlapi", input.getCountry());
            }
            return result;
        } catch (Exception e) {
            log.warn("P2 fetch failed for {}: {}", input.getName(), e.getMessage());
            return P2Data.builder().state(PillarData.DataState.SKIP).companyName(input.getName()).errorMsg("P2 error: " + e.getMessage()).fetchedAt(java.time.LocalDateTime.now()).build();
        }
    }

    @SuppressWarnings("unchecked")
    private P2Data doFetch(CompanyInput input, String domain) {
        boolean hasWebsite = domain != null && !domain.isBlank();
        Integer domainAgeMonths = null;
        Boolean hasSsl = null;
        String registrar = null;

        if (hasWebsite && !whoisApiKey.isBlank()) {
            try {
                String url = whoisBaseUrl + "?domainName=" + domain + "&apiKey=" + whoisApiKey + "&outputFormat=JSON";
                ResponseEntity<Map> resp = restTemplate.getForEntity(url, Map.class);
                if (resp.getBody() != null) {
                    Map<String, Object> whois = (Map<String, Object>) resp.getBody().get("WhoisRecord");
                    if (whois != null) {
                        String createdDate = (String) whois.get("createdDate");
                        domainAgeMonths = calcAgeMonths(createdDate);
                        registrar = (String) ((Map<String, Object>) whois.getOrDefault("registrarName", Map.of())).getOrDefault("name", null);
                        hasSsl = domain.startsWith("https") || hasWebsite;
                    }
                }
            } catch (Exception e) {
                log.debug("WHOIS lookup failed for {}: {}", domain, e.getMessage());
            }
        }

        // Supplement with Tavily
        String tavilyQuery = input.getName() + " official website social media presence";
        List<String> tavilyResults = tavilyClient.searchText(tavilyQuery, 3);
        String socialMediaScore = evaluateSocialMedia(tavilyResults);
        boolean usesFreeEmail = detectFreeEmail(tavilyResults);

        String rawText = String.format(
            "Company: %s | Domain: %s | DomainAgeMonths: %s | HasSSL: %s | SocialMedia: %s | Registrar: %s | Tavily: %s",
            input.getName(), domain, domainAgeMonths, hasSsl, socialMediaScore, registrar,
            String.join(" ", tavilyResults)
        );

        return P2Data.builder()
            .state(PillarData.DataState.FOUND)
            .companyName(input.getName())
            .hasOfficialWebsite(hasWebsite)
            .domainAgeMonths(domainAgeMonths)
            .usesFreeEmail(usesFreeEmail)
            .hasSsl(hasSsl != null ? hasSsl : hasWebsite)
            .socialMediaScore(socialMediaScore)
            .domain(domain)
            .whoisRegistrar(registrar)
            .rawText(rawText)
            .dataSource("whoisxmlapi + tavily")
            .fetchedAt(LocalDateTime.now())
            .build();
    }

    private String evaluateSocialMedia(List<String> results) {
        String combined = String.join(" ", results).toLowerCase();
        int score = 0;
        if (combined.contains("linkedin")) score++;
        if (combined.contains("facebook")) score++;
        if (combined.contains("twitter") || combined.contains("x.com")) score++;
        if (combined.contains("instagram")) score++;
        if (score >= 3) return "HIGH";
        if (score >= 1) return "MEDIUM";
        return "LOW";
    }

    private boolean detectFreeEmail(List<String> results) {
        String combined = String.join(" ", results).toLowerCase();
        return combined.contains("gmail") || combined.contains("yahoo") || combined.contains("hotmail");
    }

    private String extractDomain(String website) {
        if (website == null || website.isBlank()) return null;
        return website.replaceAll("https?://(www\\.)?", "").split("/")[0];
    }

    private Integer calcAgeMonths(String dateStr) {
        if (dateStr == null || dateStr.isBlank()) return null;
        try {
            java.time.LocalDate date = java.time.LocalDate.parse(dateStr.substring(0, 10));
            return (int) java.time.temporal.ChronoUnit.MONTHS.between(date, java.time.LocalDate.now());
        } catch (Exception e) {
            return null;
        }
    }
}

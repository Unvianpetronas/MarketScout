package com.example.backend.verification.crawler.p2;

import com.example.backend.shared.model.crawler.P2Data;
import com.example.backend.shared.model.crawler.PillarData;
import com.example.backend.shared.model.input.CompanyInput;
import com.example.backend.shared.cache.CacheService;
import com.example.backend.partners.TavilyClient;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.RequestEntity;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.net.URI;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Slf4j
@Service
@RequiredArgsConstructor
public class CrawlerP2 {

    @Value("${app.rdap.base-url:https://rdap.org/domain}")
    private String rdapBaseUrl;

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
                cacheService.set(key, result, Duration.ofDays(ttlDays), (short) 2, "rdap", input.getCountry());
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

        if (hasWebsite) {
            try {
                String url = rdapBaseUrl + "/" + domain;
                RequestEntity<Void> req = RequestEntity.get(URI.create(url))
                    .header("Accept", "application/rdap+json, application/json")
                    .build();
                ResponseEntity<Map> resp = restTemplate.exchange(req, Map.class);
                Map<String, Object> rdap = resp.getBody();
                if (rdap != null) {
                    domainAgeMonths = extractRegistrationAgeMonths(rdap);
                    registrar = extractRegistrarName(rdap);
                    hasSsl = hasWebsite;
                }
            } catch (Exception e) {
                log.debug("RDAP lookup failed for {}: {}", domain, e.getMessage());
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
            .registrar(registrar)
            .rawText(rawText)
            .dataSource("rdap + tavily")
            .fetchedAt(LocalDateTime.now())
            .build();
    }

    /** Finds the "registration" event in an RDAP response and returns its age in months. */
    private Integer extractRegistrationAgeMonths(Map<String, Object> rdap) {
        Object eventsObj = rdap.get("events");
        if (!(eventsObj instanceof List<?> events)) return null;
        for (Object o : events) {
            if (o instanceof Map<?, ?> event
                    && "registration".equalsIgnoreCase(String.valueOf(event.get("eventAction")))) {
                return calcAgeMonths(String.valueOf(event.get("eventDate")));
            }
        }
        return null;
    }

    /** Finds the "registrar" entity in an RDAP response and returns its name (vCard "fn"). */
    private String extractRegistrarName(Map<String, Object> rdap) {
        Object entitiesObj = rdap.get("entities");
        if (!(entitiesObj instanceof List<?> entities)) return null;
        for (Object o : entities) {
            if (!(o instanceof Map<?, ?> entity)) continue;
            Object rolesObj = entity.get("roles");
            if (!(rolesObj instanceof List<?> roles) || !roles.contains("registrar")) continue;

            Object vcardObj = entity.get("vcardArray");
            if (!(vcardObj instanceof List<?> vcard) || vcard.size() < 2) continue;
            Object propsObj = vcard.get(1);
            if (!(propsObj instanceof List<?> props)) continue;
            for (Object propObj : props) {
                if (propObj instanceof List<?> prop && prop.size() >= 4 && "fn".equals(prop.get(0))) {
                    return String.valueOf(prop.get(3));
                }
            }
        }
        return null;
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

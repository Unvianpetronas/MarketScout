package com.example.backend.verification.crawler.p4;

import com.example.backend.shared.model.crawler.P4Data;
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
public class CrawlerP4 {

    @Value("${app.google-places.api-key:}")
    private String googleApiKey;

    @Value("${app.google-places.base-url:https://maps.googleapis.com/maps/api/place}")
    private String googlePlacesUrl;

    @Value("${app.cache.p4-ttl-days:7}")
    private int ttlDays;

    private final RestTemplate restTemplate;
    private final CacheService cacheService;
    private final TavilyClient tavilyClient;

    public P4Data fetch(CompanyInput input) {
        String key = "p4:" + input.getName().toLowerCase().replaceAll("\\s+", "_")
            + ":" + (input.getCountry() != null ? input.getCountry().toLowerCase() : "xx");

        Optional<P4Data> cached = cacheService.get(key, P4Data.class);
        if (cached.isPresent()) {
            log.debug("P4 cache hit for {}", input.getName());
            return cached.get();
        }

        try {
            P4Data result = doFetch(input);
            if (result.isFound()) {
                cacheService.set(key, result, Duration.ofDays(ttlDays), (short) 4, "google_places", input.getCountry());
            }
            return result;
        } catch (Exception e) {
            log.warn("P4 fetch failed for {}: {}", input.getName(), e.getMessage());
            return P4Data.builder().state(PillarData.DataState.SKIP).companyName(input.getName()).errorMsg("P4 error: " + e.getMessage()).fetchedAt(java.time.LocalDateTime.now()).build();
        }
    }

    @SuppressWarnings("unchecked")
    private P4Data doFetch(CompanyInput input) {
        String placeId = null;
        String verifiedAddress = null;
        String identityMatch = null;
        boolean addressVerified = false;

        if (!googleApiKey.isBlank()) {
            try {
                String query = java.net.URLEncoder.encode(input.getName(), "UTF-8");
                String url = googlePlacesUrl + "/findplacefromtext/json?input=" + query
                    + "&inputtype=textquery&fields=place_id,name,formatted_address&key=" + googleApiKey;
                ResponseEntity<Map> resp = restTemplate.getForEntity(url, Map.class);
                if (resp.getBody() != null) {
                    List<Map<String, Object>> candidates = (List<Map<String, Object>>) resp.getBody().get("candidates");
                    if (candidates != null && !candidates.isEmpty()) {
                        Map<String, Object> place = candidates.get(0);
                        placeId = (String) place.get("place_id");
                        verifiedAddress = (String) place.get("formatted_address");
                        String placeName = (String) place.get("name");
                        identityMatch = evaluateMatch(input.getName(), placeName);
                        addressVerified = verifiedAddress != null;
                    }
                }
            } catch (Exception e) {
                log.debug("Google Places failed for {}: {}", input.getName(), e.getMessage());
            }
        }

        // Tavily cross-check
        String tavilyQuery = input.getName() + " " + (input.getCountry() != null ? input.getCountry() : "") + " office address verify";
        List<String> tavilyResults = tavilyClient.searchText(tavilyQuery, 3);
        String combined = String.join(" ", tavilyResults).toLowerCase();

        if (identityMatch == null) {
            identityMatch = combined.contains(input.getName().toLowerCase().substring(0, Math.min(5, input.getName().length())))
                ? "COMPLETELY_MATCHED" : "MINOR_MISMATCH";
        }
        boolean ceoVerified = combined.contains("ceo") || combined.contains("director") || combined.contains("founder");

        String rawText = String.format(
            "Company: %s | GooglePlaceId: %s | Address: %s | IdentityMatch: %s | Tavily: %s",
            input.getName(), placeId, verifiedAddress, identityMatch,
            combined.substring(0, Math.min(200, combined.length()))
        );

        return P4Data.builder()
            .state(PillarData.DataState.FOUND)
            .companyName(input.getName())
            .identityMatchLevel(identityMatch)
            .addressVerified(addressVerified)
            .ceoVerified(ceoVerified)
            .googlePlaceId(placeId)
            .verifiedAddress(verifiedAddress)
            .rawText(rawText)
            .dataSource("google_places+tavily")
            .fetchedAt(LocalDateTime.now())
            .build();
    }

    private String evaluateMatch(String input, String result) {
        if (result == null) return "MINOR_MISMATCH";
        String a = input.toLowerCase().replaceAll("[^a-z0-9]", "");
        String b = result.toLowerCase().replaceAll("[^a-z0-9]", "");
        if (a.equals(b)) return "COMPLETELY_MATCHED";
        if (a.contains(b.substring(0, Math.min(5, b.length()))) || b.contains(a.substring(0, Math.min(5, a.length()))))
            return "MINOR_MISMATCH";
        return "MAJOR_MISMATCH";
    }
}

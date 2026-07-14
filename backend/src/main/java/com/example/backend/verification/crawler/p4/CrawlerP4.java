package com.example.backend.verification.crawler.p4;

import com.example.backend.shared.model.crawler.P4Data;
import com.example.backend.shared.model.crawler.PillarData;
import com.example.backend.shared.model.input.CompanyInput;
import com.example.backend.shared.cache.CacheService;
import com.example.backend.partners.TavilyClient;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Slf4j
@Service
@RequiredArgsConstructor
public class CrawlerP4 {

    @Value("${app.nominatim.base-url:https://nominatim.openstreetmap.org}")
    private String nominatimUrl;

    // Nominatim's usage policy requires identifying the caller (their team may
    // reach out before blocking abusive traffic) — not optional for automated
    // use of the public instance, set this to a real inbox before going live.
    @Value("${app.nominatim.contact-email:hello@marketscout.io.vn}")
    private String nominatimContact;

    @Value("${app.cache.p4-ttl-days:7}")
    private int ttlDays;

    private final RestTemplate restTemplate;
    private final CacheService cacheService;
    private final TavilyClient tavilyClient;

    // Nominatim's public-instance usage policy caps automated use at 1 request/sec,
    // shared across the whole JVM (not per report) — see https://operations.osmfoundation.org/policies/nominatim/
    private static final Object RATE_LIMIT_LOCK = new Object();
    private static volatile long lastNominatimCallAt = 0;

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
                cacheService.set(key, result, Duration.ofDays(ttlDays), (short) 4, "nominatim+tavily", input.getCountry());
            }
            return result;
        } catch (Exception e) {
            log.warn("P4 fetch failed for {}: {}", input.getName(), e.getMessage());
            return P4Data.builder().state(PillarData.DataState.SKIP).companyName(input.getName()).errorMsg("P4 error: " + e.getMessage()).fetchedAt(LocalDateTime.now()).build();
        }
    }

    @SuppressWarnings("unchecked")
    private P4Data doFetch(CompanyInput input) {
        String verifiedAddress = null;
        String osmName = null;
        boolean addressVerified = false;
        boolean nominatimSucceeded = false;

        try {
            Map<String, Object> place = queryNominatim(input);
            if (place != null) {
                verifiedAddress = (String) place.get("display_name");
                Map<String, Object> namedetails = (Map<String, Object>) place.get("namedetails");
                osmName = namedetails != null ? (String) namedetails.get("name") : null;
                addressVerified = verifiedAddress != null;
                nominatimSucceeded = true;
            }
        } catch (Exception e) {
            log.debug("Nominatim lookup failed for {}: {}", input.getName(), e.getMessage());
        }

        // Tavily cross-check — independent text-evidence signal, combined with
        // the Nominatim geocoding result above so identity match doesn't rely
        // on a single source.
        String tavilyQuery = input.getName() + " " + (input.getCountry() != null ? input.getCountry() : "") + " office address verify";
        List<String> tavilyResults = tavilyClient.searchText(tavilyQuery, 3);
        String combined = String.join(" ", tavilyResults).toLowerCase();

        // Neither source returned anything — asserting a specific identity-match
        // verdict (even "MINOR_MISMATCH") here would present an unchecked company
        // as if its identity had actually been cross-checked.
        if (!nominatimSucceeded && tavilyResults.isEmpty()) {
            return P4Data.builder().state(PillarData.DataState.SKIP).companyName(input.getName())
                .errorMsg("Không tìm được dữ liệu định danh từ Nominatim hoặc Tavily").fetchedAt(LocalDateTime.now()).build();
        }

        String identityMatch = osmName != null
            ? evaluateMatch(input.getName(), osmName)
            : (combined.contains(input.getName().toLowerCase().substring(0, Math.min(5, input.getName().length())))
                ? "COMPLETELY_MATCHED" : "MINOR_MISMATCH");
        boolean ceoVerified = combined.contains("ceo") || combined.contains("director") || combined.contains("founder");

        String rawText = String.format(
            "Company: %s | OSM Address: %s | IdentityMatch: %s | Tavily: %s",
            input.getName(), verifiedAddress, identityMatch,
            combined.substring(0, Math.min(200, combined.length()))
        );

        return P4Data.builder()
            .state(PillarData.DataState.FOUND)
            .companyName(input.getName())
            .identityMatchLevel(identityMatch)
            .addressVerified(addressVerified)
            .ceoVerified(ceoVerified)
            .verifiedAddress(verifiedAddress)
            .rawText(rawText)
            .dataSource("nominatim+tavily")
            .fetchedAt(LocalDateTime.now())
            .build();
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> queryNominatim(CompanyInput input) {
        throttle();
        String query = input.getName() + (input.getCountry() != null ? " " + input.getCountry() : "");
        String url = nominatimUrl + "/search?q=" + URLEncoder.encode(query, StandardCharsets.UTF_8)
            + "&format=json&limit=1&addressdetails=1&namedetails=1";

        HttpHeaders headers = new HttpHeaders();
        headers.set("User-Agent", "MarketScout-Verification/1.0 (" + nominatimContact + ")");

        ResponseEntity<List> resp = restTemplate.exchange(url, HttpMethod.GET, new HttpEntity<>(headers), List.class);
        List<Map<String, Object>> results = resp.getBody();
        return (results != null && !results.isEmpty()) ? results.get(0) : null;
    }

    private void throttle() {
        synchronized (RATE_LIMIT_LOCK) {
            long wait = (lastNominatimCallAt + 1100) - System.currentTimeMillis();
            if (wait > 0) {
                try { Thread.sleep(wait); } catch (InterruptedException ignored) {}
            }
            lastNominatimCallAt = System.currentTimeMillis();
        }
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

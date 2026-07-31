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
import java.text.Normalizer;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;

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
                .errorMsg("P4_NO_SOURCE").fetchedAt(LocalDateTime.now()).build();
        }

        // Consistency needs two independent statements of the same fact. The one
        // that matters is the registry's address vs. where that address actually
        // geocodes to. Comparing the company NAME against an OSM place name — what
        // this used to do — compares two different things and proves nothing.
        String identityMatch = compareRegistryToGeocode(input.getRegistryAddress(), verifiedAddress, osmName, input.getName());

        // Previously: `combined.contains("ceo") || contains("director")`, i.e. the
        // word appearing anywhere in search text scored "Người đại diện được xác
        // minh". That verified nothing, so the claim is no longer made at all.
        Boolean ceoVerified = null;

        String rawText = String.format(
            "Company: %s | Registry address: %s | Geocoded: %s | OSM name: %s | IdentityMatch: %s | Tavily: %s",
            input.getName(), input.getRegistryAddress(), verifiedAddress, osmName, identityMatch,
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

    /**
     * Grades registry address against geocoder result.
     *
     * Returns null (unknown) rather than a verdict when there is nothing to compare
     * — a company whose registry address we never obtained has not been found
     * inconsistent, and "MINOR_MISMATCH" would say that it has.
     */
    static String compareRegistryToGeocode(String registryAddress, String geocodedAddress,
                                           String osmName, String companyName) {
        if (registryAddress == null || registryAddress.isBlank() || geocodedAddress == null) {
            // Fall back to the weaker name-vs-place-name signal only when it is
            // actually available; otherwise admit we do not know.
            if (osmName == null || companyName == null) return null;
            return tokenOverlapVerdict(companyName, osmName);
        }
        return tokenOverlapVerdict(registryAddress, geocodedAddress);
    }

    /**
     * Compares two address strings by shared significant tokens. Substring matching
     * on the first five characters — the previous approach — returns "matched" for
     * any two Vietnamese company names, since they all begin "Công ty".
     */
    private static String tokenOverlapVerdict(String a, String b) {
        Set<String> ta = significantTokens(a);
        Set<String> tb = significantTokens(b);
        if (ta.isEmpty() || tb.isEmpty()) return null;
        long shared = ta.stream().filter(tb::contains).count();
        double ratio = (double) shared / Math.min(ta.size(), tb.size());
        if (ratio >= 0.6) return "COMPLETELY_MATCHED";
        if (ratio >= 0.3) return "MINOR_MISMATCH";
        return "MAJOR_MISMATCH";
    }

    /** Lowercased, diacritic-stripped tokens, minus filler words that match everything. */
    private static Set<String> significantTokens(String s) {
        String normalized = Normalizer.normalize(s, Normalizer.Form.NFD)
            .replaceAll("\\p{M}", "").replace("đ", "d").replace("Đ", "D")
            .toLowerCase(Locale.ROOT).replaceAll("[^a-z0-9]+", " ");
        return Arrays.stream(normalized.split(" "))
            .filter(t -> t.length() > 2)
            .filter(t -> !FILLER_TOKENS.contains(t))
            .collect(Collectors.toSet());
    }

    private static final Set<String> FILLER_TOKENS = Set.of(
        "cong", "phuong", "quan", "duong", "pho", "ngo", "thanh", "tinh", "huyen",
        "street", "road", "ward", "district", "city", "province", "the", "and", "ltd", "company");

    @SuppressWarnings("unchecked")
    private Map<String, Object> queryNominatim(CompanyInput input) {
        throttle();
        // Geocode the registry's address when we have it — that is the fact we are
        // trying to corroborate. A company name is not a geocodable place.
        String base = input.getRegistryAddress() != null && !input.getRegistryAddress().isBlank()
            ? input.getRegistryAddress() : input.getName();
        String query = base + (input.getCountry() != null ? " " + input.getCountry() : "");
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

}

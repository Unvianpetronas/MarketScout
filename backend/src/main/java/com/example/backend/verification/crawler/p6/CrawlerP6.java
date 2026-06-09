package com.example.backend.verification.crawler.p6;

import com.example.backend.shared.model.crawler.LeadResult;
import com.example.backend.shared.model.crawler.P6Data;
import com.example.backend.shared.model.crawler.PillarData;
import com.example.backend.shared.model.input.CompanyInput;
import com.example.backend.shared.cache.CacheService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.net.SocketTimeoutException;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Slf4j
@Service
@RequiredArgsConstructor
public class CrawlerP6 {

    @Value("${app.opensanctions.base-url:http://localhost:8080}")
    private String baseUrl;

    private final RestTemplate restTemplate;
    private final CacheService cacheService;

    public P6Data fetch(CompanyInput input) {
        String key = buildKey(input.getName(), input.getCountry());
        Optional<P6Data> cached = cacheService.get(key, P6Data.class);
        if (cached.isPresent()) {
            log.debug("P6 cache hit for {}", input.getName());
            return cached.get();
        }
        try {
            P6Data result = checkSanctions(input.getName(), input.getCountry());
            if (result.isFound()) {
                cacheService.set(key, result, Duration.ofDays(1), (short) 6, "opensanctions", input.getCountry());
            }
            return result;
        } catch (Exception e) {
            log.warn("P6 check failed for {}: {}", input.getName(), e.getMessage());
            return P6Data.builder()
                .state(PillarData.DataState.SKIP)
                .companyName(input.getName())
                .errorMsg("OpenSanctions không phản hồi — bỏ qua kiểm tra trừng phạt")
                .fetchedAt(LocalDateTime.now())
                .sanctioned(false)
                .build();
        }
    }

    public List<LeadResult> batchCheck(List<LeadResult> leads) {
        List<LeadResult> filtered = new ArrayList<>();
        for (LeadResult lead : leads) {
            CompanyInput input = CompanyInput.builder()
                .companyName(lead.getCompanyName())
                .country(lead.getCountry())
                .build();
            P6Data p6 = fetch(input);
            if (p6.isSanctioned()) {
                lead.setSanctionHit(true);
                lead.setSanctionNote("LOẠI — khớp danh sách trừng phạt (" + p6.getSanctionSource() + ")");
            }
            filtered.add(lead);
        }
        return filtered;
    }

    @SuppressWarnings("unchecked")
    private P6Data checkSanctions(String companyName, String country) {
        Map<String, Object> body = Map.of(
            "queries", Map.of(
                "q1", Map.of(
                    "schema", "Company",
                    "properties", Map.of("name", List.of(companyName))
                )
            )
        );
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        try {
            ResponseEntity<Map> resp = restTemplate.exchange(
                baseUrl + "/api/1/match",
                HttpMethod.POST,
                new HttpEntity<>(body, headers),
                Map.class
            );
            if (resp.getBody() == null) {
                return notSanctioned(companyName, "Không có phản hồi từ OpenSanctions");
            }
            Map<String, Object> responses = (Map<String, Object>) resp.getBody().get("responses");
            if (responses == null) return notSanctioned(companyName, "OK");
            Map<String, Object> q1 = (Map<String, Object>) responses.get("q1");
            if (q1 == null) return notSanctioned(companyName, "OK");
            List<Map<String, Object>> results = (List<Map<String, Object>>) q1.get("results");
            if (results == null || results.isEmpty()) return notSanctioned(companyName, "OK");
            // Check if score > 0.7 threshold
            for (Map<String, Object> r : results) {
                Double score = r.get("score") instanceof Number ? ((Number) r.get("score")).doubleValue() : null;
                if (score != null && score > 0.7) {
                    List<String> datasets = (List<String>) r.getOrDefault("datasets", List.of());
                    String source = datasets.isEmpty() ? "unknown" : datasets.get(0);
                    log.warn("SANCTIONS HIT: {} matched with score {} from {}", companyName, score, source);
                    return P6Data.builder()
                        .state(PillarData.DataState.FOUND)
                        .companyName(companyName)
                        .sanctioned(true)
                        .sanctionSource(source)
                        .rawText("Sanction match score: " + score + " source: " + source)
                        .dataSource("opensanctions")
                        .fetchedAt(LocalDateTime.now())
                        .build();
                }
            }
            return notSanctioned(companyName, "No match found");
        } catch (Exception e) {
            log.warn("OpenSanctions API error for {}: {}", companyName, e.getMessage());
            return P6Data.builder()
                .state(PillarData.DataState.SKIP)
                .companyName(companyName)
                .errorMsg("OpenSanctions error: " + e.getMessage())
                .sanctioned(false)
                .fetchedAt(LocalDateTime.now())
                .build();
        }
    }

    private P6Data notSanctioned(String name, String detail) {
        return P6Data.builder()
            .state(PillarData.DataState.FOUND)
            .companyName(name)
            .sanctioned(false)
            .rawText("OpenSanctions check: no match. " + detail)
            .dataSource("opensanctions")
            .fetchedAt(LocalDateTime.now())
            .build();
    }

    private String buildKey(String name, String country) {
        String n = name != null ? name.toLowerCase().replaceAll("\\s+", "_") : "unknown";
        String c = country != null ? country.toLowerCase() : "xx";
        return "p6:" + n + ":" + c;
    }
}

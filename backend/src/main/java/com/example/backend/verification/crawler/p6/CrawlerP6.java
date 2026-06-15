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

    // OpenSanctions hosted API — https://api.opensanctions.org
    private static final String OPENSANCTIONS_API_URL = "https://api.opensanctions.org/match/sanctions";

    @Value("${app.opensanctions.api-key:}")
    private String apiKey;

    private final RestTemplate restTemplate;
    private final CacheService cacheService;

    // ── Public entry point ────────────────────────────────────────────

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
                // Cache 1 ngày — data sanctions cập nhật thường xuyên
                cacheService.set(key, result, Duration.ofDays(1),
                        (short) 6, "opensanctions_api", input.getCountry());
            }
            return result;
        } catch (Exception e) {
            log.warn("P6 check failed for {}: {}", input.getName(), e.getMessage());
            // Fallback an toàn — không crash pipeline
            return P6Data.builder()
                    .state(PillarData.DataState.SKIP)
                    .companyName(input.getName())
                    .errorMsg("OpenSanctions API không phản hồi — bỏ qua kiểm tra trừng phạt")
                    .fetchedAt(LocalDateTime.now())
                    .sanctioned(false)
                    .build();
        }
    }

    public List<LeadResult> batchCheck(List<LeadResult> leads) {
        List<LeadResult> result = new ArrayList<>();
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
            result.add(lead);
        }
        return result;
    }

    // ── Core API call ─────────────────────────────────────────────────

    /**
     * Gọi OpenSanctions hosted API /match/sanctions endpoint.
     *
     * Endpoint này match một entity với toàn bộ sanctions dataset.
     * Score > 0.7 → coi là match, trigger HARD STOP.
     *
     * Docs: https://api.opensanctions.org/
     * Free trial: 50 requests/ngày trong 30 ngày.
     */
    @SuppressWarnings("unchecked")
    private P6Data checkSanctions(String companyName, String country) {
        // Nếu không có API key → SKIP ngay, không gọi API
        if (apiKey == null || apiKey.isBlank()) {
            log.warn("P6: OPENSANCTIONS_API_KEY chưa được set — bỏ qua kiểm tra trừng phạt cho {}", companyName);
            return P6Data.builder()
                    .state(PillarData.DataState.SKIP)
                    .companyName(companyName)
                    .errorMsg("Chưa cấu hình OPENSANCTIONS_API_KEY")
                    .sanctioned(false)
                    .fetchedAt(LocalDateTime.now())
                    .build();
        }

        // Build request body theo format OpenSanctions matching API
        Map<String, Object> properties = new java.util.HashMap<>();
        properties.put("name", List.of(companyName));
        if (country != null && !country.isBlank()) {
            properties.put("country", List.of(country));
        }

        Map<String, Object> query = Map.of(
                "schema", "Company",
                "properties", properties
        );

        Map<String, Object> body = Map.of(
                "queries", Map.of("q1", query)
        );

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.set("Authorization", "ApiKey " + apiKey);

        try {
            ResponseEntity<Map> resp = restTemplate.exchange(
                    OPENSANCTIONS_API_URL,
                    HttpMethod.POST,
                    new HttpEntity<>(body, headers),
                    Map.class
            );

            if (resp.getBody() == null) {
                return notSanctioned(companyName, "Empty response");
            }

            // Parse response: responses.q1.results[]
            Map<String, Object> responses = (Map<String, Object>) resp.getBody().get("responses");
            if (responses == null) return notSanctioned(companyName, "No responses field");

            Map<String, Object> q1 = (Map<String, Object>) responses.get("q1");
            if (q1 == null) return notSanctioned(companyName, "No q1 result");

            List<Map<String, Object>> results = (List<Map<String, Object>>) q1.get("results");
            if (results == null || results.isEmpty()) {
                return notSanctioned(companyName, "No matches found");
            }

            // Kiểm tra từng result — score > 0.7 là match đáng tin
            for (Map<String, Object> r : results) {
                Double score = r.get("score") instanceof Number
                        ? ((Number) r.get("score")).doubleValue()
                        : null;

                if (score != null && score > 0.7) {
                    List<String> datasets = (List<String>) r.getOrDefault("datasets", List.of());
                    String source = datasets.isEmpty() ? "unknown" : datasets.get(0);

                    log.warn("SANCTIONS HIT: {} — score={} source={}", companyName, score, source);

                    return P6Data.builder()
                            .state(PillarData.DataState.FOUND)
                            .companyName(companyName)
                            .sanctioned(true)
                            .sanctionSource(source)
                            .rawText("Sanction match score: " + score + " | source: " + source)
                            .dataSource("opensanctions_api")
                            .fetchedAt(LocalDateTime.now())
                            .build();
                }
            }

            return notSanctioned(companyName, "No high-confidence match (best score below 0.7)");

        } catch (org.springframework.web.client.HttpClientErrorException e) {
            int status = e.getStatusCode().value();
            if (status == 401) {
                log.error("P6: OpenSanctions API key không hợp lệ");
            } else if (status == 429) {
                log.warn("P6: OpenSanctions rate limit — đã hết 50 requests hôm nay");
            }
            // Cả 2 trường hợp đều fallback SKIP, không crash
            return P6Data.builder()
                    .state(PillarData.DataState.SKIP)
                    .companyName(companyName)
                    .errorMsg("OpenSanctions HTTP " + status + ": " + e.getMessage())
                    .sanctioned(false)
                    .fetchedAt(LocalDateTime.now())
                    .build();
        }
    }

    // ── Helpers ───────────────────────────────────────────────────────

    private P6Data notSanctioned(String name, String detail) {
        return P6Data.builder()
                .state(PillarData.DataState.FOUND)
                .companyName(name)
                .sanctioned(false)
                .rawText("OpenSanctions check: no match. " + detail)
                .dataSource("opensanctions_api")
                .fetchedAt(LocalDateTime.now())
                .build();
    }

    private String buildKey(String name, String country) {
        String n = name != null ? name.toLowerCase().replaceAll("\\s+", "_") : "unknown";
        String c = country != null ? country.toLowerCase() : "xx";
        return "p6:" + n + ":" + c;
    }
}
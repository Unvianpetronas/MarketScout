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
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * Pillar 6 — sanctions screening via the OpenSanctions matching API.
 *
 * The free tier allows only 50 requests/day, so this crawler is built to be
 * stingy:
 *   • Daily-budget guard — a Redis counter ({@code p6:budget:yyyy-MM-dd}) caps
 *     the number of API queries per day. Over budget → SKIP (never a false
 *     hard-stop). A 429 burns the counter for the rest of the day.
 *   • Two-way cache — every successful result is cached for a day, both
 *     "on a list" and "clear", so a repeat lookup costs 0 requests.
 *   • Real batch — {@link #batchCheck} packs N companies into ONE HTTP request
 *     instead of N round-trips.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class CrawlerP6 {

    private static final String OPENSANCTIONS_API_URL = "https://api.opensanctions.org/match/sanctions";
    // Only a CONFIDENT match triggers a HARD STOP. OpenSanctions scores 0.70–0.85
    // are "weak/possible" partial matches that need human review, not automatic
    // blocks — treating them as hits produced false positives (e.g. a big legit
    // company name fuzzy-grazing an unrelated sanctioned name). We now require a
    // high raw score AND honour OpenSanctions' own calibrated `match` decision.
    private static final double MATCH_THRESHOLD = 0.85;

    @Value("${app.opensanctions.api-key:}")
    private String apiKey;

    @Value("${app.opensanctions.daily-budget:45}")
    private int dailyBudget;

    private final RestTemplate restTemplate;
    private final CacheService cacheService;

    private record QueryItem(String key, String name, String country) {}

    // ── Single lookup ──────────────────────────────────────────────────

    public P6Data fetch(CompanyInput input) {
        String key = buildKey(input.getName(), input.getCountry());

        Optional<P6Data> cached = cacheService.get(key, P6Data.class);
        if (cached.isPresent()) {
            log.debug("P6 cache hit for {}", input.getName());
            return cached.get();
        }

        if (apiKey == null || apiKey.isBlank()) {
            log.warn("P6: OPENSANCTIONS_API_KEY chưa set — bỏ qua kiểm tra trừng phạt cho {}", input.getName());
            // Stable code, not prose: this reason is shown to the customer, and the
            // crawler has no idea which language they read the report in. ScoringRubric
            // translates it where the user's language is actually known.
            return skip(input.getName(), "P6_NO_API_KEY");
        }

        if (reserveBudget(1) < 1) {
            log.warn("P6: đã đạt trần {} request/ngày — SKIP {}", dailyBudget, input.getName());
            return skip(input.getName(), "P6_DAILY_CAP");
        }

        Map<String, P6Data> res = callOpenSanctions(List.of(new QueryItem(key, input.getName(), input.getCountry())));
        P6Data data = res.get(key);
        if (data == null) {
            return skip(input.getName(), "P6_SOURCE_DOWN");
        }
        cacheService.set(key, data, Duration.ofDays(1), (short) 6, "opensanctions_api", input.getCountry());
        return data;
    }

    // ── Batch lookup (find-partners) ───────────────────────────────────

    public List<LeadResult> batchCheck(List<LeadResult> leads) {
        if (leads == null || leads.isEmpty()) return leads;

        Map<String, P6Data> resolved = new HashMap<>();      // cache key → result (cached or fresh)
        LinkedHashMap<String, QueryItem> toFetch = new LinkedHashMap<>(); // unique uncached, dedupe by key

        for (LeadResult lead : leads) {
            String key = buildKey(lead.getCompanyName(), lead.getCountry());
            if (resolved.containsKey(key) || toFetch.containsKey(key)) continue;
            Optional<P6Data> cached = cacheService.get(key, P6Data.class);
            if (cached.isPresent()) {
                resolved.put(key, cached.get());
            } else {
                toFetch.put(key, new QueryItem(key, lead.getCompanyName(), lead.getCountry()));
            }
        }

        int allowed = 0;
        if (!toFetch.isEmpty() && apiKey != null && !apiKey.isBlank()) {
            allowed = reserveBudget(toFetch.size());
            if (allowed > 0) {
                List<QueryItem> batch = new ArrayList<>(toFetch.values()).subList(0, allowed);
                Map<String, P6Data> fresh = callOpenSanctions(batch);
                for (Map.Entry<String, P6Data> e : fresh.entrySet()) {
                    cacheService.set(e.getKey(), e.getValue(), Duration.ofDays(1),
                            (short) 6, "opensanctions_api", null);
                    resolved.put(e.getKey(), e.getValue());
                }
            }
        }
        // Leads beyond `allowed`, or skipped because the key wasn't fetched, stay
        // un-flagged (SKIP-safe) — we never block a lead we couldn't actually check.
        log.info("P6 batchCheck: checked {}/{} (cache+api), budget reserved {}",
                resolved.size(), leads.size(), allowed);

        for (LeadResult lead : leads) {
            P6Data data = resolved.get(buildKey(lead.getCompanyName(), lead.getCountry()));
            if (data != null && data.isSanctioned()) {
                lead.setSanctionHit(true);
                lead.setSanctionNote("LOẠI — khớp danh sách trừng phạt (" + data.getSanctionSource() + ")");
            }
        }
        return leads;
    }

    // ── Daily budget guard ─────────────────────────────────────────────

    private String budgetKey() {
        return "p6:budget:" + LocalDate.now();
    }

    /** Reserves up to {@code needed} queries against today's budget; returns how many were granted. */
    private int reserveBudget(int needed) {
        long before = cacheService.getCounter(budgetKey());
        long remaining = dailyBudget - before;
        if (remaining <= 0) return 0;
        int allowed = (int) Math.min(needed, remaining);
        cacheService.incrementCounter(budgetKey(), Duration.ofDays(1), allowed);
        return allowed;
    }

    /** Burns the budget for the rest of the day so subsequent calls SKIP immediately. */
    private void markBudgetExhausted() {
        cacheService.setCounter(budgetKey(), dailyBudget + 1L, Duration.ofDays(1));
    }

    // ── Core API call (one HTTP request for N queries) ─────────────────

    @SuppressWarnings("unchecked")
    private Map<String, P6Data> callOpenSanctions(List<QueryItem> items) {
        Map<String, P6Data> out = new HashMap<>();
        if (items.isEmpty()) return out;

        Map<String, Object> queries = new LinkedHashMap<>();
        for (int i = 0; i < items.size(); i++) {
            QueryItem it = items.get(i);
            Map<String, Object> props = new HashMap<>();
            props.put("name", List.of(it.name()));
            if (it.country() != null && !it.country().isBlank()) {
                props.put("country", List.of(it.country()));
            }
            queries.put("q" + i, Map.of("schema", "Company", "properties", props));
        }

        Map<String, Object> body = Map.of("queries", queries);
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.set("Authorization", "ApiKey " + apiKey);

        try {
            ResponseEntity<Map> resp = restTemplate.exchange(
                    OPENSANCTIONS_API_URL, HttpMethod.POST, new HttpEntity<>(body, headers), Map.class);

            Map<String, Object> responses = resp.getBody() == null ? null
                    : (Map<String, Object>) resp.getBody().get("responses");
            if (responses == null) {
                log.warn("P6: OpenSanctions response missing 'responses' field");
                return out;
            }
            for (int i = 0; i < items.size(); i++) {
                QueryItem it = items.get(i);
                out.put(it.key(), parseOne(it.name(), (Map<String, Object>) responses.get("q" + i)));
            }
        } catch (org.springframework.web.client.HttpClientErrorException e) {
            int status = e.getStatusCode().value();
            if (status == 401) {
                log.error("P6: OpenSanctions API key không hợp lệ");
            } else if (status == 429) {
                log.warn("P6: OpenSanctions rate limit (429) — đốt budget tới cuối ngày");
                markBudgetExhausted();
            } else {
                log.warn("P6: OpenSanctions HTTP {}: {}", status, e.getMessage());
            }
            // Return whatever parsed (nothing) → callers treat missing as SKIP-safe.
        } catch (Exception e) {
            log.warn("P6: OpenSanctions call failed: {}", e.getMessage());
        }
        return out;
    }

    @SuppressWarnings("unchecked")
    private P6Data parseOne(String companyName, Map<String, Object> q) {
        if (q == null) return notSanctioned(companyName, "No result for query");
        List<Map<String, Object>> results = (List<Map<String, Object>>) q.get("results");
        if (results == null || results.isEmpty()) {
            return notSanctioned(companyName, "No matches found");
        }
        for (Map<String, Object> r : results) {
            Double score = r.get("score") instanceof Number ? ((Number) r.get("score")).doubleValue() : null;

            // Honour OpenSanctions' own calibrated decision when present: `match`
            // is true only for confident hits. When the field is absent (older
            // API / test fixtures) fall back to the high raw-score threshold.
            Object matchObj = r.get("match");
            boolean matchFlagPresent = matchObj instanceof Boolean;
            boolean apiMatch = Boolean.TRUE.equals(matchObj);
            boolean scoreOk = score != null && score >= MATCH_THRESHOLD;
            boolean isHit = scoreOk && (!matchFlagPresent || apiMatch);

            if (isHit) {
                List<String> datasets = (List<String>) r.getOrDefault("datasets", List.of());
                String source = datasets.isEmpty() ? "unknown" : datasets.get(0);
                String matchedId = (String) r.getOrDefault("id", null);
                String matchedName = extractMatchedEntityName(r);

                log.warn("SANCTIONS HIT: '{}' — score={} source={} matchedEntity='{}' entityId={}",
                        companyName, score, source, matchedName, matchedId);

                return P6Data.builder()
                        .state(PillarData.DataState.FOUND)
                        .companyName(companyName)
                        .sanctioned(true)
                        .sanctionSource(source)
                        .matchedEntityName(matchedName)
                        .matchedEntityId(matchedId)
                        .matchScore(score)
                        .rawText(String.format("Sanction match score=%.3f | source=%s | matched='%s' | id=%s",
                                score, source, matchedName, matchedId))
                        .dataSource("opensanctions_api")
                        .fetchedAt(LocalDateTime.now())
                        .build();
            }
        }
        return notSanctioned(companyName, "No high-confidence match (best score below " + MATCH_THRESHOLD + ")");
    }

    // ── Helpers ────────────────────────────────────────────────────────

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

    private P6Data skip(String name, String reason) {
        return P6Data.builder()
                .state(PillarData.DataState.SKIP)
                .companyName(name)
                .errorMsg(reason)
                .sanctioned(false)
                .fetchedAt(LocalDateTime.now())
                .build();
    }

    @SuppressWarnings("unchecked")
    private String extractMatchedEntityName(Map<String, Object> result) {
        try {
            Map<String, Object> properties = (Map<String, Object>) result.get("properties");
            if (properties != null) {
                List<String> names = (List<String>) properties.get("name");
                if (names != null && !names.isEmpty()) return names.get(0);
            }
            Object caption = result.get("caption");
            return caption instanceof String ? (String) caption : null;
        } catch (Exception e) {
            return null;
        }
    }

    private String buildKey(String name, String country) {
        String n = name != null ? name.toLowerCase().trim().replaceAll("\\s+", "_") : "unknown";
        String c = country != null ? country.toLowerCase() : "xx";
        return "p6:" + n + ":" + c;
    }
}

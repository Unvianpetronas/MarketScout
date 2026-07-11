package com.example.backend.partners;

import com.example.backend.shared.model.crawler.LeadResult;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class TavilyClient {

    @Value("${app.tavily.api-key:}")
    private String apiKey;

    private final RestTemplate restTemplate;

    public List<LeadResult> searchLeads(String intent, String product, String market) {
        if (apiKey.isBlank()) {
            log.warn("Tavily API key not configured — returning empty leads");
            return List.of();
        }
        String query = buildQuery(intent, product, market);
        return search(query);
    }

    public List<String> searchText(String query, int maxResults) {
        if (apiKey.isBlank()) return List.of();
        try {
            Map<String, Object> body = Map.of(
                "api_key", apiKey,
                "query", query,
                "max_results", maxResults,
                "search_depth", "basic"
            );
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            ResponseEntity<Map> resp = restTemplate.exchange(
                "https://api.tavily.com/search",
                HttpMethod.POST,
                new HttpEntity<>(body, headers),
                Map.class
            );
            if (resp.getBody() == null) return List.of();
            @SuppressWarnings("unchecked")
            List<Map<String, Object>> results = (List<Map<String, Object>>) resp.getBody().get("results");
            if (results == null) return List.of();
            return results.stream()
                .map(r -> (String) r.getOrDefault("content", ""))
                .filter(s -> !s.isBlank())
                .toList();
        } catch (Exception e) {
            log.warn("Tavily text search failed for '{}': {}", query, e.getMessage());
            return List.of();
        }
    }

    /** Same search as {@link #searchText}, but returns result URLs instead of content snippets. */
    @SuppressWarnings("unchecked")
    public List<String> searchUrls(String query, int maxResults) {
        if (apiKey.isBlank()) return List.of();
        try {
            Map<String, Object> body = Map.of(
                "api_key", apiKey,
                "query", query,
                "max_results", maxResults,
                "search_depth", "basic"
            );
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            ResponseEntity<Map> resp = restTemplate.exchange(
                "https://api.tavily.com/search",
                HttpMethod.POST,
                new HttpEntity<>(body, headers),
                Map.class
            );
            if (resp.getBody() == null) return List.of();
            List<Map<String, Object>> results = (List<Map<String, Object>>) resp.getBody().get("results");
            if (results == null) return List.of();
            return results.stream()
                .map(r -> (String) r.getOrDefault("url", ""))
                .filter(s -> !s.isBlank())
                .toList();
        } catch (Exception e) {
            log.warn("Tavily URL search failed for '{}': {}", query, e.getMessage());
            return List.of();
        }
    }

    @SuppressWarnings("unchecked")
    private List<LeadResult> search(String query) {
        try {
            Map<String, Object> body = Map.of(
                "api_key", apiKey,
                "query", query,
                "max_results", 10,
                "search_depth", "advanced",
                "include_domains", List.of()
            );
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            ResponseEntity<Map> resp = restTemplate.exchange(
                "https://api.tavily.com/search",
                HttpMethod.POST,
                new HttpEntity<>(body, headers),
                Map.class
            );
            if (resp.getBody() == null) return List.of();
            List<Map<String, Object>> results = (List<Map<String, Object>>) resp.getBody().get("results");
            if (results == null) return List.of();
            List<LeadResult> leads = new ArrayList<>();
            for (Map<String, Object> r : results) {
                String url = (String) r.getOrDefault("url", "");
                String title = (String) r.getOrDefault("title", "");
                String content = (String) r.getOrDefault("content", "");
                if (title.isBlank()) continue;
                leads.add(LeadResult.builder()
                    .companyName(title)
                    .website(url)
                    .description(content.length() > 200 ? content.substring(0, 200) : content)
                    .source("Tavily")
                    .build());
            }
            log.info("Tavily returned {} results for query: {}", leads.size(), query);
            return leads;
        } catch (Exception e) {
            log.warn("Tavily search failed for '{}': {}", query, e.getMessage());
            return List.of();
        }
    }

    private String buildQuery(String intent, String product, String market) {
        if ("FIND_BUYER".equals(intent)) {
            return (product != null ? product : "") + " importer " + (market != null ? market : "") + " company B2B buyer";
        }
        return (product != null ? product : "") + " manufacturer exporter " + (market != null ? market : "") + " supplier";
    }
}

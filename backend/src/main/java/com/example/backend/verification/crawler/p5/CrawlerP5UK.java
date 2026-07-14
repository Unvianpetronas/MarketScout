package com.example.backend.verification.crawler.p5;

import com.example.backend.shared.cache.CacheService;
import com.example.backend.shared.model.crawler.P5Data;
import com.example.backend.shared.model.crawler.PillarData;
import com.example.backend.shared.model.input.CompanyInput;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * Pillar 5 (UK) — real, official data from Companies House (the UK's company
 * registrar). Free API, but every GB-registered company must by law file annual
 * accounts here, so unlike text-search-based P5, "overdue accounts" and
 * "dissolved/liquidation" status are actual filed facts, not inferred from
 * keyword matching.
 *
 * Field names verified against the live Companies House API spec (2026-07):
 * search-companies returns {items: [{company_number, title, company_status}]};
 * company profile returns {company_status, accounts: {next_accounts: {overdue},
 * last_accounts: {type, period_end_on}}}. accounts.overdue / last_accounts.made_up_to
 * are deprecated aliases kept as a fallback for older API responses.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class CrawlerP5UK {

    private static final String SEARCH_URL = "https://api.company-information.service.gov.uk/search/companies";
    private static final String PROFILE_URL = "https://api.company-information.service.gov.uk/company/";

    @Value("${app.p5-registry.uk-api-key:}")
    private String apiKey;

    @Value("${app.cache.p5-ttl-days:3}")
    private int ttlDays;

    private final RestTemplate restTemplate;
    private final CacheService cacheService;

    public P5Data fetch(CompanyInput input) {
        if (apiKey == null || apiKey.isBlank()) {
            log.warn("P5 UK: COMPANIES_HOUSE_API_KEY chưa cấu hình — bỏ qua, rơi về Tavily fallback");
            return skip(input, "Chưa cấu hình Companies House API key");
        }

        String key = "p5:uk:" + input.getName().toLowerCase().replaceAll("\\s+", "_");
        Optional<P5Data> cached = cacheService.get(key, P5Data.class);
        if (cached.isPresent()) {
            log.debug("P5 UK cache hit for {}", input.getName());
            return cached.get();
        }

        try {
            P5Data result = doFetch(input);
            if (result.isFound()) {
                cacheService.set(key, result, Duration.ofDays(ttlDays), (short) 5, "companies_house", "GB");
            }
            return result;
        } catch (Exception e) {
            log.warn("P5 UK (Companies House) fetch failed for {}: {}", input.getName(), e.getMessage());
            return skip(input, "Companies House error: " + e.getMessage());
        }
    }

    @SuppressWarnings("unchecked")
    private P5Data doFetch(CompanyInput input) {
        HttpHeaders headers = new HttpHeaders();
        headers.setBasicAuth(apiKey, ""); // Companies House: API key as Basic-Auth username, blank password

        String searchUrl = SEARCH_URL + "?q=" + URLEncoder.encode(input.getName(), StandardCharsets.UTF_8) + "&items_per_page=1";
        ResponseEntity<Map> searchResp = restTemplate.exchange(searchUrl, HttpMethod.GET, new HttpEntity<>(headers), Map.class);
        Map<String, Object> searchBody = searchResp.getBody();
        List<Map<String, Object>> items = searchBody != null ? (List<Map<String, Object>>) searchBody.get("items") : null;

        if (items == null || items.isEmpty()) {
            return notFound(input, "Không tìm thấy trên Companies House");
        }

        String companyNumber = (String) items.get(0).get("company_number");

        ResponseEntity<Map> profileResp = restTemplate.exchange(
            PROFILE_URL + companyNumber, HttpMethod.GET, new HttpEntity<>(headers), Map.class);
        Map<String, Object> profile = profileResp.getBody();
        if (profile == null) return notFound(input, "Companies House không trả về hồ sơ công ty");

        String companyStatus = (String) profile.get("company_status");
        Map<String, Object> accounts = (Map<String, Object>) profile.get("accounts");
        Map<String, Object> nextAccounts = accounts != null ? (Map<String, Object>) accounts.get("next_accounts") : null;
        Map<String, Object> lastAccounts = accounts != null ? (Map<String, Object>) accounts.get("last_accounts") : null;

        boolean accountsOverdue = nextAccounts != null && Boolean.TRUE.equals(nextAccounts.get("overdue"));
        if (!accountsOverdue && accounts != null) {
            accountsOverdue = Boolean.TRUE.equals(accounts.get("overdue")); // deprecated field, fallback
        }
        boolean hasFiledAccounts = lastAccounts != null
            && (lastAccounts.get("period_end_on") != null || lastAccounts.get("made_up_to") != null);
        String accountsType = lastAccounts != null ? (String) lastAccounts.get("type") : null;

        String taxComplianceStatus;
        if (companyStatus != null && (companyStatus.contains("dissolved") || companyStatus.contains("liquidation"))) {
            taxComplianceStatus = "DISSOLVING";
        } else if (accountsOverdue) {
            taxComplianceStatus = "PENALIZED";
        } else {
            taxComplianceStatus = "NORMAL";
        }

        String rawText = String.format(
            "Company: %s | CompanyNumber: %s | Status: %s | AccountsOverdue: %b | LastAccountsType: %s",
            input.getName(), companyNumber, companyStatus, accountsOverdue, accountsType);

        return P5Data.builder()
            .state(PillarData.DataState.FOUND)
            .companyName(input.getName())
            .taxComplianceStatus(taxComplianceStatus)
            .hasFinancialReport(hasFiledAccounts)
            .revenueTrend("UNKNOWN") // basic profile has no filed-figures — not fabricated
            .rawText(rawText)
            .dataSource("companies_house")
            .fetchedAt(LocalDateTime.now())
            .build();
    }

    private P5Data notFound(CompanyInput input, String reason) {
        return P5Data.builder().state(PillarData.DataState.NOT_FOUND).companyName(input.getName())
            .errorMsg(reason).fetchedAt(LocalDateTime.now()).build();
    }

    private P5Data skip(CompanyInput input, String reason) {
        return P5Data.builder().state(PillarData.DataState.SKIP).companyName(input.getName())
            .errorMsg(reason).fetchedAt(LocalDateTime.now()).build();
    }
}

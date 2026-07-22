package com.example.backend.partners;

import com.example.backend.verification.crawler.p1.CrawlerP1Router;
import com.example.backend.verification.crawler.p6.CrawlerP6;
import com.example.backend.shared.model.agent.AgentEvent;
import com.example.backend.shared.model.agent.IntentResult;
import com.example.backend.shared.model.crawler.LeadResult;
import com.example.backend.shared.model.crawler.P1Data;
import com.example.backend.shared.model.input.CompanyInput;
import com.example.backend.shared.cache.CacheService;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.util.List;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.function.Consumer;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class FindPartnersService {

    private final TavilyClient tavilyClient;
    private final LeadExtractor leadExtractor;
    private final CrawlerP1Router crawlerP1;
    private final CrawlerP6 crawlerP6;
    private final CacheService cacheService;
    private final ObjectMapper objectMapper;

    // Dedicated pool so up to maxSanctionCheck real registry lookups (masothue.vn
    // scrape / GLEIF) run in parallel instead of serially blocking the search.
    private final ExecutorService enrichPool = Executors.newFixedThreadPool(8, r -> {
        Thread t = new Thread(r, "leads-enrich-pool");
        t.setDaemon(true);
        return t;
    });

    @Value("${app.partners.max-sanction-check:8}")
    private int maxSanctionCheck;

    @Value("${app.partners.display-count:5}")
    private int displayCount;

    public List<LeadResult> findAndFilter(IntentResult intent, String sessionId,
                                           Consumer<String> sseCallback) {
        emit(sseCallback, AgentEvent.thinking("manager", "Đang phân tích yêu cầu của bạn..."));
        emit(sseCallback, AgentEvent.thinking("crawler",
            "Đang tìm " + (intent.getProduct() != null ? intent.getProduct() : "đối tác") +
            (intent.getMarket() != null ? " tại " + intent.getMarket() : "") + "..."));

        // Step 1: Tavily search — returns web PAGES (title/url/snippet), not companies
        List<LeadResult> rawResults = tavilyClient.searchLeads(intent.getIntent(), intent.getProduct(), intent.getMarket());
        log.info("Tavily returned {} raw results", rawResults.size());

        // Step 1b: Gemini extracts the real company names mentioned in those pages —
        // a "Top 10 importers" directory page becomes 10 real leads instead of one
        // lead named after the headline. Falls back to the raw title-based list if
        // extraction returns nothing (Gemini down / no companies found).
        emit(sseCallback, AgentEvent.thinking("manager", "Đang lọc ra các công ty thật từ kết quả tìm kiếm..."));
        List<LeadResult> extracted = leadExtractor.extract(rawResults, intent.getProduct(), intent.getMarket());
        List<LeadResult> leads;
        if (extracted.isEmpty()) {
            leads = rawResults;
            log.info("Lead extraction empty — falling back to {} raw title-based leads", rawResults.size());
        } else {
            leads = extracted;
            // Country: extractor only sets it when actually determinable; fill the
            // requested market as the search-scope default (same semantics as before).
            leads.forEach(l -> {
                if (l.getCountry() == null) l.setCountry(intent.getMarket());
            });
            log.info("Lead extraction produced {} real companies from {} raw results", leads.size(), rawResults.size());
        }

        // Step 2: only screen the top-N leads against sanctions — capping how many
        // OpenSanctions queries one search can ever cost. The cap is applied BEFORE
        // the check (not after) so we never burn budget on leads we won't show.
        List<LeadResult> candidates = leads.subList(0, Math.min(maxSanctionCheck, leads.size()));

        emit(sseCallback, AgentEvent.thinking("safety", "Đang kiểm tra danh sách trừng phạt OFAC/UN/EU..."));
        candidates = crawlerP6.batchCheck(candidates);
        log.info("P6 sanction-checked {}/{} leads (cap={})", candidates.size(), leads.size(), maxSanctionCheck);

        emit(sseCallback, AgentEvent.thinking("crawler", "Đang tra cứu mã số thuế/đăng ký kinh doanh..."));
        candidates = enrichWithTaxId(candidates);

        // Cache the screened candidates in Redis for the session. The final
        // user-facing summary is built by the caller (ChatService) so the chat
        // shows ONE clean result instead of a stack of step events.
        String key = "leads:" + sessionId;
        cacheService.setRedisOnly(key, candidates, Duration.ofHours(24));
        log.info("Cached {} candidates to Redis key {} (display cap={})", candidates.size(), key, displayCount);

        return candidates; // screened set (incl. sanctioned) for FE to show warnings
    }

    /** Top non-sanctioned leads to feature, capped by display-count. */
    public List<LeadResult> topClean(List<LeadResult> candidates) {
        return candidates.stream()
            .filter(l -> !l.isSanctionHit())
            .limit(displayCount)
            .collect(Collectors.toList());
    }

    /**
     * Real web search for the businesses a possibly-ambiguous name could refer to,
     * enriched with a real tax-ID lookup per candidate. Used by ChatService when
     * CompanyResolverService can't confidently pick one company from the name alone —
     * the chat then shows this as a pick-one list instead of asking follow-up questions.
     */
    public List<LeadResult> searchCandidatesByName(String name, String country) {
        List<LeadResult> leads = tavilyClient.searchCompanyByName(name, country);
        List<LeadResult> capped = leads.subList(0, Math.min(5, leads.size()));
        return enrichWithTaxId(capped);
    }

    /**
     * Real per-lead registry lookup (masothue.vn MST / GLEIF LEI via CrawlerP1Router)
     * — same source P1 uses for a full Deep Verify, just without persisting a
     * Report. Runs in parallel since it's a handful of real HTTP calls, not a
     * cheap in-memory step. A lookup miss just leaves taxId null — never guessed.
     */
    private List<LeadResult> enrichWithTaxId(List<LeadResult> candidates) {
        List<CompletableFuture<Void>> futures = candidates.stream()
            .map(lead -> CompletableFuture.runAsync(() -> {
                try {
                    CompanyInput input = CompanyInput.builder()
                        .companyName(lead.getCompanyName())
                        .website(lead.getWebsite())
                        .country(lead.getCountry())
                        .build();
                    P1Data p1 = crawlerP1.fetch(input);
                    if (p1.isFound() && p1.getRegistrationId() != null && !p1.getRegistrationId().isBlank()) {
                        lead.setTaxId(p1.getRegistrationId());
                    }
                } catch (Exception e) {
                    log.debug("Tax-ID enrichment failed for lead '{}': {}", lead.getCompanyName(), e.getMessage());
                }
            }, enrichPool))
            .toList();

        CompletableFuture.allOf(futures.toArray(new CompletableFuture[0])).join();
        return candidates;
    }

    private void emit(Consumer<String> callback, AgentEvent event) {
        if (callback == null) return;
        try {
            callback.accept(objectMapper.writeValueAsString(event));
        } catch (Exception e) {
            log.debug("SSE emit error: {}", e.getMessage());
        }
    }
}

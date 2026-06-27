package com.example.backend.partners;

import com.example.backend.verification.crawler.p6.CrawlerP6;
import com.example.backend.shared.model.agent.AgentEvent;
import com.example.backend.shared.model.agent.IntentResult;
import com.example.backend.shared.model.crawler.LeadResult;
import com.example.backend.shared.cache.CacheService;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.util.List;
import java.util.function.Consumer;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class FindPartnersService {

    private final TavilyClient tavilyClient;
    private final CrawlerP6 crawlerP6;
    private final CacheService cacheService;
    private final ObjectMapper objectMapper;

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

        // Step 1: Tavily search
        List<LeadResult> leads = tavilyClient.searchLeads(intent.getIntent(), intent.getProduct(), intent.getMarket());
        log.info("Tavily returned {} leads", leads.size());

        // Step 2: only screen the top-N leads against sanctions — capping how many
        // OpenSanctions queries one search can ever cost. The cap is applied BEFORE
        // the check (not after) so we never burn budget on leads we won't show.
        List<LeadResult> candidates = leads.subList(0, Math.min(maxSanctionCheck, leads.size()));

        emit(sseCallback, AgentEvent.thinking("safety", "Đang kiểm tra danh sách trừng phạt OFAC/UN/EU..."));
        candidates = crawlerP6.batchCheck(candidates);
        log.info("P6 sanction-checked {}/{} leads (cap={})", candidates.size(), leads.size(), maxSanctionCheck);

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

    private void emit(Consumer<String> callback, AgentEvent event) {
        if (callback == null) return;
        try {
            callback.accept(objectMapper.writeValueAsString(event));
        } catch (Exception e) {
            log.debug("SSE emit error: {}", e.getMessage());
        }
    }
}

package com.example.backend.partners;

import com.example.backend.verification.crawler.p6.CrawlerP6;
import com.example.backend.shared.model.agent.AgentEvent;
import com.example.backend.shared.model.agent.IntentResult;
import com.example.backend.shared.model.crawler.LeadResult;
import com.example.backend.shared.cache.CacheService;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
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

    public List<LeadResult> findAndFilter(IntentResult intent, String sessionId,
                                           Consumer<String> sseCallback) {
        emit(sseCallback, AgentEvent.thinking("manager", "Phân loại yêu cầu: " + intent.getIntent()));
        emit(sseCallback, AgentEvent.thinking("crawler",
            "Đang tìm " + (intent.getProduct() != null ? intent.getProduct() : "") +
            " tại " + (intent.getMarket() != null ? intent.getMarket() : "thị trường quốc tế") + "..."));

        // Step 1: Tavily search
        List<LeadResult> leads = tavilyClient.searchLeads(intent.getIntent(), intent.getProduct(), intent.getMarket());
        log.info("Tavily returned {} leads", leads.size());

        // Step 2: P6 sanctions filter (parallel)
        emit(sseCallback, AgentEvent.thinking("safety", "Kiểm tra danh sách trừng phạt OFAC/UN/EU..."));
        leads = crawlerP6.batchCheck(leads);

        // Take top 5 clean leads (sanctioned leads shown with warning)
        List<LeadResult> clean = leads.stream()
            .filter(l -> !l.isSanctionHit())
            .limit(5)
            .collect(Collectors.toList());

        // Step 3: Cache in Redis
        String key = "leads:" + sessionId;
        cacheService.setRedisOnly(key, leads, Duration.ofHours(24));
        log.info("Cached {} leads to Redis key {}", leads.size(), key);

        emit(sseCallback, AgentEvent.done("result",
            "Tìm thấy " + clean.size() + " đối tác tiềm năng", clean));

        return leads; // return all (including sanctioned) for FE to show warning
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

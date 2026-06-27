package com.example.backend.verification.crawler.p6;

import com.example.backend.shared.cache.CacheService;
import com.example.backend.shared.model.crawler.LeadResult;
import com.example.backend.shared.model.crawler.P6Data;
import com.example.backend.shared.model.crawler.PillarData;
import com.example.backend.shared.model.input.CompanyInput;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.client.RestTemplate;

import java.time.Duration;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class CrawlerP6Test {

    @Mock private RestTemplate restTemplate;
    @Mock private CacheService cacheService;

    private CrawlerP6 crawler;

    @BeforeEach
    void setUp() {
        crawler = new CrawlerP6(restTemplate, cacheService);
        ReflectionTestUtils.setField(crawler, "apiKey", "test-key");
        ReflectionTestUtils.setField(crawler, "dailyBudget", 45);
    }

    @Test
    void fetch_cacheHit_makesNoApiCallAndNoBudgetSpend() {
        P6Data cached = P6Data.builder().state(PillarData.DataState.FOUND).sanctioned(false).build();
        when(cacheService.get(anyString(), eq(P6Data.class))).thenReturn(Optional.of(cached));

        P6Data result = crawler.fetch(CompanyInput.builder().companyName("ACME Co").country("US").build());

        assertThat(result).isSameAs(cached);
        verifyNoInteractions(restTemplate);
        verify(cacheService, never()).getCounter(anyString());
    }

    @Test
    void fetch_budgetExhausted_skipsWithoutApiCall() {
        when(cacheService.get(anyString(), eq(P6Data.class))).thenReturn(Optional.empty());
        when(cacheService.getCounter(anyString())).thenReturn(45L); // budget already used up

        P6Data result = crawler.fetch(CompanyInput.builder().companyName("ACME Co").country("US").build());

        assertThat(result.getState()).isEqualTo(PillarData.DataState.SKIP);
        assertThat(result.isSanctioned()).isFalse();
        verifyNoInteractions(restTemplate);
        verify(cacheService, never()).set(anyString(), any(), any(), anyShort(), anyString(), any());
    }

    @Test
    @SuppressWarnings({"unchecked", "rawtypes"})
    void fetch_sanctionedMatch_cachesAndFlags() {
        when(cacheService.get(anyString(), eq(P6Data.class))).thenReturn(Optional.empty());
        when(cacheService.getCounter(anyString())).thenReturn(0L);
        when(restTemplate.exchange(anyString(), eq(HttpMethod.POST), any(), eq(Map.class)))
                .thenReturn((ResponseEntity) ResponseEntity.ok(matchBody("q0", 0.95)));

        P6Data result = crawler.fetch(CompanyInput.builder().companyName("Bad Corp").country("IR").build());

        assertThat(result.isSanctioned()).isTrue();
        assertThat(result.getSanctionSource()).isEqualTo("ofac_sdn");
        verify(cacheService).incrementCounter(anyString(), any(Duration.class), eq(1L));
        verify(cacheService).set(anyString(), eq(result), any(Duration.class), eq((short) 6), eq("opensanctions_api"), eq("IR"));
    }

    @Test
    @SuppressWarnings({"unchecked", "rawtypes"})
    void batchCheck_packsOneRequest_andFlagsSanctionedLead() {
        when(cacheService.get(anyString(), eq(P6Data.class))).thenReturn(Optional.empty());
        when(cacheService.getCounter(anyString())).thenReturn(0L);

        Map<String, Object> body = Map.of("responses", Map.of(
                "q0", Map.of("results", List.of()),                                  // clean
                "q1", Map.of("results", List.of(scoredResult(0.9)))                  // sanctioned
        ));
        when(restTemplate.exchange(anyString(), eq(HttpMethod.POST), any(), eq(Map.class)))
                .thenReturn((ResponseEntity) ResponseEntity.ok(body));

        LeadResult clean = LeadResult.builder().companyName("Good Co").country("US").build();
        LeadResult bad = LeadResult.builder().companyName("Bad Co").country("IR").build();

        List<LeadResult> out = crawler.batchCheck(List.of(clean, bad));

        assertThat(out.get(0).isSanctionHit()).isFalse();
        assertThat(out.get(1).isSanctionHit()).isTrue();
        // Exactly ONE HTTP request for both companies.
        verify(restTemplate, times(1)).exchange(anyString(), eq(HttpMethod.POST), any(), eq(Map.class));
        verify(cacheService).incrementCounter(anyString(), any(Duration.class), eq(2L));
    }

    // ── helpers ────────────────────────────────────────────────────────

    private Map<String, Object> matchBody(String qid, double score) {
        return Map.of("responses", Map.of(qid, Map.of("results", List.of(scoredResult(score)))));
    }

    private Map<String, Object> scoredResult(double score) {
        return Map.of(
                "score", score,
                "datasets", List.of("ofac_sdn"),
                "id", "NK-123",
                "caption", "Sanctioned Entity"
        );
    }
}

package com.example.backend.verification;

import com.example.backend.shared.gemini.GeminiService;
import com.example.backend.shared.model.crawler.P7Data;
import com.example.backend.shared.model.crawler.PillarData;
import com.example.backend.shared.model.scoring.FactJson;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;

/**
 * P7 deal parameters are structured USER input, not crawled text. This locks in
 * that they are taken straight from P7Data and can never be dropped/altered by the
 * fact-extraction LLM — even when Gemini returns p7 as all-null.
 */
@ExtendWith(MockitoExtension.class)
class FactExtractorP7Test {

    @Mock private GeminiService geminiService;
    private FactExtractor extractor;

    @BeforeEach
    void setUp() {
        extractor = new FactExtractor(geminiService, new ObjectMapper());
    }

    @Test
    void p7Facts_takenFromUserInput_notFromGemini() {
        // Gemini drops every p7 field (the exact bug: score ended up 0/FAIL).
        when(geminiService.callWithSystemPromptLowTemp(anyString(), anyString())).thenReturn(
            "{\"p7\":{\"deposit_percentage\":null,\"has_written_contract\":null," +
            "\"payment_method_safety\":null,\"deal_value_usd\":null}}");

        P7Data p7 = P7Data.builder()
            .state(PillarData.DataState.FOUND)
            .companyName("Apple Inc")
            .paymentMethodSafety("SAFE")
            .hasWrittenContract(true)
            .depositPercentage(30)
            .dealValueUsd(70000.0)
            .dataSource("user_input")
            .fetchedAt(LocalDateTime.now())
            .build();

        FactJson facts = extractor.extract(null, null, null, null, null, null, p7, null);

        assertThat(facts.getP7()).isNotNull();
        assertThat(facts.getP7().getPaymentMethodSafety()).isEqualTo("SAFE");
        assertThat(facts.getP7().getHasWrittenContract()).isTrue();
        assertThat(facts.getP7().getDepositPercentage()).isEqualTo(30);
        assertThat(facts.getP7().getDealValueUsd()).isEqualTo(70000.0);

        // And that scores a confident PASS (60 + 25 + 15 = 100).
        var score = new ScoringRubric().scoreP7(facts.getP7());
        assertThat(score.getScore()).isEqualTo(100);
        assertThat(score.getStatus()).isEqualTo("PASS");
    }
}

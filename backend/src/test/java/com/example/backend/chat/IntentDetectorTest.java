package com.example.backend.chat;

import com.example.backend.shared.gemini.GeminiService;
import com.example.backend.shared.model.agent.IntentResult;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class IntentDetectorTest {

    @Mock private GeminiService geminiService;

    private IntentDetector intentDetector;

    @BeforeEach
    void setUp() {
        intentDetector = new IntentDetector(geminiService, new ObjectMapper());
    }

    @Test
    void detect_parsesCompanyNamesArray_forCompare() {
        when(geminiService.callWithSystemPromptLowTemp(any(), any())).thenReturn("""
            {"intent": "COMPARE_PARTNERS",
             "params": {"companyName": null, "companyNames": ["Vinamilk", "TH True Milk"]},
             "reply": null}
            """);

        IntentResult result = intentDetector.detect("so sánh giúp mình Vinamilk và TH True Milk");

        assertThat(result.getIntent()).isEqualTo("COMPARE_PARTNERS");
        assertThat(result.getCompanyNames()).containsExactly("Vinamilk", "TH True Milk");
    }

    @Test
    void detect_companyNamesNull_staysNull() {
        when(geminiService.callWithSystemPromptLowTemp(any(), any())).thenReturn("""
            {"intent": "VERIFY_PARTNER", "params": {"companyName": "ABC Corp", "companyNames": null}, "reply": null}
            """);

        IntentResult result = intentDetector.detect("thẩm định ABC Corp");

        assertThat(result.getCompanyName()).isEqualTo("ABC Corp");
        assertThat(result.getCompanyNames()).isNull();
    }

    @Test
    void detect_geminiFails_fallbackStillRoutesCompare() {
        when(geminiService.callWithSystemPromptLowTemp(any(), any())).thenThrow(new RuntimeException("down"));

        IntentResult result = intentDetector.detect("so sánh A vs B");

        assertThat(result.getIntent()).isEqualTo("COMPARE_PARTNERS");
    }
}

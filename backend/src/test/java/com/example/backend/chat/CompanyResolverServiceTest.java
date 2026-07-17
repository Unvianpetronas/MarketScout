package com.example.backend.chat;

import com.example.backend.shared.cache.CacheService;
import com.example.backend.shared.gemini.GeminiService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.verifyNoInteractions;

@ExtendWith(MockitoExtension.class)
class CompanyResolverServiceTest {

    @Mock private GeminiService geminiService;
    @Mock private CacheService cacheService;

    private CompanyResolverService service;

    @BeforeEach
    void setUp() {
        service = new CompanyResolverService(geminiService, cacheService, new ObjectMapper());
    }

    @Test
    void resolve_bareTaxId_shortCircuitsAsUnambiguous_withoutCallingGemini() {
        CompanyResolutionResult r = service.resolve("0107781148", null);

        assertThat(r.isAmbiguous()).isFalse();
        assertThat(r.isVietnam()).isTrue();
        assertThat(r.getCountryIso2()).isEqualTo("VN");
        assertThat(r.getNormalizedName()).isEqualTo("0107781148");
        verifyNoInteractions(geminiService);
    }

    @Test
    void resolve_taxIdWithBranchSuffix_shortCircuits() {
        CompanyResolutionResult r = service.resolve("0107781148-001", null);

        assertThat(r.isAmbiguous()).isFalse();
        assertThat(r.getNormalizedName()).isEqualTo("0107781148-001");
        verifyNoInteractions(geminiService);
    }

    @Test
    void resolve_taxIdEmbeddedInSentence_doesNotShortCircuit() {
        // Not an exact match — must fall through to the normal Gemini path so a
        // phone number mentioned inside a longer message is never misread as an MST.
        service.resolve("Verify company \"0107781148\" in Vietnam. Run full check.", null);

        org.mockito.Mockito.verify(geminiService).callWithSystemPromptLowTemp(
            org.mockito.ArgumentMatchers.any(), org.mockito.ArgumentMatchers.any());
    }

    @Test
    void buildClarifyMessage_prefersAiQuestion() {
        CompanyResolutionResult r = CompanyResolutionResult.builder()
                .normalizedName("Công ty Hà Nam")
                .clarifyQuestion("Bạn cho mình xin tên đầy đủ hoặc mã số thuế của công ty nhé?")
                .build();

        assertThat(service.buildClarifyMessage(r))
                .isEqualTo("Bạn cho mình xin tên đầy đủ hoặc mã số thuế của công ty nhé?");
    }

    @Test
    void buildClarifyMessage_fallsBackToAlternatives() {
        CompanyResolutionResult r = CompanyResolutionResult.builder()
                .normalizedName("ABC")
                .clarifyQuestion("")
                .alternatives(List.of("ABC Group", "ABC Logistics"))
                .build();

        String msg = service.buildClarifyMessage(r);
        assertThat(msg).contains("ABC Group", "ABC Logistics");
    }

    @Test
    void buildClarifyMessage_fallsBackToAskingForInfo() {
        CompanyResolutionResult r = CompanyResolutionResult.builder()
                .normalizedName("XYZ")
                .clarifyQuestion(null)
                .alternatives(List.of())
                .build();

        String msg = service.buildClarifyMessage(r);
        assertThat(msg).contains("mã số thuế");
    }
}

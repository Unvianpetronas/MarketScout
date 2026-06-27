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

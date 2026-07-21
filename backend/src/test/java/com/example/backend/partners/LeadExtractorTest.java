package com.example.backend.partners;

import com.example.backend.shared.gemini.GeminiService;
import com.example.backend.shared.model.crawler.LeadResult;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class LeadExtractorTest {

    @Mock private GeminiService geminiService;

    private LeadExtractor leadExtractor;

    @BeforeEach
    void setUp() {
        leadExtractor = new LeadExtractor(geminiService, new ObjectMapper());
    }

    private LeadResult raw(String title, String url, String snippet) {
        return LeadResult.builder().companyName(title).website(url).description(snippet).source("Tavily").build();
    }

    // ── parseLeads ───────────────────────────────────────────────────────────

    @Test
    void parseLeads_extractsCompaniesFromJsonArray() {
        String json = """
            [{"companyName": "Marubeni Corporation", "website": "https://www.marubeni.com", "country": "JP", "evidence": "listed as major rice importer"},
             {"companyName": "Itochu Corp", "website": null, "country": "JP", "evidence": "trading house importing rice"}]
            """;

        List<LeadResult> leads = leadExtractor.parseLeads(json);

        assertThat(leads).hasSize(2);
        assertThat(leads.get(0).getCompanyName()).isEqualTo("Marubeni Corporation");
        assertThat(leads.get(0).getWebsite()).isEqualTo("https://www.marubeni.com");
        assertThat(leads.get(0).getCountry()).isEqualTo("JP");
        assertThat(leads.get(0).getSource()).isEqualTo("Tavily+AI");
        assertThat(leads.get(1).getWebsite()).isNull();
    }

    @Test
    void parseLeads_stripsMarkdownFence() {
        String json = "```json\n[{\"companyName\": \"ABC Ltd\"}]\n```";

        List<LeadResult> leads = leadExtractor.parseLeads(json);

        assertThat(leads).hasSize(1);
        assertThat(leads.get(0).getCompanyName()).isEqualTo("ABC Ltd");
    }

    @Test
    void parseLeads_skipsEntriesWithoutCompanyName_andNullStrings() {
        String json = """
            [{"companyName": null, "website": "https://x.com"},
             {"companyName": "null"},
             {"companyName": "Real Co", "website": "null", "country": ""}]
            """;

        List<LeadResult> leads = leadExtractor.parseLeads(json);

        assertThat(leads).hasSize(1);
        assertThat(leads.get(0).getCompanyName()).isEqualTo("Real Co");
        assertThat(leads.get(0).getWebsite()).isNull();
        assertThat(leads.get(0).getCountry()).isNull();
    }

    @Test
    void parseLeads_capsAtMaxLeads() {
        StringBuilder json = new StringBuilder("[");
        for (int i = 0; i < 20; i++) {
            if (i > 0) json.append(",");
            json.append("{\"companyName\": \"Co ").append(i).append("\"}");
        }
        json.append("]");

        List<LeadResult> leads = leadExtractor.parseLeads(json.toString());

        assertThat(leads).hasSize(LeadExtractor.MAX_LEADS);
    }

    @Test
    void parseLeads_garbageInput_returnsEmpty() {
        assertThat(leadExtractor.parseLeads("not json at all")).isEmpty();
        assertThat(leadExtractor.parseLeads(null)).isEmpty();
        assertThat(leadExtractor.parseLeads("{\"an\": \"object not array\"}")).isEmpty();
    }

    // ── extract ──────────────────────────────────────────────────────────────

    @Test
    void extract_emptyInput_skipsGeminiEntirely() {
        assertThat(leadExtractor.extract(List.of(), "gạo", "Nhật Bản")).isEmpty();
    }

    @Test
    void extract_geminiThrows_returnsEmptyForCallerFallback() {
        when(geminiService.callWithSystemPrompt(any(), any())).thenThrow(new RuntimeException("429"));

        List<LeadResult> leads = leadExtractor.extract(
            List.of(raw("Top 10 Rice Importers in Japan", "https://blog.example.com", "Marubeni, Itochu...")),
            "gạo", "Nhật Bản");

        assertThat(leads).isEmpty();
    }

    @Test
    void extract_passesProductMarketAndSnippetsToGemini() {
        when(geminiService.callWithSystemPrompt(any(), any())).thenAnswer(inv -> {
            String userPrompt = inv.getArgument(1);
            assertThat(userPrompt).contains("gạo").contains("Nhật Bản")
                .contains("Top 10 Rice Importers in Japan").contains("Marubeni, Itochu...");
            return "[{\"companyName\": \"Marubeni Corporation\"}]";
        });

        List<LeadResult> leads = leadExtractor.extract(
            List.of(raw("Top 10 Rice Importers in Japan", "https://blog.example.com", "Marubeni, Itochu...")),
            "gạo", "Nhật Bản");

        assertThat(leads).hasSize(1);
        assertThat(leads.get(0).getCompanyName()).isEqualTo("Marubeni Corporation");
    }
}

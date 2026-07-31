package com.example.backend.report;

import com.example.backend.domain.PillarResult;
import com.example.backend.domain.PillarResultRepository;
import com.example.backend.domain.Report;
import com.example.backend.domain.ReportRepository;
import com.example.backend.shared.gemini.GeminiService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;

/**
 * The recommendation quality problem was never the wording of the system prompt
 * — it was that buildPrompt starved the model of the case-specific facts (which
 * country's registry, what we already hold, how big the deal is). These tests
 * pin those facts into the prompt so they cannot be dropped again.
 */
@ExtendWith(MockitoExtension.class)
class ReportRecommendationServiceTest {

    @Mock private GeminiService geminiService;
    @Mock private ReportRepository reportRepository;
    @Mock private PillarResultRepository pillarResultRepository;

    private ReportRecommendationService service() {
        return new ReportRecommendationService(
            geminiService, new ObjectMapper(), reportRepository, pillarResultRepository);
    }

    private Report report() {
        Report r = new Report();
        r.setId(UUID.randomUUID());
        r.setEntityName("Công ty TNHH Xuất Nhập Khẩu Đông Á");
        r.setCountryIso2("VN");
        r.setTaxId("0312345678");
        r.setLei(null);
        r.setWebsite(null);
        r.setOverallScore((short) 52);
        r.setRiskLevel("Trung bình");
        r.setHardStop(false);
        r.setSelfReportDealValueUsd(new BigDecimal("250000"));
        r.setSelfReportHasWrittenContract(false);
        return r;
    }

    private PillarResult pillar(int no, String name, int score, String status) {
        PillarResult p = new PillarResult();
        p.setPillarNo((short) no);
        p.setPillarName(name);
        p.setScore((short) score);
        p.setStatus(status);
        return p;
    }

    @Test
    void generate_promptCarriesCountryIdentifiersAndDealContext() {
        PillarResult p1 = pillar(1, "Tính hợp pháp", 40, "WARN");
        p1.setFindings("Không tìm thấy giấy phép kinh doanh trên cổng đăng ký.");
        p1.setSourcesUsed("masothue.vn, dangkykinhdoanh.gov.vn");
        p1.setConfidence("MEDIUM");

        when(geminiService.callWithSystemPrompt(anyString(), anyString()))
            .thenReturn("{\"summary\":\"x\",\"actionItems\":[],\"infoToProvide\":[],\"infoToVerify\":[]}");

        service().generate(report(), List.of(p1), "vi");

        ArgumentCaptor<String> userPrompt = ArgumentCaptor.forClass(String.class);
        ArgumentCaptor<String> systemPrompt = ArgumentCaptor.forClass(String.class);
        org.mockito.Mockito.verify(geminiService)
            .callWithSystemPrompt(systemPrompt.capture(), userPrompt.capture());

        String prompt = userPrompt.getValue();
        assertThat(prompt).contains("QUỐC GIA: VN");
        assertThat(prompt).contains("mã số thuế = 0312345678");
        assertThat(prompt).contains("ĐỊNH DANH CÒN THIẾU: website, mã LEI");
        assertThat(prompt).contains("250000 USD");
        assertThat(prompt).contains("CHƯA có hợp đồng thành văn");
        assertThat(prompt).contains("độ tin cậy MEDIUM");
        assertThat(prompt).contains("Nguồn đã tra: masothue.vn, dangkykinhdoanh.gov.vn");

        // The rules that stop the model emitting the same generic checklist.
        assertThat(systemPrompt.getValue()).contains("QUY TẮC CÁ BIỆT HOÁ");
    }

    @Test
    void generate_reportWithoutDealContext_omitsTheDealSection() {
        Report r = report();
        r.setSelfReportDealValueUsd(null);
        r.setSelfReportHasWrittenContract(null);

        when(geminiService.callWithSystemPrompt(anyString(), anyString()))
            .thenReturn("{\"summary\":\"x\",\"actionItems\":[],\"infoToProvide\":[],\"infoToVerify\":[]}");

        service().generate(r, List.of(pillar(2, "Hiện diện số", 80, "PASS")), "vi");

        ArgumentCaptor<String> userPrompt = ArgumentCaptor.forClass(String.class);
        org.mockito.Mockito.verify(geminiService)
            .callWithSystemPrompt(anyString(), userPrompt.capture());
        assertThat(userPrompt.getValue()).doesNotContain("BỐI CẢNH GIAO DỊCH");
    }

    @Test
    void generate_geminiUnavailable_fallsBackToValidJson() throws Exception {
        when(geminiService.callWithSystemPrompt(anyString(), anyString()))
            .thenThrow(new RuntimeException("Gemini down"));

        String json = service().generate(report(), List.of(pillar(1, "Tính hợp pháp", 30, "FAIL")), "vi");

        var node = new ObjectMapper().readTree(json);
        assertThat(node.get("actionItems")).isNotEmpty();
        assertThat(node.get("infoToVerify")).isNotEmpty();
    }
}

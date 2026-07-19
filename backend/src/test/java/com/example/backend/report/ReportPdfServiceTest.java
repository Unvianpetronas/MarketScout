package com.example.backend.report;

import com.example.backend.domain.PillarResult;
import com.example.backend.domain.Report;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

class ReportPdfServiceTest {

    private final ReportPdfService service = new ReportPdfService(new ObjectMapper());

    @Test
    void generate_reportWithVietnameseTextAndPillars_producesNonEmptyPdf() {
        Report report = new Report();
        report.setId(UUID.randomUUID());
        report.setEntityName("Công ty TNHH Xuất Nhập Khẩu Đông Á");
        report.setCountryIso2("VN");
        report.setTaxId("0312345678");
        report.setOverallScore((short) 82);
        report.setRiskLevel("Thấp");
        report.setHardStop(false);
        report.setDealSafetyAnalysis(
            "{\"warningLabel\":\"CẦN CHÚ Ý\",\"recommendation\":\"Nên yêu cầu đặt cọc trước.\","
                + "\"requiredProtocols\":[\"Xác minh hợp đồng\",\"Kiểm tra L/C\"]}");
        report.setCreatedAt(Instant.now());

        PillarResult pillar = new PillarResult();
        pillar.setId(UUID.randomUUID());
        pillar.setPillarNo((short) 1);
        pillar.setPillarName("Tính hợp pháp");
        pillar.setScore((short) 90);
        pillar.setStatus("PASS");
        pillar.setEvidences("[{\"type\":\"PASS\",\"text\":\"Mã số thuế hợp lệ\",\"source\":\"masothue.vn\"}]");

        byte[] pdf = service.generate(report, List.of(pillar));

        assertThat(pdf).isNotEmpty();
        assertThat(new String(pdf, 0, 5, java.nio.charset.StandardCharsets.ISO_8859_1)).isEqualTo("%PDF-");
    }

    @Test
    void generate_reportWithNoPillarsOrDealSafety_stillProducesPdf() {
        Report report = new Report();
        report.setId(UUID.randomUUID());
        report.setEntityName("Empty Co");
        report.setHardStop(true);
        report.setCreatedAt(Instant.now());

        byte[] pdf = service.generate(report, List.of());

        assertThat(pdf).isNotEmpty();
    }
}

package com.example.backend.verification;

import com.example.backend.shared.model.scoring.ScoringResult;
import com.example.backend.domain.ReportRepository;
import com.example.backend.shared.gemini.GeminiService;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class DealSafetyAgent {

    private static final String SYSTEM_PROMPT = """
        Bạn là Deal Safety Agent của MarketScout AI.
        Nhiệm vụ: Phân tích rủi ro giao dịch dựa trên kết quả thẩm định 8 trụ cột.
        Tone: Thận trọng, nêu rõ worst case.
        KHÔNG bịa đặt — chỉ phân tích dựa trên dữ liệu được cung cấp.
        Trả lời bằng tiếng Việt.

        CHỈ trả về JSON thuần túy, KHÔNG markdown, KHÔNG code block, KHÔNG giải thích ngoài JSON.
        Schema bắt buộc:
        {
          "warningLabel": "một cụm ngắn 3-6 từ tóm tắt mức cảnh báo, ví dụ 'CẦN CHÚ Ý — Rủi ro cao' hoặc 'AN TOÀN — Rủi ro thấp'",
          "recommendation": "đoạn văn súc tích ≤200 từ: tóm tắt rủi ro + khuyến nghị Incoterm + khuyến nghị phương thức thanh toán",
          "requiredProtocols": ["danh sách 2-5 điều kiện/giao thức bắt buộc trước khi giao dịch, mỗi mục ngắn gọn"]
        }
        """;

    private final GeminiService geminiService;
    private final ReportRepository reportRepository;
    private final ObjectMapper objectMapper;

    @Async("scoringExecutor")
    public void analyzeAsync(UUID reportId, ScoringResult scoringResult) {
        try {
            String analysis = analyze(scoringResult);
            scoringResult.setDealSafetyAnalysis(analysis);
            reportRepository.findById(reportId).ifPresent(report -> {
                report.setDealSafetyAnalysis(analysis);
                reportRepository.save(report);
            });
            log.info("DealSafetyAgent completed for report {}", reportId);
        } catch (Exception e) {
            log.warn("DealSafetyAgent failed for report {}: {}", reportId, e.getMessage());
        }
    }

    public String analyze(ScoringResult result) {
        String prompt = buildPrompt(result);
        try {
            String raw = geminiService.callWithSystemPrompt(SYSTEM_PROMPT, prompt);
            return validateOrFallback(raw, result);
        } catch (Exception e) {
            log.warn("DealSafetyAgent Gemini call failed: {}", e.getMessage());
            return buildFallbackAnalysis(result);
        }
    }

    /** Ensures the model actually returned the {warningLabel, recommendation, requiredProtocols} shape. */
    private String validateOrFallback(String raw, ScoringResult result) {
        try {
            String json = extractJson(raw);
            var node = objectMapper.readTree(json);
            String warningLabel = node.path("warningLabel").asText(null);
            String recommendation = node.path("recommendation").asText(null);
            boolean hasProtocols = node.path("requiredProtocols").isArray();
            if (warningLabel == null || warningLabel.isBlank()
                    || recommendation == null || recommendation.isBlank() || !hasProtocols) {
                log.warn("DealSafetyAgent JSON missing required fields, using fallback. raw={}", raw);
                return buildFallbackAnalysis(result);
            }
            return json;
        } catch (Exception e) {
            log.warn("DealSafetyAgent returned invalid JSON, using fallback: {} — raw={}", e.getMessage(), raw);
            return buildFallbackAnalysis(result);
        }
    }

    private String extractJson(String raw) {
        if (raw == null) return "{}";
        String trimmed = raw.trim();
        int start = trimmed.indexOf('{');
        int end = trimmed.lastIndexOf('}');
        if (start >= 0 && end > start) return trimmed.substring(start, end + 1);
        return "{}";
    }

    private String buildPrompt(ScoringResult result) {
        StringBuilder sb = new StringBuilder();
        sb.append("CÔNG TY: ").append(result.getCompanyName()).append("\n");
        sb.append("ĐIỂM TỔNG: ").append(result.getOverallScore()).append("/100\n");
        sb.append("MỨC RỦI RO: ").append(result.getRiskLevel()).append("\n");
        if (result.isHardStop()) sb.append("CẢNH BÁO: HARD STOP — ").append(result.getHardStopReason()).append("\n");
        sb.append("\nKẾT QUẢ TỪNG TRỤ CỘT:\n");
        if (result.getPillars() != null) {
            for (var pillar : result.getPillars()) {
                sb.append(String.format("- P%d %s: %s (%s)\n",
                    pillar.getPillarNo(), pillar.getPillarName(),
                    pillar.getScore() != null ? pillar.getScore() + "/100" : "SKIP",
                    pillar.getStatus()));
            }
        }
        return sb.toString();
    }

    private String buildFallbackAnalysis(ScoringResult result) {
        String warningLabel;
        String recommendation;
        List<String> protocols;

        if (result.isHardStop()) {
            warningLabel = "DỪNG GIAO DỊCH — Nằm trong danh sách trừng phạt";
            recommendation = "Công ty nằm trong danh sách trừng phạt quốc tế. Không tiến hành bất kỳ giao dịch nào.";
            protocols = List.of("Không chuyển tiền dưới bất kỳ hình thức nào", "Báo cáo cho bộ phận tuân thủ nội bộ");
        } else if (result.getOverallScore() < 40) {
            warningLabel = "CẦN CHÚ Ý — Rủi ro cao";
            recommendation = "Rủi ro cao. Khuyến nghị dùng L/C (Letter of Credit), đặt cọc tối đa 20%, và yêu cầu hợp đồng thành văn có công chứng trước khi giao dịch.";
            protocols = List.of("Thanh toán qua L/C", "Đặt cọc ≤ 20%", "Hợp đồng thành văn có công chứng");
        } else if (result.getOverallScore() < 75) {
            warningLabel = "THẬN TRỌNG — Rủi ro trung bình";
            recommendation = "Rủi ro trung bình. Khuyến nghị T/T (30% trước giao hàng, 70% sau B/L), Incoterm CIF, và kiểm tra lại thông tin công ty trước khi ký hợp đồng.";
            protocols = List.of("T/T 30% trước / 70% sau B/L", "Incoterm CIF", "Xác minh lại thông tin công ty trước khi ký");
        } else {
            warningLabel = "AN TOÀN — Rủi ro thấp";
            recommendation = "Rủi ro thấp. T/T hoặc L/C tùy thỏa thuận, Incoterm FOB/CIF; vẫn nên yêu cầu hợp đồng đầy đủ điều khoản phạt vi phạm.";
            protocols = List.of("T/T hoặc L/C tùy thỏa thuận", "Incoterm FOB/CIF", "Hợp đồng có điều khoản phạt vi phạm");
        }

        try {
            return objectMapper.writeValueAsString(Map.of(
                "warningLabel", warningLabel,
                "recommendation", recommendation,
                "requiredProtocols", protocols));
        } catch (Exception e) {
            // Should never happen for a Map<String,Object> of plain strings/lists.
            return "{\"warningLabel\":\"" + warningLabel + "\",\"recommendation\":\"" + recommendation + "\",\"requiredProtocols\":[]}";
        }
    }
}

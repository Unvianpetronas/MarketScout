package com.example.backend.verification;

import com.example.backend.shared.model.scoring.ScoringResult;
import com.example.backend.domain.ReportRepository;
import com.example.backend.shared.gemini.GeminiService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

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
        Trả lời bằng tiếng Việt, súc tích ≤250 từ.
        Cấu trúc: 1) Tóm tắt rủi ro; 2) Khuyến nghị Incoterm; 3) Khuyến nghị thanh toán; 4) Điểm cần lưu ý.
        """;

    private final GeminiService geminiService;
    private final ReportRepository reportRepository;

    @Async("scoringExecutor")
    public void analyzeAsync(UUID reportId, ScoringResult scoringResult) {
        try {
            String analysis = analyze(scoringResult);
            scoringResult.setDealSafetyAnalysis(analysis);
            reportRepository.findById(reportId).ifPresent(report -> {
                report.setRawData(report.getRawData() != null
                    ? report.getRawData() + "\n\n[DEAL_SAFETY]\n" + analysis
                    : analysis);
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
            return geminiService.callWithSystemPrompt(SYSTEM_PROMPT, prompt);
        } catch (Exception e) {
            log.warn("DealSafetyAgent Gemini call failed: {}", e.getMessage());
            return buildFallbackAnalysis(result);
        }
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
        if (result.isHardStop()) {
            return "⚠️ DỪNG GIAO DỊCH: Công ty nằm trong danh sách trừng phạt quốc tế. Không tiến hành bất kỳ giao dịch nào.";
        }
        if (result.getOverallScore() < 40) {
            return "Rủi ro cao. Khuyến nghị: L/C (Letter of Credit) | Đặt cọc ≤20% | Yêu cầu hợp đồng thành văn có công chứng trước khi giao dịch.";
        }
        if (result.getOverallScore() < 75) {
            return "Rủi ro trung bình. Khuyến nghị: T/T (30% trước giao hàng, 70% sau B/L) | Incoterm CIF | Kiểm tra lại thông tin công ty trước khi ký hợp đồng.";
        }
        return "Rủi ro thấp. Khuyến nghị: T/T hoặc L/C tùy thỏa thuận | Incoterm FOB/CIF | Tiến hành thận trọng, yêu cầu hợp đồng đầy đủ điều khoản phạt vi phạm.";
    }
}

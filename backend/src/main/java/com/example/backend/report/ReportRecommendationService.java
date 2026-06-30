package com.example.backend.report;

import com.example.backend.domain.PillarResult;
import com.example.backend.domain.Report;
import com.example.backend.shared.gemini.GeminiService;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;

/**
 * Generates AI-driven, customer-facing next-step recommendations for a finished
 * report. Unlike the Deal Safety analysis (which focuses on payment/Incoterm
 * risk), this answers the practical questions a buyer asks after reading the
 * 8-pillar scores:
 *   - What should I do next?
 *   - What extra information should I ask the partner to provide?
 *   - What facts should I independently verify before transacting?
 *
 * Returns a strict JSON string the frontend renders into cards. Falls back to a
 * deterministic, pillar-driven set of recommendations if Gemini is unavailable,
 * so the section is never empty.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ReportRecommendationService {

    private static final String SYSTEM_PROMPT = """
        Bạn là Cố vấn Thẩm định của MarketScout AI.
        Nhiệm vụ: Dựa trên kết quả thẩm định 8 trụ cột của một đối tác thương mại,
        đưa ra khuyến nghị HÀNH ĐỘNG cụ thể, thực tế cho khách hàng (bên mua/bán)
        TRƯỚC khi giao dịch — KHÁC với phần Deal Safety (vốn tập trung vào
        Incoterm/phương thức thanh toán).

        Tập trung trả lời 3 câu hỏi:
        1. Khách hàng NÊN LÀM GÌ tiếp theo (các bước hành động).
        2. Cần YÊU CẦU ĐỐI TÁC CUNG CẤP THÊM tài liệu/thông tin gì.
        3. Cần TỰ XÁC MINH ĐỘC LẬP thông tin gì (và bằng cách nào).

        Quy tắc:
        - Ưu tiên các trụ cột có trạng thái FAIL/WARN hoặc điểm thấp.
        - KHÔNG bịa đặt; chỉ dựa trên dữ liệu được cung cấp.
        - Mỗi mục ngắn gọn, hành động được, bằng tiếng Việt.
        - CHỈ trả về JSON hợp lệ theo đúng schema sau, KHÔNG kèm giải thích,
          KHÔNG markdown, KHÔNG ```:
        {
          "summary": "1-2 câu tóm tắt nên ưu tiên xử lý điều gì",
          "actionItems": ["...", "..."],
          "infoToProvide": ["...", "..."],
          "infoToVerify": ["...", "..."]
        }
        Mỗi danh sách 2-5 mục.
        """;

    private final GeminiService geminiService;
    private final ObjectMapper objectMapper;

    /** Returns a JSON string matching the schema in {@link #SYSTEM_PROMPT}. */
    public String generate(Report report, List<PillarResult> pillars) {
        try {
            String raw = geminiService.callWithSystemPrompt(SYSTEM_PROMPT, buildPrompt(report, pillars));
            String json = stripCodeFence(raw);
            // Validate it parses; if not, fall through to the deterministic version.
            objectMapper.readTree(json);
            return json;
        } catch (Exception e) {
            log.warn("ReportRecommendationService Gemini call failed for report {}: {}",
                report.getId(), e.getMessage());
            return buildFallback(report, pillars);
        }
    }

    private String buildPrompt(Report report, List<PillarResult> pillars) {
        StringBuilder sb = new StringBuilder();
        sb.append("CÔNG TY: ").append(report.getEntityName()).append("\n");
        sb.append("ĐIỂM TỔNG: ").append(report.getOverallScore()).append("/100\n");
        sb.append("MỨC RỦI RO: ").append(report.getRiskLevel()).append("\n");
        if (Boolean.TRUE.equals(report.getHardStop())) sb.append("CẢNH BÁO: HARD STOP\n");
        sb.append("\nKẾT QUẢ TỪNG TRỤ CỘT:\n");
        if (pillars != null) {
            for (PillarResult p : pillars) {
                sb.append(String.format("- P%d %s: %s (%s)",
                    p.getPillarNo(), p.getPillarName(),
                    p.getScore() != null ? p.getScore() + "/100" : "N/A",
                    p.getStatus()));
                if (p.getFindings() != null && !p.getFindings().isBlank()) {
                    sb.append(" — ").append(p.getFindings());
                }
                sb.append("\n");
            }
        }
        return sb.toString();
    }

    /** Strip a leading/trailing ```json ... ``` fence Gemini sometimes adds. */
    private String stripCodeFence(String s) {
        if (s == null) return "{}";
        String t = s.trim();
        if (t.startsWith("```")) {
            int firstNl = t.indexOf('\n');
            if (firstNl >= 0) t = t.substring(firstNl + 1);
            if (t.endsWith("```")) t = t.substring(0, t.length() - 3);
        }
        return t.trim();
    }

    /** Deterministic recommendations derived purely from pillar statuses. */
    private String buildFallback(Report report, List<PillarResult> pillars) {
        List<String> actions = new ArrayList<>();
        List<String> provide = new ArrayList<>();
        List<String> verify = new ArrayList<>();

        boolean hardStop = Boolean.TRUE.equals(report.getHardStop());
        int score = report.getOverallScore() != null ? report.getOverallScore() : 0;

        if (hardStop) {
            actions.add("Tạm dừng mọi giao dịch cho đến khi xác minh xong vấn đề tuân thủ.");
        } else if (score < 40) {
            actions.add("Rủi ro cao — yêu cầu thẩm định pháp lý kỹ trước khi ký kết.");
        } else if (score < 75) {
            actions.add("Rủi ro trung bình — bổ sung bằng chứng còn thiếu trước khi giao dịch lớn.");
        } else {
            actions.add("Hồ sơ tương đối tốt — vẫn nên hoàn tất các bước kiểm tra cơ bản.");
        }

        if (pillars != null) {
            for (PillarResult p : pillars) {
                String st = p.getStatus() == null ? "" : p.getStatus().toUpperCase();
                boolean weak = st.equals("FAIL") || st.equals("WARN")
                    || (p.getScore() != null && p.getScore() < 60);
                if (!weak) continue;
                switch (p.getPillarNo()) {
                    case 1 -> verify.add("Xác minh giấy phép kinh doanh/đăng ký pháp nhân qua cơ quan đăng ký.");
                    case 2 -> { provide.add("Yêu cầu website chính thức và các kênh liên hệ doanh nghiệp.");
                                verify.add("Kiểm tra tên miền, email tên miền riêng và hiện diện mạng xã hội."); }
                    case 3 -> provide.add("Yêu cầu hồ sơ giao dịch/xuất nhập khẩu gần đây (vận đơn, hợp đồng mẫu).");
                    case 4 -> verify.add("Đối chiếu địa chỉ, tên và thông tin nhận dạng giữa các nguồn.");
                    case 5 -> provide.add("Yêu cầu báo cáo tài chính và mã số thuế để kiểm tra tình trạng thuế.");
                    case 6 -> verify.add("Rà soát lại danh sách trừng phạt/PEP với tên chính xác và bí danh.");
                    case 7 -> provide.add("Yêu cầu hợp đồng thành văn đầy đủ điều khoản trước khi đặt cọc.");
                    case 8 -> provide.add("Yêu cầu ảnh thực tế nhà máy/văn phòng hoặc tổ chức kiểm tra hiện trường.");
                    default -> { }
                }
            }
        }

        if (provide.isEmpty()) provide.add("Yêu cầu bộ hồ sơ pháp lý và liên hệ chính thức đầy đủ.");
        if (verify.isEmpty()) verify.add("Xác minh độc lập thông tin pháp nhân và địa chỉ từ nguồn chính thức.");
        actions.add("Lưu lại báo cáo này và quét lại định kỳ trước mỗi giao dịch lớn.");

        try {
            return objectMapper.writeValueAsString(new RecPayload(
                hardStop ? "Ưu tiên xử lý cảnh báo tuân thủ trước khi tiếp tục."
                         : "Ưu tiên bổ sung và xác minh các trụ cột có điểm thấp.",
                actions, provide, verify));
        } catch (Exception e) {
            return "{\"summary\":\"\",\"actionItems\":[],\"infoToProvide\":[],\"infoToVerify\":[]}";
        }
    }

    private record RecPayload(String summary, List<String> actionItems,
                             List<String> infoToProvide, List<String> infoToVerify) {}
}

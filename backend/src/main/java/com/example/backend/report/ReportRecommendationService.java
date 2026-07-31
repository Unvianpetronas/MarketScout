package com.example.backend.report;

import com.example.backend.domain.PillarResult;
import com.example.backend.domain.PillarResultRepository;
import com.example.backend.domain.Report;
import com.example.backend.domain.ReportRepository;
import com.example.backend.shared.gemini.GeminiService;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

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

    private static final String SYSTEM_PROMPT_VI = """
        Bạn là Cố vấn Thẩm định của MarketScout AI.
        Nhiệm vụ: Dựa trên kết quả thẩm định 8 trụ cột của một đối tác thương mại,
        đưa ra khuyến nghị HÀNH ĐỘNG cụ thể, thực tế cho khách hàng (bên mua/bán)
        TRƯỚC khi giao dịch — KHÁC với phần Deal Safety (vốn tập trung vào
        Incoterm/phương thức thanh toán).

        Tập trung trả lời 3 câu hỏi:
        1. Khách hàng NÊN LÀM GÌ tiếp theo (các bước hành động).
        2. Cần YÊU CẦU ĐỐI TÁC CUNG CẤP THÊM tài liệu/thông tin gì.
        3. Cần TỰ XÁC MINH ĐỘC LẬP thông tin gì (và bằng cách nào).

        QUY TẮC CÁ BIỆT HOÁ — quan trọng nhất, quyết định chất lượng đầu ra:
        - Mỗi mục PHẢI neo vào một dữ kiện có thật trong hồ sơ bên dưới: nhắc tên
          công ty, mã trụ cột (P1..P8), hoặc đúng phát hiện/thông tin còn thiếu đã
          nêu. Người đọc phải thấy đây là lời khuyên cho RIÊNG hồ sơ này, không
          phải một danh sách dùng được cho bất kỳ công ty nào.
        - Khi khuyên tra cứu, PHẢI gọi đúng tên cơ quan đăng ký / cổng tra cứu
          chính thức của nước ghi ở mục QUỐC GIA (ví dụ VN → Cổng thông tin quốc
          gia về đăng ký doanh nghiệp, tra cứu mã số thuế của Tổng cục Thuế;
          GB → Companies House; US → SEC EDGAR và Secretary of State của bang;
          SG → ACRA; KR → DART). TUYỆT ĐỐI KHÔNG viết chung chung kiểu "các cổng
          thông tin chính phủ" hay "cơ quan có thẩm quyền".
        - KHÔNG yêu cầu đối tác cung cấp thứ đã nằm trong mục ĐỊNH DANH ĐÃ CÓ.
        - CẤM câu rỗng nghĩa ("kiểm tra kỹ", "xác minh cẩn thận", "đảm bảo tính
          chính xác", "thu thập thêm thông tin") nếu không kèm ĐỐI TƯỢNG cụ thể
          và CÁCH LÀM cụ thể.
        - KHÔNG lấn sân Deal Safety: bỏ hẳn lời khuyên về Incoterm, phương thức
          thanh toán (L/C, T/T, escrow), tỷ lệ đặt cọc, an toàn tài khoản ngân
          hàng — báo cáo đã có mục riêng cho những thứ đó.
        - KHÔNG bịa; chỉ dùng dữ liệu được cung cấp. Thiếu dữ kiện thì trả ít mục,
          không độn thêm cho đủ số lượng.

        HIỆU CHỈNH THEO MỨC ĐỘ RỦI RO:
        - Trụ cột đã PASS: KHÔNG sinh khuyến nghị cho trụ cột đó.
        - Điểm tổng >= 75 và không có trụ cột FAIL: giọng nhẹ, 2 mục mỗi danh sách
          là đủ, chỉ nêu khâu còn thiếu. Không doạ rủi ro vô căn cứ.
        - Có trụ cột FAIL hoặc điểm tổng < 40: nêu rõ điều kiện tiên quyết bắt
          buộc xử lý xong TRƯỚC khi giao dịch.
        - Có BỐI CẢNH GIAO DỊCH: cân mức độ thẩm định cho tương xứng giá trị giao
          dịch — đừng bắt làm thẩm định nặng cho một đơn hàng nhỏ.

        ĐỊNH DẠNG:
        - Mỗi mục là 1 câu, mở đầu bằng động từ, tối đa 30 từ, bằng tiếng Việt.
        - Mỗi danh sách 2-5 mục, đúng bằng số vấn đề thực có.
        - CHỈ trả về JSON hợp lệ theo đúng schema sau, KHÔNG kèm giải thích,
          KHÔNG markdown, KHÔNG ```:
        {
          "summary": "1-2 câu nêu đúng việc cần ưu tiên nhất cho hồ sơ này",
          "actionItems": ["...", "..."],
          "infoToProvide": ["...", "..."],
          "infoToVerify": ["...", "..."]
        }
        """;

    private static final String SYSTEM_PROMPT_EN = """
        You are the Due Diligence Advisor for MarketScout AI.
        Task: Based on the 8-pillar verification results for a trade partner,
        give concrete, practical ACTION recommendations for the customer
        (buyer/seller) BEFORE transacting — DIFFERENT from the Deal Safety
        section (which focuses on Incoterm/payment method).

        Focus on answering 3 questions:
        1. What SHOULD the customer do next (action steps).
        2. What should be REQUESTED FROM THE PARTNER as additional documents/info.
        3. What should be INDEPENDENTLY VERIFIED (and how).

        SPECIFICITY RULES — the most important part; they decide output quality:
        - Every item MUST anchor to a real fact in the dossier below: name the
          company, the pillar code (P1..P8), or the exact finding/missing item
          reported. The reader must see advice written for THIS dossier, not a
          checklist that would fit any company.
        - When advising a lookup, name the actual registry / official portal of
          the country given under COUNTRY (e.g. VN → National Business
          Registration Portal and the General Department of Taxation tax-ID
          lookup; GB → Companies House; US → SEC EDGAR and the state Secretary
          of State; SG → ACRA; KR → DART). NEVER write vague phrases like
          "government portals" or "the competent authority".
        - DO NOT ask the partner for anything already listed under IDENTIFIERS
          ALREADY KNOWN.
        - BANNED empty phrasing ("check carefully", "verify thoroughly", "ensure
          accuracy", "gather more information") unless paired with a concrete
          OBJECT and a concrete METHOD.
        - DO NOT encroach on Deal Safety: drop all advice about Incoterms,
          payment method (L/C, T/T, escrow), deposit percentage, or bank-account
          safety — the report has a dedicated section for those.
        - DO NOT fabricate; use only the data provided. If facts are thin, return
          fewer items rather than padding the list.

        CALIBRATION BY RISK:
        - A pillar that PASSED: emit NO recommendation for it.
        - Overall >= 75 with no FAIL pillar: light tone, 2 items per list is
          enough, cover only what is genuinely missing. No unfounded alarm.
        - Any FAIL pillar or overall < 40: state the prerequisites that must be
          cleared BEFORE transacting.
        - If DEAL CONTEXT is present: scale the diligence to the deal value —
          do not demand heavy diligence for a small order.

        FORMAT:
        - Each item is one sentence, starts with a verb, max 30 words, in English.
        - Each list has 2-5 items, matching the number of real issues.
        - Return ONLY valid JSON matching the schema below, NO explanation,
          NO markdown, NO ```:
        {
          "summary": "1-2 sentences on the single highest priority for this dossier",
          "actionItems": ["...", "..."],
          "infoToProvide": ["...", "..."],
          "infoToVerify": ["...", "..."]
        }
        """;

    private final GeminiService geminiService;
    private final ObjectMapper objectMapper;
    private final ReportRepository reportRepository;
    private final PillarResultRepository pillarResultRepository;

    /**
     * Generate the recommendations ONCE and persist them on the report, off the
     * scoring thread. Called from the pipeline right after pillars are saved so
     * the recommendation reflects the exact final scores. Idempotent-ish: safe to
     * call again; it just overwrites with a fresh generation.
     */
    @Async("scoringExecutor")
    public void generateAndSaveAsync(UUID reportId) {
        try {
            Report report = reportRepository.findById(reportId).orElse(null);
            if (report == null) return;
            List<PillarResult> pillars = pillarResultRepository.findByReportIdOrderByPillarNoAsc(reportId);
            String language = reportRepository.findUserLanguageByReportId(reportId);
            String json = generate(report, pillars, language);
            report.setAiRecommendations(json);
            reportRepository.save(report);
            log.info("ReportRecommendationService persisted recommendations for report {}", reportId);
        } catch (Exception e) {
            log.warn("ReportRecommendationService generateAndSaveAsync failed for report {}: {}",
                reportId, e.getMessage());
        }
    }

    /** Returns a JSON string matching the schema in {@link #SYSTEM_PROMPT_VI}/{@link #SYSTEM_PROMPT_EN}. */
    public String generate(Report report, List<PillarResult> pillars, String language) {
        boolean en = "en".equalsIgnoreCase(language);
        try {
            String raw = geminiService.callWithSystemPrompt(
                en ? SYSTEM_PROMPT_EN : SYSTEM_PROMPT_VI, buildPrompt(report, pillars));
            String json = stripCodeFence(raw);
            // Validate it parses; if not, fall through to the deterministic version.
            objectMapper.readTree(json);
            return json;
        } catch (Exception e) {
            log.warn("ReportRecommendationService Gemini call failed for report {}: {}",
                report.getId(), e.getMessage());
            return buildFallback(report, pillars, en);
        }
    }

    private String buildPrompt(Report report, List<PillarResult> pillars) {
        StringBuilder sb = new StringBuilder();
        sb.append("CÔNG TY: ").append(report.getEntityName()).append("\n");
        // The country decides WHICH registry the advice should name; without it
        // the model can only fall back to "government portals" boilerplate.
        sb.append("QUỐC GIA: ").append(orDash(report.getCountryIso2())).append("\n");
        sb.append("ĐIỂM TỔNG: ").append(report.getOverallScore()).append("/100\n");
        sb.append("MỨC RỦI RO: ").append(report.getRiskLevel()).append("\n");
        if (Boolean.TRUE.equals(report.getHardStop())) sb.append("CẢNH BÁO: HARD STOP\n");

        appendIdentifiers(sb, report);
        appendDealContext(sb, report);

        sb.append("\nKẾT QUẢ TỪNG TRỤ CỘT:\n");
        if (pillars != null) {
            for (PillarResult p : pillars) {
                sb.append(String.format("- P%d %s: %s (%s%s)",
                    p.getPillarNo(), p.getPillarName(),
                    p.getScore() != null ? p.getScore() + "/100" : "N/A",
                    p.getStatus(),
                    p.getConfidence() != null && !p.getConfidence().isBlank()
                        ? ", độ tin cậy " + p.getConfidence() : ""));
                if (p.getFindings() != null && !p.getFindings().isBlank()) {
                    sb.append(" — ").append(p.getFindings());
                }
                // Which sources were already consulted, so "verify independently"
                // points somewhere new instead of repeating what we just did.
                if (p.getSourcesUsed() != null && !p.getSourcesUsed().isBlank()) {
                    sb.append("\n  Nguồn đã tra: ").append(truncate(p.getSourcesUsed(), 200));
                }
                sb.append("\n");
            }
        }
        return sb.toString();
    }

    /**
     * Splits the identifiers we already hold from the ones still missing, so the
     * model stops telling customers to collect a tax ID we printed on the report.
     */
    private void appendIdentifiers(StringBuilder sb, Report report) {
        List<String> known = new ArrayList<>();
        List<String> missing = new ArrayList<>();
        classify("website", report.getWebsite(), known, missing);
        classify("mã số thuế", report.getTaxId(), known, missing);
        classify("mã LEI", report.getLei(), known, missing);
        sb.append("\nĐỊNH DANH ĐÃ CÓ (KHÔNG yêu cầu đối tác cung cấp lại): ")
          .append(known.isEmpty() ? "chưa có gì" : String.join("; ", known)).append("\n");
        sb.append("ĐỊNH DANH CÒN THIẾU: ")
          .append(missing.isEmpty() ? "không thiếu" : String.join(", ", missing)).append("\n");
    }

    private void classify(String label, String value, List<String> known, List<String> missing) {
        if (value != null && !value.isBlank()) known.add(label + " = " + value);
        else missing.add(label);
    }

    /**
     * Self-reported deal facts. Advisory only — they never touch scoring, but
     * they let the advice scale to the size of the deal instead of prescribing
     * the same diligence for a $2k sample order and a $2m contract.
     */
    private void appendDealContext(StringBuilder sb, Report report) {
        List<String> parts = new ArrayList<>();
        if (report.getSelfReportDealValueUsd() != null) {
            parts.add("giá trị giao dịch khoảng " + report.getSelfReportDealValueUsd().toPlainString() + " USD");
        }
        if (report.getSelfReportHasWrittenContract() != null) {
            parts.add(Boolean.TRUE.equals(report.getSelfReportHasWrittenContract())
                ? "đã có hợp đồng thành văn" : "CHƯA có hợp đồng thành văn");
        }
        if (!parts.isEmpty()) {
            sb.append("\nBỐI CẢNH GIAO DỊCH (khách tự khai): ")
              .append(String.join("; ", parts)).append("\n");
        }
    }

    private String orDash(String s) {
        return s == null || s.isBlank() ? "—" : s;
    }

    private String truncate(String s, int max) {
        return s.length() <= max ? s : s.substring(0, max) + "…";
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
    private String buildFallback(Report report, List<PillarResult> pillars, boolean en) {
        List<String> actions = new ArrayList<>();
        List<String> provide = new ArrayList<>();
        List<String> verify = new ArrayList<>();

        boolean hardStop = Boolean.TRUE.equals(report.getHardStop());
        int score = report.getOverallScore() != null ? report.getOverallScore() : 0;

        if (hardStop) {
            actions.add(en ? "Pause all transactions until the compliance issue is verified."
                           : "Tạm dừng mọi giao dịch cho đến khi xác minh xong vấn đề tuân thủ.");
        } else if (score < 40) {
            actions.add(en ? "High risk — request thorough legal due diligence before signing."
                           : "Rủi ro cao — yêu cầu thẩm định pháp lý kỹ trước khi ký kết.");
        } else if (score < 75) {
            actions.add(en ? "Medium risk — gather missing evidence before a large transaction."
                           : "Rủi ro trung bình — bổ sung bằng chứng còn thiếu trước khi giao dịch lớn.");
        } else {
            actions.add(en ? "Relatively solid profile — still complete the basic checks."
                           : "Hồ sơ tương đối tốt — vẫn nên hoàn tất các bước kiểm tra cơ bản.");
        }

        if (pillars != null) {
            for (PillarResult p : pillars) {
                String st = p.getStatus() == null ? "" : p.getStatus().toUpperCase();
                boolean weak = st.equals("FAIL") || st.equals("WARN")
                    || (p.getScore() != null && p.getScore() < 60);
                if (!weak) continue;
                if (en) {
                    switch (p.getPillarNo()) {
                        case 1 -> verify.add("Verify the business license/legal registration with the registry authority.");
                        case 2 -> { provide.add("Request the official website and business contact channels.");
                                    verify.add("Check domain, domain-based email, and social media presence."); }
                        case 3 -> provide.add("Request recent trade/export-import records (bills of lading, sample contracts).");
                        case 4 -> verify.add("Cross-check address, name, and identifying info across sources.");
                        case 5 -> provide.add("Request financial statements and tax ID to check tax status.");
                        case 6 -> verify.add("Re-screen sanctions/PEP lists with the exact name and aliases.");
                        case 7 -> provide.add("Request a full written contract with all terms before any deposit.");
                        case 8 -> provide.add("Request real photos of the factory/office or arrange an on-site inspection.");
                        default -> { }
                    }
                } else {
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
        }

        if (provide.isEmpty()) provide.add(en
            ? "Request the full legal file and official contact details."
            : "Yêu cầu bộ hồ sơ pháp lý và liên hệ chính thức đầy đủ.");
        if (verify.isEmpty()) verify.add(en
            ? "Independently verify legal entity and address info from official sources."
            : "Xác minh độc lập thông tin pháp nhân và địa chỉ từ nguồn chính thức.");
        actions.add(en
            ? "Save this report and rescan periodically before any large transaction."
            : "Lưu lại báo cáo này và quét lại định kỳ trước mỗi giao dịch lớn.");

        try {
            return objectMapper.writeValueAsString(new RecPayload(
                hardStop
                    ? (en ? "Prioritize resolving the compliance warning before proceeding."
                          : "Ưu tiên xử lý cảnh báo tuân thủ trước khi tiếp tục.")
                    : (en ? "Prioritize filling in and verifying the low-scoring pillars."
                          : "Ưu tiên bổ sung và xác minh các trụ cột có điểm thấp."),
                actions, provide, verify));
        } catch (Exception e) {
            return "{\"summary\":\"\",\"actionItems\":[],\"infoToProvide\":[],\"infoToVerify\":[]}";
        }
    }

    private record RecPayload(String summary, List<String> actionItems,
                             List<String> infoToProvide, List<String> infoToVerify) {}
}

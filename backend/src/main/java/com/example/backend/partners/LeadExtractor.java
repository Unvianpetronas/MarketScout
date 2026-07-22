package com.example.backend.partners;

import com.example.backend.shared.gemini.GeminiService;
import com.example.backend.shared.model.crawler.LeadResult;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;

/**
 * Biến kết quả web search (trang web) thành danh sách CÔNG TY thật.
 *
 * Tavily trả về trang web, không phải công ty — title có thể là headline bài báo
 * ("Top 10 Rice Importers in Japan") chứ không phải tên doanh nghiệp. Bước Gemini
 * này đọc title + snippet của các trang và trích ra tên công ty thực sự xuất hiện
 * trong đó: một trang directory 10 công ty trở thành 10 lead thật thay vì 1 lead rác.
 *
 * Fail-safe: mọi lỗi (Gemini sập, JSON hỏng) trả về list rỗng — caller
 * (FindPartnersService) fallback về danh sách title thô như trước, không bao giờ
 * làm hỏng luồng tìm kiếm.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class LeadExtractor {

    /** Trần số lead trích ra mỗi lần tìm — giữ chi phí P6/P1 enrichment phía sau có giới hạn. */
    static final int MAX_LEADS = 10;

    private static final String SYSTEM_PROMPT = """
        Bạn là bộ trích xuất dữ liệu cho hệ thống tìm đối tác thương mại quốc tế.
        Input: danh sách kết quả web search (title, url, snippet) khi tìm buyer/supplier.
        Nhiệm vụ: trích ra danh sách CÔNG TY THẬT được nhắc đến trong các kết quả đó.

        Quy tắc:
        1. Chỉ lấy tên doanh nghiệp thực sự (nhà nhập khẩu, nhà phân phối, nhà sản xuất...).
           KHÔNG lấy: tiêu đề bài báo, tên trang directory/marketplace (Alibaba, ThomasNet...),
           hiệp hội ngành, cơ quan nhà nước, tên sản phẩm.
        2. Một trang liệt kê nhiều công ty → trích TỪNG công ty một.
        3. "website" chỉ điền khi đó là website CỦA CHÍNH công ty (suy ra từ url hoặc snippet);
           nếu url là trang báo/directory thì để null.
        4. "country" là mã ISO2 (VN, JP, US...) nếu xác định được từ ngữ cảnh; không chắc → null.
           KHÔNG mặc định theo thị trường được yêu cầu.
        5. "evidence" là 1 câu ngắn vì sao công ty này là ứng viên (trích từ snippet).
        6. Không bịa công ty không xuất hiện trong input. Không bịa website.
        7. Tối đa %d công ty, ưu tiên công ty khớp ngành hàng/thị trường nhất.
        8. CHỈ trả về JSON array thuần túy, không markdown, không giải thích:
        [{"companyName": "...", "website": "... hoặc null", "country": "... hoặc null", "evidence": "..."}]
        """.formatted(MAX_LEADS);

    private final GeminiService geminiService;
    private final ObjectMapper objectMapper;

    /**
     * @param rawResults kết quả Tavily thô (companyName = title trang, description = snippet)
     * @return danh sách công ty thật; RỖNG nếu Gemini lỗi/không trích được gì (caller tự fallback)
     */
    public List<LeadResult> extract(List<LeadResult> rawResults, String product, String market) {
        if (rawResults == null || rawResults.isEmpty()) return List.of();
        try {
            StringBuilder input = new StringBuilder();
            input.append("Đang tìm: ").append(product != null ? product : "đối tác");
            if (market != null && !market.isBlank()) input.append(" | Thị trường: ").append(market);
            input.append("\n\nKết quả web search:\n");
            for (int i = 0; i < rawResults.size(); i++) {
                LeadResult r = rawResults.get(i);
                input.append(i + 1).append(". title: ").append(r.getCompanyName())
                     .append("\n   url: ").append(r.getWebsite())
                     .append("\n   snippet: ").append(r.getDescription() != null ? r.getDescription() : "")
                     .append("\n");
            }

            String raw = geminiService.callWithSystemPrompt(SYSTEM_PROMPT, input.toString());
            return parseLeads(raw);
        } catch (Exception e) {
            log.warn("Lead extraction failed ({} raw results): {} — falling back to raw titles",
                rawResults.size(), e.getMessage());
            return List.of();
        }
    }

    /** Package-private để test parse độc lập với Gemini. */
    List<LeadResult> parseLeads(String raw) {
        try {
            JsonNode arr = objectMapper.readTree(extractJsonArray(raw));
            if (!arr.isArray()) return List.of();
            List<LeadResult> leads = new ArrayList<>();
            for (JsonNode n : arr) {
                String name = textOrNull(n, "companyName");
                if (name == null) continue;
                leads.add(LeadResult.builder()
                    .companyName(name)
                    .website(textOrNull(n, "website"))
                    .country(textOrNull(n, "country"))
                    .description(textOrNull(n, "evidence"))
                    .source("Tavily+AI")
                    .build());
                if (leads.size() >= MAX_LEADS) break;
            }
            return leads;
        } catch (Exception e) {
            log.warn("Lead extraction JSON parse failed: {} — raw={}", e.getMessage(),
                raw != null && raw.length() > 200 ? raw.substring(0, 200) : raw);
            return List.of();
        }
    }

    private String extractJsonArray(String raw) {
        if (raw == null) return "[]";
        int start = raw.indexOf('[');
        int end = raw.lastIndexOf(']');
        if (start >= 0 && end > start) return raw.substring(start, end + 1);
        return "[]";
    }

    private String textOrNull(JsonNode node, String field) {
        JsonNode v = node.path(field);
        if (v.isMissingNode() || v.isNull()) return null;
        String s = v.asText().trim();
        return s.isBlank() || "null".equalsIgnoreCase(s) ? null : s;
    }
}

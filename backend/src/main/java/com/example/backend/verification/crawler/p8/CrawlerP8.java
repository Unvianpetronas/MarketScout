package com.example.backend.verification.crawler.p8;

import com.example.backend.shared.model.crawler.P8Data;
import com.example.backend.shared.model.crawler.PillarData;
import com.example.backend.shared.model.input.CompanyInput;
import com.example.backend.shared.cache.CacheService;
import com.example.backend.partners.TavilyClient;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.Base64;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Slf4j
@Service
@RequiredArgsConstructor
public class CrawlerP8 {

    // ── Gemini Vision config ───────────────────────────────────────────
    private static final String GEMINI_URL_TEMPLATE =
            "https://generativelanguage.googleapis.com/v1beta/models/%s:generateContent";

    private static final String STOCK_IMAGE_PROMPT = """
        Nhìn vào ảnh này và trả lời CHỈ một trong hai: STOCK hoặc REAL.
        - STOCK: ảnh chụp chuyên nghiệp, mô hình giả, người mẫu, không gian văn phòng generic,
                 không có dấu hiệu nhận dạng công ty cụ thể.
        - REAL: ảnh thực tế của một cơ sở, nhà máy, văn phòng, logo, hoặc sản phẩm
                có vẻ thuộc về một công ty cụ thể.
        Chỉ trả về một từ: STOCK hoặc REAL. Không giải thích.
        """;

    @Value("${gemini.api.key}")
    private String geminiApiKey;

    @Value("${gemini.model:gemini-2.5-flash}")
    private String geminiModel;

    @Value("${app.cache.p8-ttl-days:7}")
    private int ttlDays;

    // ── Dependencies ──────────────────────────────────────────────────
    private final RestTemplate restTemplate;
    private final CacheService cacheService;
    private final TavilyClient tavilyClient;

    // ── Public entry point ────────────────────────────────────────────

    public P8Data fetch(CompanyInput input) {
        String domain = extractDomain(input.getWebsite());
        String key = "p8:" + (domain != null
                ? domain
                : input.getName().toLowerCase().replaceAll("\\s+", "_"));

        Optional<P8Data> cached = cacheService.get(key, P8Data.class);
        if (cached.isPresent()) {
            log.debug("P8 cache hit for {}", input.getName());
            return cached.get();
        }

        try {
            P8Data result = doFetch(input, domain);
            if (result.isFound()) {
                cacheService.set(key, result, Duration.ofDays(ttlDays),
                        (short) 8, "gemini_vision+tavily", input.getCountry());
            }
            return result;
        } catch (Exception e) {
            log.warn("P8 fetch failed for {}: {}", input.getName(), e.getMessage());
            return P8Data.builder()
                    .state(PillarData.DataState.SKIP)
                    .companyName(input.getName())
                    .errorMsg("P8 error: " + e.getMessage())
                    .fetchedAt(LocalDateTime.now())
                    .build();
        }
    }

    // ── Core logic ────────────────────────────────────────────────────

    private P8Data doFetch(CompanyInput input, String domain) {
        // Step 1: Tavily — physical evidence signals (không thay đổi so với trước)
        String tavilyQuery = input.getName() + " office photo warehouse factory building";
        List<String> tavilyResults = tavilyClient.searchText(tavilyQuery, 4);
        String combined = String.join(" ", tavilyResults).toLowerCase();

        boolean hasPhysicalEvidence = combined.contains("office")
                || combined.contains("factory")
                || combined.contains("warehouse")
                || combined.contains("facility")
                || combined.contains("nhà máy");

        boolean hasVerifiedLocation = combined.contains("address")
                || combined.contains("located")
                || combined.contains("headquarter")
                || combined.contains("trụ sở");

        String employeeRange = estimateEmployees(combined);

        // Step 2: Gemini Vision — detect stock image (thay TinEye)
        Boolean isStockImage = detectStockImageWithGemini(domain, input.getName());

        String rawText = String.format(
                "Company: %s | Domain: %s | HasPhysicalEvidence: %b | HasVerifiedLocation: %b"
                        + " | StockImage: %s | Employees: %s | Source: gemini_vision+tavily",
                input.getName(), domain, hasPhysicalEvidence, hasVerifiedLocation,
                isStockImage, employeeRange
        );

        return P8Data.builder()
                .state(PillarData.DataState.FOUND)
                .companyName(input.getName())
                .hasVerifiedLocation(hasVerifiedLocation)
                .isStockImageUsed(isStockImage)
                .hasPhysicalEvidence(hasPhysicalEvidence)
                .employeeCountRange(employeeRange)
                .rawText(rawText)
                .dataSource("gemini_vision+tavily")
                .fetchedAt(LocalDateTime.now())
                .build();
    }

    // ── Gemini Vision helpers ─────────────────────────────────────────

    /**
     * Tìm URL ảnh từ website công ty, fetch về base64, gửi Gemini Vision.
     *
     * Thứ tự thử:
     *   1. /logo.png, /logo.jpg, /logo.svg
     *   2. /og-image.png (Open Graph image — thường là ảnh đại diện công ty)
     *   3. /favicon.ico (fallback nhỏ nhất)
     *
     * Nếu không fetch được ảnh nào → trả về null (rubric tự bỏ qua).
     */
    private Boolean detectStockImageWithGemini(String domain, String companyName) {
        if (domain == null || domain.isBlank()) {
            log.debug("P8 Gemini Vision skipped — no domain for {}", companyName);
            return null;
        }

        String[] candidatePaths = {
                "https://" + domain + "/logo.png",
                "https://" + domain + "/logo.jpg",
                "https://" + domain + "/images/logo.png",
                "https://" + domain + "/og-image.png",
                "https://" + domain + "/favicon.ico"
        };

        for (String imageUrl : candidatePaths) {
            try {
                byte[] imageBytes = fetchImageBytes(imageUrl);
                if (imageBytes == null || imageBytes.length < 500) {
                    // Quá nhỏ — skip (favicon.ico 404 thường trả về HTML ~200 bytes)
                    continue;
                }

                String mimeType = guessMimeType(imageUrl);
                String base64 = Base64.getEncoder().encodeToString(imageBytes);

                Boolean result = callGeminiVision(base64, mimeType, companyName);
                if (result != null) {
                    log.info("P8 Gemini Vision result for {} ({}): isStock={}",
                            companyName, imageUrl, result);
                    return result;
                }
            } catch (Exception e) {
                log.debug("P8 image fetch failed for {}: {}", imageUrl, e.getMessage());
            }
        }

        log.debug("P8 Gemini Vision: no usable image found for {}", companyName);
        return null; // null → rubric bỏ qua, không ảnh hưởng score
    }

    /**
     * Fetch ảnh từ URL → raw bytes.
     * Trả về null nếu HTTP status không phải 2xx hoặc Content-Type không phải image/*.
     */
    private byte[] fetchImageBytes(String imageUrl) {
        try {
            HttpHeaders headers = new HttpHeaders();
            headers.set("User-Agent", "Mozilla/5.0 (compatible; MarketScoutBot/1.0)");
            headers.set("Accept", "image/*,*/*");

            ResponseEntity<byte[]> response = restTemplate.exchange(
                    imageUrl,
                    HttpMethod.GET,
                    new HttpEntity<>(headers),
                    byte[].class
            );

            if (!response.getStatusCode().is2xxSuccessful()) return null;

            // Kiểm tra Content-Type — tránh fetch HTML trá hình
            MediaType contentType = response.getHeaders().getContentType();
            if (contentType != null && contentType.toString().contains("text/html")) return null;

            return response.getBody();
        } catch (Exception e) {
            return null;
        }
    }

    /**
     * Gọi Gemini Vision API với ảnh base64.
     * Trả về:
     *   true  → STOCK image
     *   false → REAL image
     *   null  → Gemini không trả lời rõ ràng / lỗi
     */
    @SuppressWarnings("unchecked")
    private Boolean callGeminiVision(String base64Data, String mimeType, String companyName) {
        String url = String.format(GEMINI_URL_TEMPLATE, geminiModel) + "?key=" + geminiApiKey;

        Map<String, Object> imagePart = Map.of(
                "inline_data", Map.of(
                        "mime_type", mimeType,
                        "data", base64Data
                )
        );
        Map<String, Object> textPart = Map.of("text", STOCK_IMAGE_PROMPT);

        Map<String, Object> body = Map.of(
                "contents", List.of(
                        Map.of(
                                "role", "user",
                                "parts", List.of(imagePart, textPart)
                        )
                ),
                "generationConfig", Map.of(
                        "temperature", 0.0,
                        "maxOutputTokens", 10   // Chỉ cần "STOCK" hoặc "REAL"
                )
        );

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);

        try {
            ResponseEntity<Map> response = restTemplate.exchange(
                    url, HttpMethod.POST,
                    new HttpEntity<>(body, headers),
                    Map.class
            );

            if (response.getBody() == null) return null;

            List<Map<String, Object>> candidates =
                    (List<Map<String, Object>>) response.getBody().get("candidates");
            if (candidates == null || candidates.isEmpty()) return null;

            Map<String, Object> content = (Map<String, Object>) candidates.get(0).get("content");
            List<Map<String, Object>> parts = (List<Map<String, Object>>) content.get("parts");
            String answer = ((String) parts.get(0).get("text")).trim().toUpperCase();

            log.debug("Gemini Vision raw answer for {}: '{}'", companyName, answer);

            if (answer.contains("STOCK")) return true;
            if (answer.contains("REAL"))  return false;
            return null; // Gemini trả về gì đó khác → bỏ qua

        } catch (Exception e) {
            log.warn("Gemini Vision API call failed for {}: {}", companyName, e.getMessage());
            return null;
        }
    }

    // ── Utility helpers ───────────────────────────────────────────────

    private String guessMimeType(String url) {
        String lower = url.toLowerCase();
        if (lower.endsWith(".png"))  return "image/png";
        if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
        if (lower.endsWith(".gif"))  return "image/gif";
        if (lower.endsWith(".webp")) return "image/webp";
        if (lower.endsWith(".svg"))  return "image/svg+xml";
        return "image/png"; // default
    }

    private String estimateEmployees(String text) {
        if (text.contains("thousand") || text.contains("10,000") || text.contains("1000+")) return "LARGE";
        if (text.contains("hundred") || text.contains("500") || text.contains("employees")) return "MEDIUM";
        if (text.contains("small") || text.contains("startup") || text.contains("team")) return "SMALL";
        return "UNKNOWN";
    }

    private String extractDomain(String website) {
        if (website == null || website.isBlank()) return null;
        return website.replaceAll("https?://(www\\.)?", "").split("/")[0];
    }
}
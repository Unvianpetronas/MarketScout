package com.example.backend.verification.crawler.p1;

import com.example.backend.shared.model.crawler.P1Data;
import com.example.backend.shared.model.crawler.PillarData;
import com.example.backend.shared.model.input.CompanyInput;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.jsoup.nodes.Element;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Slf4j
@Service
@RequiredArgsConstructor
public class CrawlerP1VN {

    @Value("${app.vietqr.base-url:https://api.vietqr.io/v2}")
    private String vietqrUrl;

    private final RestTemplate restTemplate;

    @SuppressWarnings("unchecked")
    public P1Data fetchByMST(String taxId) {
        try {
            String url = vietqrUrl + "/business/" + taxId;
            ResponseEntity<Map> resp = restTemplate.getForEntity(url, Map.class);
            if (resp.getBody() == null || !"00".equals(String.valueOf(resp.getBody().get("code")))) {
                return skipP1(taxId, "VietQR không tìm thấy MST " + taxId, false);
            }
            Map<String, Object> data = (Map<String, Object>) resp.getBody().get("data");
            if (data == null) return skipP1(taxId, "VietQR trả về data null", false);

            String name = (String) data.getOrDefault("name", "");
            String address = (String) data.getOrDefault("address", "");
            String regDate = (String) data.getOrDefault("regDate", null);

            double ageYears = calcAgeYears(regDate);
            String nganhNghe = scrapeNganhNghe(taxId);

            String rawText = String.format(
                "Company: %s | MST: %s | Address: %s | RegDate: %s | Industry: %s",
                name, taxId, address, regDate, nganhNghe
            );

            return P1Data.builder()
                .state(PillarData.DataState.FOUND)
                .companyName(name)
                .registrationId(taxId)
                .registrationType("MST_VN")
                .status("ACTIVE")
                .address(address)
                .nganhNghe(nganhNghe)
                .ageYears(ageYears > 0 ? ageYears : null)
                .hasLegalRepresentative(null)
                .rawText(rawText)
                .dataSource("api.vietqr.io")
                .fetchedAt(LocalDateTime.now())
                .build();

        } catch (Exception e) {
            log.warn("VietQR fetch failed for MST {}: {}", taxId, e.getMessage());
            return skipP1(taxId, "VietQR error: " + e.getMessage(), true);
        }
    }

    public P1Data findMSTByName(String companyName) {
        try {
            String searchUrl = "https://masothue.vn/Search/?q=" + java.net.URLEncoder.encode(companyName, "UTF-8");
            Document doc = Jsoup.connect(searchUrl)
                .userAgent("Mozilla/5.0")
                .timeout(8000)
                .get();
            Element firstResult = doc.selectFirst("table.table-taxinfo td a");
            if (firstResult == null) {
                // Site phản hồi OK nhưng không có kết quả → đây là NOT_FOUND thật
                log.info("P1 masothue.vn: NOT_FOUND for '{}' (site OK, no results)", companyName);
                return skipP1(companyName, "Không tìm thấy MST cho \"" + companyName + "\" trên masothue.vn", false);
            }
            String href = firstResult.attr("href");
            Pattern p = Pattern.compile("/(\\d{10,13})-");
            Matcher m = p.matcher(href);
            if (!m.find()) {
                log.warn("P1 masothue.vn: could not parse MST from URL '{}' for '{}'", href, companyName);
                return skipP1(companyName, "Không parse được MST từ URL masothue.vn", false);
            }
            String mst = m.group(1);
            log.info("P1 masothue.vn: found MST {} for '{}'", mst, companyName);
            return fetchByMST(mst);

        } catch (org.jsoup.HttpStatusException e) {
            // HTTP 403 = bị block, 429 = rate-limit — đây là lỗi kỹ thuật, KHÔNG phải NOT_FOUND
            log.warn("P1 masothue.vn TECHNICAL_FAILURE (HTTP {}) for '{}': site chặn hoặc rate-limit",
                e.getStatusCode(), companyName);
            return skipP1(companyName,
                "masothue.vn HTTP " + e.getStatusCode() + " — site tạm không truy cập được (lỗi kỹ thuật, không phải không tồn tại)", true);

        } catch (java.net.SocketTimeoutException e) {
            log.warn("P1 masothue.vn TECHNICAL_FAILURE (TIMEOUT) for '{}': site không phản hồi trong 8s", companyName);
            return skipP1(companyName, "masothue.vn timeout sau 8s — thử lại sau (lỗi kỹ thuật)", true);

        } catch (java.io.IOException e) {
            log.warn("P1 masothue.vn TECHNICAL_FAILURE (IO: {}) for '{}': {}",
                e.getClass().getSimpleName(), companyName, e.getMessage());
            return skipP1(companyName, "masothue.vn lỗi kết nối: " + e.getMessage() + " (lỗi kỹ thuật)", true);

        } catch (Exception e) {
            log.warn("P1 masothue.vn TECHNICAL_FAILURE (unexpected: {}) for '{}': {}",
                e.getClass().getSimpleName(), companyName, e.getMessage());
            return skipP1(companyName, "masothue.vn lỗi không xác định: " + e.getMessage(), true);
        }
    }

    private String scrapeNganhNghe(String taxId) {
        try {
            String url = "https://masothue.vn/" + taxId;
            Document doc = Jsoup.connect(url).userAgent("Mozilla/5.0").timeout(5000).get();
            Element el = doc.selectFirst("span[itemprop=description]");
            return el != null ? el.text() : null;
        } catch (Exception e) {
            return null;
        }
    }

    private double calcAgeYears(String regDateStr) {
        if (regDateStr == null || regDateStr.isBlank()) return 0;
        try {
            DateTimeFormatter fmt = DateTimeFormatter.ofPattern("dd/MM/yyyy");
            LocalDate regDate = LocalDate.parse(regDateStr, fmt);
            long days = java.time.temporal.ChronoUnit.DAYS.between(regDate, LocalDate.now());
            return Math.round(days / 36.5) / 10.0;
        } catch (Exception e) {
            return 0;
        }
    }

    private P1Data skipP1(String name, String reason, boolean isSkip) {
        return P1Data.builder()
            .state(isSkip ? PillarData.DataState.SKIP : PillarData.DataState.NOT_FOUND)
            .companyName(name)
            .errorMsg(reason)
            .fetchedAt(LocalDateTime.now())
            .build();
    }
}

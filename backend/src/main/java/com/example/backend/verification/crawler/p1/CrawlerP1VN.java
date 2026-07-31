package com.example.backend.verification.crawler.p1;

import com.example.backend.partners.TavilyClient;
import com.example.backend.shared.model.crawler.P1Data;
import com.example.backend.shared.model.crawler.PillarData;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.text.Normalizer;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Arrays;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Slf4j
@Service
@RequiredArgsConstructor
public class CrawlerP1VN {

    /** MST embedded in a lookup-site URL slug, e.g. /0107781148-cong-ty-... */
    private static final Pattern MST_IN_URL = Pattern.compile("/(\\d{10}(?:\\d{3})?)(?:[-/]|$)");

    private static final Set<String> LEGAL_FORM_TOKENS = Set.of(
        "cong", "ty", "tnhh", "co", "phan", "cp", "mtv", "trach", "nhiem", "huu", "han", "tu", "nhan");

    @Value("${app.vietqr.base-url:https://api.vietqr.io/v2}")
    private String vietqrUrl;

    private final RestTemplate restTemplate;
    private final TavilyClient tavilyClient;

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
            // VietQR v2 currently returns only id/name/internationalName/shortName/
            // address/status — no registration date and no legal representative — so
            // ageYears and hasLegalRepresentative stay null for VN and the matching
            // rubric buckets can never fire. Kept as-is rather than guessed.
            String regDate = (String) data.getOrDefault("regDate", null);
            String rawStatus = (String) data.getOrDefault("status", null);

            double ageYears = calcAgeYears(regDate);

            // Status MUST be in rawText: FactExtractor reads P1 status out of
            // Gemini's reading of this string, so omitting it made every VN company
            // score "Trạng thái không xác định" no matter what the registry said.
            String rawText = String.format(
                "Company: %s | MST: %s | Status: %s | Address: %s | RegDate: %s",
                name, taxId, rawStatus, address, regDate
            );

            return P1Data.builder()
                .state(PillarData.DataState.FOUND)
                .companyName(name)
                .registrationId(taxId)
                .registrationType("MST_VN")
                .status(mapVietQrStatus(rawStatus))
                .address(address)
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

    /**
     * Resolves a company name to its MST, then loads the registry record.
     *
     * masothue.vn no longer resolves at all and masothue.com answers 403 to
     * server-side clients, so the MST cannot be scraped directly any more. Tavily
     * still indexes those pages and the MST sits in the URL slug
     * (masothue.com/0107781148-cong-ty-...), so the number is read out of the
     * search result and then confirmed against VietQR — the only VN registry
     * source still reachable.
     */
    public P1Data findMSTByName(String companyName) {
        List<String> urls = tavilyClient.searchUrls(companyName + " mã số thuế", 5);
        if (urls.isEmpty()) {
            log.warn("P1 VN TECHNICAL_FAILURE: Tavily returned nothing for '{}'", companyName);
            return skipP1(companyName,
                "Không tra được MST cho \"" + companyName + "\" — nguồn tìm kiếm không phản hồi (lỗi kỹ thuật)", true);
        }
        for (String url : urls) {
            Matcher m = MST_IN_URL.matcher(url);
            if (!m.find()) continue;
            String mst = m.group(1);
            P1Data candidate = fetchByMST(mst);
            // A search hit alone is not proof of identity — only accept the MST if
            // the registry name really is this company. Verifying the wrong company
            // is worse than returning "not found".
            if (candidate.isFound() && namesMatch(companyName, candidate.getCompanyName())) {
                log.info("P1 VN: resolved '{}' → MST {} via Tavily + VietQR", companyName, mst);
                return candidate;
            }
        }
        log.info("P1 VN: NOT_FOUND for '{}' (no search result whose MST matched the name)", companyName);
        return skipP1(companyName, "Không tìm thấy MST khớp với tên \"" + companyName + "\"", false);
    }

    /**
     * VietQR echoes the tax authority's Vietnamese status sentence rather than a
     * code. Negative markers are tested first because "NNT ngừng hoạt động nhưng
     * chưa hoàn thành thủ tục đóng MST" also contains the words "hoạt động".
     * Anything unrecognised stays null (unknown) — never assume ACTIVE, since a
     * partner wrongly reported as trading is the dangerous direction here.
     */
    private String mapVietQrStatus(String raw) {
        if (raw == null || raw.isBlank()) return null;
        String s = raw.toLowerCase(Locale.ROOT);
        if (s.contains("ngừng") || s.contains("đóng mst") || s.contains("đóng mã số thuế")
            || s.contains("không hoạt động") || s.contains("giải thể") || s.contains("phá sản")) {
            return "INACTIVE";
        }
        if (s.contains("đang hoạt động")) return "ACTIVE";
        return null;
    }

    /** Legal-form words carry no identity — two unrelated companies both start with
     *  "công ty TNHH", so the overlap must contain real name words too. */
    private boolean namesMatch(String requested, String registryName) {
        if (registryName == null) return false;
        String a = normalizeName(requested);
        String b = normalizeName(registryName);
        if (a.isBlank() || b.isBlank()) return false;
        if (!a.contains(b) && !b.contains(a)) return false;
        String shorter = a.length() <= b.length() ? a : b;
        long distinctive = Arrays.stream(shorter.split(" "))
            .filter(w -> w.length() > 1 && !LEGAL_FORM_TOKENS.contains(w))
            .count();
        return distinctive >= 2;
    }

    /** Lowercase, strip Vietnamese diacritics and punctuation, collapse spaces. */
    private String normalizeName(String s) {
        if (s == null) return "";
        return Normalizer.normalize(s, Normalizer.Form.NFD)
            .replaceAll("\\p{M}", "")
            .replace("đ", "d").replace("Đ", "D")
            .toLowerCase(Locale.ROOT)
            .replaceAll("[^a-z0-9]+", " ")
            .trim();
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

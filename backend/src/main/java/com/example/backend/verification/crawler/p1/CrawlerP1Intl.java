package com.example.backend.verification.crawler.p1;

import com.example.backend.shared.model.crawler.P1Data;
import com.example.backend.shared.model.crawler.PillarData;
import com.example.backend.shared.model.input.CompanyInput;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class CrawlerP1Intl {

    @Value("${app.gleif.base-url:https://api.gleif.org/api/v1}")
    private String gleifUrl;

    private final RestTemplate restTemplate;

    @SuppressWarnings("unchecked")
    public P1Data fetchByName(String companyName, String country) {
        try {
            String encoded = java.net.URLEncoder.encode(companyName, "UTF-8");
            String fuzzyUrl = gleifUrl + "/fuzzycompletions?field=entity.legalName&q=" + encoded;
            ResponseEntity<Map> fuzzyResp = restTemplate.getForEntity(fuzzyUrl, Map.class);
            if (fuzzyResp.getBody() == null) return notFound(companyName);

            List<Map<String, Object>> data = (List<Map<String, Object>>) fuzzyResp.getBody().get("data");
            if (data == null || data.isEmpty()) return notFound(companyName);

            String lei = null;
            for (Map<String, Object> item : data) {
                Map<String, Object> relationships = (Map<String, Object>) item.get("relationships");
                if (relationships != null) {
                    Map<String, Object> leiRec = (Map<String, Object>) relationships.get("lei-records");
                    if (leiRec != null) {
                        Map<String, Object> links = (Map<String, Object>) leiRec.get("links");
                        if (links != null) {
                            String related = (String) links.get("related");
                            if (related != null) {
                                lei = related.substring(related.lastIndexOf('/') + 1);
                                break;
                            }
                        }
                    }
                }
            }
            if (lei == null) return notFound(companyName);
            return fetchByLEI(lei, companyName);

        } catch (Exception e) {
            log.warn("GLEIF fuzzy search failed for {}: {}", companyName, e.getMessage());
            CompanyInput ci = CompanyInput.builder().companyName(companyName).build();
            return P1Data.builder().state(PillarData.DataState.SKIP).companyName(ci.getName()).errorMsg("GLEIF error: " + e.getMessage()).fetchedAt(java.time.LocalDateTime.now()).build();
        }
    }

    @SuppressWarnings("unchecked")
    public P1Data fetchByLEI(String lei, String companyName) {
        try {
            String leiUrl = gleifUrl + "/lei-records/" + lei;
            ResponseEntity<Map> resp = restTemplate.getForEntity(leiUrl, Map.class);
            if (resp.getBody() == null) return notFound(companyName);

            Map<String, Object> data = (Map<String, Object>) resp.getBody().get("data");
            if (data == null) return notFound(companyName);

            Map<String, Object> attrs = (Map<String, Object>) data.get("attributes");
            if (attrs == null) return notFound(companyName);

            Map<String, Object> entity = (Map<String, Object>) attrs.get("entity");
            Map<String, Object> registration = (Map<String, Object>) attrs.get("registration");

            String legalName = entity != null
                ? (String) ((Map<String, Object>) entity.getOrDefault("legalName", Map.of())).getOrDefault("name", companyName)
                : companyName;

            String regStatus = registration != null
                ? (String) registration.getOrDefault("status", "UNKNOWN")
                : "UNKNOWN";

            String initialRegDate = registration != null
                ? (String) registration.getOrDefault("initialRegistrationDate", null)
                : null;

            String address = buildAddress(entity);
            String legalForm = entity != null
                ? (String) ((Map<String, Object>) entity.getOrDefault("legalForm", Map.of())).getOrDefault("id", null)
                : null;

            double ageYears = calcAgeYears(initialRegDate);
            String status = "ACTIVE".equalsIgnoreCase(regStatus) || "ISSUED".equalsIgnoreCase(regStatus) ? "ACTIVE" : "INACTIVE";

            String rawText = String.format(
                "Company: %s | LEI: %s | Status: %s | RegDate: %s | Address: %s | LegalForm: %s",
                legalName, lei, status, initialRegDate, address, legalForm
            );

            return P1Data.builder()
                .state(PillarData.DataState.FOUND)
                .companyName(legalName)
                .registrationId(lei)
                .registrationType("LEI_INTL")
                .status(status)
                .address(address)
                .legalForm(legalForm)
                .ageYears(ageYears > 0 ? ageYears : null)
                .hasLegalRepresentative(null)
                .rawText(rawText)
                .dataSource("api.gleif.org")
                .fetchedAt(LocalDateTime.now())
                .build();

        } catch (Exception e) {
            log.warn("GLEIF LEI fetch failed for {}: {}", lei, e.getMessage());
            CompanyInput ci = CompanyInput.builder().companyName(companyName).build();
            return P1Data.builder().state(PillarData.DataState.SKIP).companyName(ci.getName()).errorMsg("GLEIF LEI error: " + e.getMessage()).fetchedAt(java.time.LocalDateTime.now()).build();
        }
    }

    @SuppressWarnings("unchecked")
    private String buildAddress(Map<String, Object> entity) {
        if (entity == null) return null;
        try {
            Map<String, Object> legalAddr = (Map<String, Object>) entity.get("legalAddress");
            if (legalAddr == null) return null;
            List<String> lines = (List<String>) legalAddr.getOrDefault("addressLines", List.of());
            String city = (String) legalAddr.getOrDefault("city", "");
            String country = (String) legalAddr.getOrDefault("country", "");
            return String.join(", ", lines) + (city.isBlank() ? "" : ", " + city) + (country.isBlank() ? "" : ", " + country);
        } catch (Exception e) {
            return null;
        }
    }

    private double calcAgeYears(String dateStr) {
        if (dateStr == null || dateStr.isBlank()) return 0;
        try {
            LocalDate date = LocalDate.parse(dateStr.substring(0, 10));
            long days = java.time.temporal.ChronoUnit.DAYS.between(date, LocalDate.now());
            return Math.round(days / 36.5) / 10.0;
        } catch (Exception e) {
            return 0;
        }
    }

    private P1Data notFound(String name) {
        CompanyInput ci = CompanyInput.builder().companyName(name).build();
        return P1Data.builder().state(PillarData.DataState.NOT_FOUND).companyName(ci.getName()).errorMsg("GLEIF không tìm thấy " + name).fetchedAt(java.time.LocalDateTime.now()).build();
    }
}

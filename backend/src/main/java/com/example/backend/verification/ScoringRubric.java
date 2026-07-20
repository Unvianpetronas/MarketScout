package com.example.backend.verification;

import com.example.backend.shared.model.scoring.Evidence;
import com.example.backend.shared.model.scoring.FactJson;
import com.example.backend.shared.model.scoring.PillarScore;
import lombok.Data;

import java.util.ArrayList;
import java.util.List;

@Data
public class ScoringRubric {

    // Weights per pillar (must sum to 1.0).
    // w7 (Deal Structure Risk) is deliberately small — it only scores real data
    // when a contract has been uploaded and cross-check-verified against the
    // company being assessed (see ContractP7Mapper); self-reported P7 data never
    // reaches this rubric at all. The 4 points freed up from w7's old 0.08 moved
    // to w1 (Entity Validation) rather than being spread thin across everything.
    private double w1 = 0.22, w2 = 0.10, w3 = 0.15, w4 = 0.12;
    private double w5 = 0.12, w6 = 0.18, w7 = 0.04, w8 = 0.07;

    private static boolean en(String language) { return "en".equalsIgnoreCase(language); }

    /** Human-viewable registry record for this company, so a user can click through and check. */
    private static String p1Url(FactJson.P1Facts f) {
        if (f.getRegistrationId() == null || f.getRegistrationId().isBlank()) return null;
        if ("MST_VN".equalsIgnoreCase(f.getRegistrationType())) return "https://masothue.vn/" + f.getRegistrationId();
        if ("LEI_INTL".equalsIgnoreCase(f.getRegistrationType())) return "https://search.gleif.org/#/record/" + f.getRegistrationId();
        return null;
    }

    // P1 — Entity Validation
    public PillarScore scoreP1(FactJson.P1Facts f) { return scoreP1(f, null); }

    public PillarScore scoreP1(FactJson.P1Facts f, String language) {
        boolean en = en(language);
        if (f == null) return skip(1, "Entity Validation", en ? "No data for P1" : "Không có dữ liệu P1");
        List<Evidence> ev = new ArrayList<>();
        int score = 0;
        String p1Url = p1Url(f);
        if ("ACTIVE".equalsIgnoreCase(f.getStatus())) {
            score += 50;
            ev.add(Evidence.builder().type("PASS").text(en ? "Business is active" : "Doanh nghiệp đang hoạt động").source("P1").url(p1Url).build());
        } else if ("INACTIVE".equalsIgnoreCase(f.getStatus())) {
            score += 5;
            ev.add(Evidence.builder().type("FAIL").text(en ? "Business has ceased operations" : "Doanh nghiệp đã ngừng hoạt động").source("P1").url(p1Url).build());
        } else {
            score += 20;
            ev.add(Evidence.builder().type("WARN").text(en ? "Status unknown" : "Trạng thái không xác định").source("P1").url(p1Url).build());
        }
        if (f.getAgeYears() != null && f.getAgeYears() > 2) {
            score += 25;
            ev.add(Evidence.builder().type("PASS").text(
                (en ? "Business has operated for " : "Doanh nghiệp đã hoạt động ")
                    + String.format("%.1f", f.getAgeYears()) + (en ? " years" : " năm")).source("P1").url(p1Url).build());
        } else if (f.getAgeYears() != null && f.getAgeYears() > 0.5) {
            score += 10;
            ev.add(Evidence.builder().type("WARN").text(en ? "Newly established business (< 2 years)" : "Doanh nghiệp mới thành lập < 2 năm").source("P1").url(p1Url).build());
        }
        if (Boolean.TRUE.equals(f.getHasLegalRepresentative())) {
            score += 15;
            ev.add(Evidence.builder().type("PASS").text(en ? "Verified legal representative on file" : "Có người đại diện pháp luật được xác minh").source("P1").url(p1Url).build());
        }
        if ("MATCH".equalsIgnoreCase(f.getIndustryMatch())) {
            score += 10;
            ev.add(Evidence.builder().type("PASS").text(en ? "Industry matches" : "Ngành nghề phù hợp").source("P1").url(p1Url).build());
        } else if ("PARTIAL".equalsIgnoreCase(f.getIndustryMatch())) {
            score += 5;
            ev.add(Evidence.builder().type("WARN").text(en ? "Industry partially matches" : "Ngành nghề khớp một phần").source("P1").url(p1Url).build());
        }
        return build(1, "Entity Validation", Math.min(100, score), ev, "vietqr.io / gleif.org",
            confidenceFor(f.getStatus(), f.getAgeYears(), f.getHasLegalRepresentative(), f.getIndustryMatch()));
    }

    // P2 — Digital Footprint
    public PillarScore scoreP2(FactJson.P2Facts f) { return scoreP2(f, null); }

    public PillarScore scoreP2(FactJson.P2Facts f, String language) {
        boolean en = en(language);
        if (f == null) return skip(2, "Digital Footprint", en ? "No data for P2" : "Không có dữ liệu P2");
        List<Evidence> ev = new ArrayList<>();
        int score = 0;
        String websiteUrl = f.getDomain() != null && !f.getDomain().isBlank() ? "https://" + f.getDomain() : null;
        String rdapUrl = f.getDomain() != null && !f.getDomain().isBlank() ? "https://rdap.org/domain/" + f.getDomain() : null;
        if (Boolean.TRUE.equals(f.getHasOfficialWebsite())) {
            score += 30;
            ev.add(Evidence.builder().type("PASS").text(en ? "Has an official website" : "Có website chính thức").source("P2").url(websiteUrl).build());
        } else {
            ev.add(Evidence.builder().type("FAIL").text(en ? "No official website" : "Không có website chính thức").source("P2").build());
        }
        if (f.getDomainAgeMonths() != null && f.getDomainAgeMonths() > 12) {
            score += 25;
            ev.add(Evidence.builder().type("PASS").text(
                en ? "Domain is " + f.getDomainAgeMonths() + " months old" : "Domain đã " + f.getDomainAgeMonths() + " tháng tuổi").source("RDAP").url(rdapUrl).build());
        } else if (f.getDomainAgeMonths() != null && f.getDomainAgeMonths() > 0) {
            score += 10;
            ev.add(Evidence.builder().type("WARN").text(en ? "New domain (< 12 months)" : "Domain mới (< 12 tháng)").source("RDAP").url(rdapUrl).build());
        }
        if (Boolean.TRUE.equals(f.getHasSsl())) {
            score += 15;
            ev.add(Evidence.builder().type("PASS").text(en ? "Website has an SSL certificate" : "Website có chứng chỉ SSL").source("P2").url(websiteUrl).build());
        }
        if (Boolean.FALSE.equals(f.getUsesFreeEmail())) {
            score += 15;
            ev.add(Evidence.builder().type("PASS").text(en ? "Uses a company email address" : "Sử dụng email doanh nghiệp").source("P2").url(websiteUrl).build());
        } else if (Boolean.TRUE.equals(f.getUsesFreeEmail())) {
            score -= 10;
            ev.add(Evidence.builder().type("WARN").text(en ? "Uses a free email provider (Gmail/Yahoo)" : "Sử dụng email miễn phí (Gmail/Yahoo)").source("P2").build());
        }
        if ("HIGH".equalsIgnoreCase(f.getSocialMediaScore())) {
            score += 15;
            ev.add(Evidence.builder().type("PASS").text(en ? "Strong social media presence" : "Hiện diện mạng xã hội cao").source("Tavily").build());
        } else if ("MEDIUM".equalsIgnoreCase(f.getSocialMediaScore())) {
            score += 8;
            ev.add(Evidence.builder().type("WARN").text(en ? "Moderate social media presence" : "Hiện diện mạng xã hội trung bình").source("Tavily").build());
        }
        // Informational only — not scored. Facebook content isn't indexable enough
        // for search to confirm which page (if any) is the company's real one, so
        // this is surfaced for a human to check, not treated as verified fact.
        if (f.getFacebookPages() != null && f.getFacebookPages().size() == 1) {
            ev.add(Evidence.builder().type("PASS")
                .text((en ? "Found a likely Facebook page: " : "Tìm thấy trang Facebook khả dĩ: ") + f.getFacebookPages().get(0))
                .source("Tavily").url(f.getFacebookPages().get(0)).build());
        } else if (f.getFacebookPages() != null && f.getFacebookPages().size() > 1) {
            ev.add(Evidence.builder().type("WARN")
                .text((en
                        ? "Found " + f.getFacebookPages().size() + " possible Facebook pages — manually verify the official one: "
                        : "Tìm thấy " + f.getFacebookPages().size() + " trang Facebook khả dĩ — cần xác minh thủ công trang chính thức: ")
                    + String.join(", ", f.getFacebookPages()))
                .source("Tavily").build());
        }
        return build(2, "Digital Footprint", Math.min(100, Math.max(0, score)), ev, "RDAP / Tavily",
            confidenceFor(f.getHasOfficialWebsite(), f.getDomainAgeMonths(), f.getHasSsl(), f.getUsesFreeEmail(), f.getSocialMediaScore()));
    }

    // P3 — Trade Activity
    public PillarScore scoreP3(FactJson.P3Facts f) { return scoreP3(f, null); }

    public PillarScore scoreP3(FactJson.P3Facts f, String language) {
        boolean en = en(language);
        if (f == null) return skip(3, "Trade Activity", en ? "No data for P3" : "Không có dữ liệu P3");
        List<Evidence> ev = new ArrayList<>();
        int score = 0;
        if (Boolean.TRUE.equals(f.getHasTradeHistory())) {
            score += 40;
            ev.add(Evidence.builder().type("PASS").text(en ? "Has international trade history" : "Có lịch sử giao thương quốc tế").source("P3").build());
        } else {
            ev.add(Evidence.builder().type("FAIL").text(en ? "No trade history found" : "Không tìm thấy lịch sử giao thương").source("P3").build());
        }
        if (f.getShipmentCountYear() != null && f.getShipmentCountYear() > 10) {
            score += 30;
            ev.add(Evidence.builder().type("PASS").text(f.getShipmentCountYear() + (en ? " shipments/year" : " lô hàng/năm")).source("P3").build());
        } else if (f.getShipmentCountYear() != null && f.getShipmentCountYear() > 3) {
            score += 15;
            ev.add(Evidence.builder().type("WARN").text(f.getShipmentCountYear() + (en ? " shipments/year (low)" : " lô hàng/năm (ít)")).source("P3").build());
        }
        if ("GROWING".equalsIgnoreCase(f.getTradeTrend())) {
            score += 20;
            ev.add(Evidence.builder().type("PASS").text(en ? "Growing trade trend" : "Xu hướng tăng trưởng thương mại").source("P3").build());
        } else if ("DECLINING".equalsIgnoreCase(f.getTradeTrend())) {
            score -= 10;
            ev.add(Evidence.builder().type("WARN").text(en ? "Declining trade trend" : "Xu hướng suy giảm thương mại").source("P3").build());
        }
        if (Boolean.TRUE.equals(f.getIsIndustryMatched())) {
            score += 10;
            ev.add(Evidence.builder().type("PASS").text(en ? "Industry matches" : "Đúng ngành nghề").source("P3").build());
        }
        return build(3, "Trade Activity", Math.min(100, Math.max(0, score)), ev, "VCCI / ImportYeti",
            confidenceFor(f.getHasTradeHistory(), f.getShipmentCountYear(), f.getTradeTrend(), f.getIsIndustryMatched()));
    }

    // P4 — Identity Consistency
    public PillarScore scoreP4(FactJson.P4Facts f) { return scoreP4(f, null); }

    public PillarScore scoreP4(FactJson.P4Facts f, String language) {
        boolean en = en(language);
        if (f == null) return skip(4, "Identity Consistency", en ? "No data for P4" : "Không có dữ liệu P4");
        List<Evidence> ev = new ArrayList<>();
        int score = 30; // base
        if ("COMPLETELY_MATCHED".equalsIgnoreCase(f.getIdentityMatchLevel())) {
            score = 80;
            ev.add(Evidence.builder().type("PASS").text(en ? "Identity info fully matches" : "Thông tin nhận dạng khớp hoàn toàn").source("Nominatim/OSM").build());
        } else if ("MINOR_MISMATCH".equalsIgnoreCase(f.getIdentityMatchLevel())) {
            score = 55;
            ev.add(Evidence.builder().type("WARN").text(en ? "Minor identity info mismatch" : "Có sự không khớp nhỏ về thông tin").source("Nominatim/OSM").build());
        } else if ("MAJOR_MISMATCH".equalsIgnoreCase(f.getIdentityMatchLevel())) {
            score = 15;
            ev.add(Evidence.builder().type("FAIL").text(en ? "Serious identity info mismatch" : "Sự không khớp nghiêm trọng về thông tin").source("Nominatim/OSM").build());
        }
        if (Boolean.TRUE.equals(f.getAddressVerified())) {
            score += 10;
            ev.add(Evidence.builder().type("PASS").text(en ? "Address verified" : "Địa chỉ được xác minh").source("Nominatim/OSM").build());
        }
        if (Boolean.TRUE.equals(f.getCeoVerified())) {
            score += 10;
            ev.add(Evidence.builder().type("PASS").text(en ? "Representative verified" : "Người đại diện được xác minh").source("Tavily").build());
        }
        return build(4, "Identity Consistency", Math.min(100, score), ev, "Nominatim/OSM / Tavily",
            confidenceFor(f.getIdentityMatchLevel(), f.getAddressVerified(), f.getCeoVerified()));
    }

    // P5 — Financial & Tax
    public PillarScore scoreP5(FactJson.P5Facts f) { return scoreP5(f, null); }

    public PillarScore scoreP5(FactJson.P5Facts f, String language) {
        boolean en = en(language);
        if (f == null) return skip(5, "Financial & Tax", en ? "No data for P5" : "Không có dữ liệu P5");
        List<Evidence> ev = new ArrayList<>();
        int score = 0;
        if ("NORMAL".equalsIgnoreCase(f.getTaxComplianceStatus())) {
            score += 50;
            ev.add(Evidence.builder().type("PASS").text(en ? "Normal tax compliance" : "Tuân thủ thuế bình thường").source("P5").build());
        } else if ("PENALIZED".equalsIgnoreCase(f.getTaxComplianceStatus())) {
            score += 10;
            ev.add(Evidence.builder().type("FAIL").text(en ? "Currently under tax penalty" : "Đang bị xử phạt thuế").source("P5").build());
        } else if ("DISSOLVING".equalsIgnoreCase(f.getTaxComplianceStatus())) {
            score += 2;
            ev.add(Evidence.builder().type("FAIL").text(en ? "Currently dissolving" : "Đang trong quá trình giải thể").source("P5").build());
        }
        if (f.getRegisteredCapitalUsd() != null && f.getRegisteredCapitalUsd() > 50000) {
            score += 25;
            ev.add(Evidence.builder().type("PASS").text((en ? "Registered capital: " : "Vốn điều lệ: ") + String.format("$%.0f", f.getRegisteredCapitalUsd())).source("P5").build());
        } else if (f.getRegisteredCapitalUsd() != null && f.getRegisteredCapitalUsd() > 10000) {
            score += 15;
            ev.add(Evidence.builder().type("WARN").text((en ? "Low registered capital: " : "Vốn điều lệ thấp: ") + String.format("$%.0f", f.getRegisteredCapitalUsd())).source("P5").build());
        }
        if (Boolean.TRUE.equals(f.getHasFinancialReport())) {
            score += 15;
            ev.add(Evidence.builder().type("PASS").text(en ? "Has a financial report on file" : "Có báo cáo tài chính").source("P5").build());
        }
        if ("GROWING".equalsIgnoreCase(f.getRevenueTrend())) {
            score += 10;
            ev.add(Evidence.builder().type("PASS").text(en ? "Revenue is growing" : "Doanh thu đang tăng trưởng").source("P5").build());
        }
        return build(5, "Financial & Tax", Math.min(100, score), ev, sourceLabelForP5(f.getDataSource(), en),
            confidenceFor(f.getTaxComplianceStatus(), f.getRegisteredCapitalUsd(), f.getHasFinancialReport(), f.getRevenueTrend()));
    }

    /** P5 routes to a different real source per country (see CrawlerP5Router) — label whichever one actually answered. */
    private String sourceLabelForP5(String dataSource, boolean en) {
        if (dataSource == null) return en ? "Unknown" : "Không xác định";
        return switch (dataSource) {
            case "dangkykinhdoanh" -> "dangkykinhdoanh.gov.vn";
            case "companies_house" -> "Companies House (UK)";
            case "sec_edgar" -> "SEC EDGAR (US)";
            case "tavily" -> en ? "Tavily (text search)" : "Tavily (tìm kiếm văn bản)";
            default -> dataSource;
        };
    }

    // P6 — Payment & Bank Sanctions
    public PillarScore scoreP6(FactJson.P6Facts f) {
        return scoreP6(f, null, null);
    }

    public PillarScore scoreP6(FactJson.P6Facts f, String skipReason) {
        return scoreP6(f, skipReason, null);
    }

    /**
     * @param skipReason why the crawler couldn't check (e.g. daily OpenSanctions
     *                   budget exhausted vs. API key missing) — surfaced on the
     *                   report so "we couldn't check" never reads like "all clear".
     */
    public PillarScore scoreP6(FactJson.P6Facts f, String skipReason, String language) {
        boolean en = en(language);
        if (f == null) {
            return skip(6, "Payment & Bank",
                skipReason != null && !skipReason.isBlank() ? skipReason : (en ? "No data for P6" : "Không có dữ liệu P6"));
        }
        List<Evidence> ev = new ArrayList<>();
        if (Boolean.TRUE.equals(f.getIsSanctionHit())) {
            String matchUrl = f.getMatchedEntityId() != null && !f.getMatchedEntityId().isBlank()
                ? "https://www.opensanctions.org/entities/" + f.getMatchedEntityId() + "/" : null;
            ev.add(Evidence.builder().type("FAIL").text(en ? "WARNING: Listed on an international sanctions list" : "CẢNH BÁO: Nằm trong danh sách trừng phạt quốc tế").source("OpenSanctions").url(matchUrl).build());
            return build(6, "Payment & Bank", 0, ev, "OpenSanctions", "HIGH");
        }
        int score = 60;
        ev.add(Evidence.builder().type("PASS").text(en ? "Not on any sanctions list" : "Không nằm trong danh sách trừng phạt").source("OpenSanctions").url("https://www.opensanctions.org/search/").build());
        if (Boolean.TRUE.equals(f.getBicVerified())) {
            score += 25;
            ev.add(Evidence.builder().type("PASS").text(en ? "BIC/SWIFT code verified" : "Mã BIC/SWIFT được xác minh").source("P6").build());
        }
        if ("CORPORATE".equalsIgnoreCase(f.getAccountType())) {
            score += 15;
            ev.add(Evidence.builder().type("PASS").text(en ? "Corporate account" : "Tài khoản doanh nghiệp").source("P6").build());
        } else if ("PERSONAL".equalsIgnoreCase(f.getAccountType())) {
            score -= 20;
            ev.add(Evidence.builder().type("WARN").text(en ? "WARNING: Personal account requested" : "CẢNH BÁO: Yêu cầu tài khoản cá nhân").source("P6").build());
        }
        if (Boolean.TRUE.equals(f.getIsPersonalAccountRequested())) {
            score -= 20;
            ev.add(Evidence.builder().type("WARN").text(en ? "Payment requested to a personal account" : "Yêu cầu thanh toán vào tài khoản cá nhân").source("P6").build());
        }
        return build(6, "Payment & Bank", Math.min(100, Math.max(0, score)), ev, "OpenSanctions",
            confidenceFor(f.getBicVerified(), f.getAccountType(), f.getIsPersonalAccountRequested()));
    }

    // P7 — Deal Structure Risk
    public PillarScore scoreP7(FactJson.P7Facts f) { return scoreP7(f, null); }

    public PillarScore scoreP7(FactJson.P7Facts f, String language) {
        boolean en = en(language);
        if (f == null) return skip(7, "Deal Structure Risk", en ? "No transaction info yet" : "Chưa có thông tin giao dịch");
        List<Evidence> ev = new ArrayList<>();
        int score = 0;
        if ("SAFE".equalsIgnoreCase(f.getPaymentMethodSafety())) {
            score += 60;
            ev.add(Evidence.builder().type("PASS").text(en ? "Safe payment method" : "Phương thức thanh toán an toàn").source("P7").build());
        } else if ("MODERATE".equalsIgnoreCase(f.getPaymentMethodSafety())) {
            score += 40;
            ev.add(Evidence.builder().type("WARN").text(en ? "Moderate payment method" : "Phương thức thanh toán trung bình").source("P7").build());
        } else if ("RISKY".equalsIgnoreCase(f.getPaymentMethodSafety())) {
            score += 15;
            ev.add(Evidence.builder().type("FAIL").text(en ? "High-risk payment method" : "Phương thức thanh toán rủi ro cao").source("P7").build());
        }
        if (Boolean.TRUE.equals(f.getHasWrittenContract())) {
            score += 25;
            ev.add(Evidence.builder().type("PASS").text(en ? "Has a written contract" : "Có hợp đồng thành văn").source("P7").build());
        } else {
            ev.add(Evidence.builder().type("WARN").text(en ? "No written contract yet" : "Chưa có hợp đồng thành văn").source("P7").build());
        }
        if (f.getDepositPercentage() != null && f.getDepositPercentage() <= 30) {
            score += 15;
            ev.add(Evidence.builder().type("PASS").text((en ? "Reasonable deposit (" : "Đặt cọc hợp lý (") + f.getDepositPercentage() + "%)").source("P7").build());
        } else if (f.getDepositPercentage() != null && f.getDepositPercentage() > 50) {
            score -= 10;
            ev.add(Evidence.builder().type("WARN").text((en ? "High deposit (" : "Đặt cọc cao (") + f.getDepositPercentage() + "%)").source("P7").build());
        }
        return build(7, "Deal Structure Risk", Math.min(100, Math.max(0, score)), ev, "Gemini Deal Safety",
            confidenceFor(f.getPaymentMethodSafety(), f.getHasWrittenContract(), f.getDepositPercentage()));
    }

    // P8 — Operational Proof
    public PillarScore scoreP8(FactJson.P8Facts f) { return scoreP8(f, null); }

    public PillarScore scoreP8(FactJson.P8Facts f, String language) {
        boolean en = en(language);
        if (f == null) return skip(8, "Operational Proof", en ? "No data for P8" : "Không có dữ liệu P8");
        List<Evidence> ev = new ArrayList<>();
        int score = 0;
        if (Boolean.TRUE.equals(f.getHasVerifiedLocation())) {
            score += 40;
            ev.add(Evidence.builder().type("PASS").text(en ? "Location verified" : "Địa điểm được xác minh").source("P8").build());
        } else {
            ev.add(Evidence.builder().type("FAIL").text(en ? "Could not verify a real-world location" : "Không xác minh được địa điểm thực tế").source("P8").build());
        }
        if (Boolean.FALSE.equals(f.getIsStockImageUsed())) {
            score += 30;
            ev.add(Evidence.builder().type("PASS").text(en ? "Real photo (not a stock image)" : "Ảnh thực tế (không phải ảnh stock)").source("Gemini Vision").build());
        } else if (Boolean.TRUE.equals(f.getIsStockImageUsed())) {
            score -= 10;
            ev.add(Evidence.builder().type("WARN").text(en ? "WARNING: Stock image used" : "CẢNH BÁO: Sử dụng ảnh stock").source("Gemini Vision").build());
        }
        if (Boolean.TRUE.equals(f.getHasPhysicalEvidence())) {
            score += 30;
            ev.add(Evidence.builder().type("PASS").text(en ? "Has physical evidence (factory/office photos)" : "Có bằng chứng vật lý (ảnh nhà máy/văn phòng)").source("P8").build());
        }
        if ("MEDIUM".equalsIgnoreCase(f.getEmployeeCountRange()) || "LARGE".equalsIgnoreCase(f.getEmployeeCountRange())) {
            score += 10;
            ev.add(Evidence.builder().type("PASS").text((en ? "Workforce size: " : "Quy mô nhân sự: ") + f.getEmployeeCountRange()).source("Tavily").build());
        }
        return build(8, "Operational Proof", Math.min(100, Math.max(0, score)), ev, "Gemini Vision / Tavily",
            confidenceFor(f.getHasVerifiedLocation(), f.getIsStockImageUsed(), f.getHasPhysicalEvidence(), f.getEmployeeCountRange()));
    }

    // Overall score calculation.
    // A null score means SKIP — no data available (external source down/unreachable,
    // not yet applicable, etc.), which is NOT the same as a real low/failing score.
    // Counting it as 0 against the pillar's full weight makes one offline data
    // source (e.g. a government site outage) look like business risk. Instead we
    // drop skipped pillars from both the numerator and the denominator and
    // re-normalize across whatever pillars actually returned data.
    public double calcOverallScore(List<PillarScore> pillars) {
        double[] weights = {w1, w2, w3, w4, w5, w6, w7, w8};
        double weightedSum = 0;
        double weightTotal = 0;
        for (int i = 0; i < pillars.size() && i < 8; i++) {
            Integer s = pillars.get(i).getScore();
            if (s == null) continue;
            weightedSum += s * weights[i];
            weightTotal += weights[i];
        }
        if (weightTotal == 0) return 0;
        return Math.round((weightedSum / weightTotal) * 10.0) / 10.0;
    }

    // Canonical internal risk level — always Vietnamese regardless of the user's
    // display language. This is a fixed enum-like value (Report.riskLevel,
    // ScoringResult.riskLevel) that other code compares against literally
    // (isHighRiskLevel() on the frontend, hard-stop checks, tests) and that the
    // frontend independently translates for display via report.riskLevel.* i18n
    // keys — it must never vary by request.
    public String getRiskLevel(double overall) {
        if (overall >= 75) return "Thấp";
        if (overall >= 40) return "Trung bình";
        if (overall >= 20) return "Cao";
        return "Nghiêm trọng";
    }

    // Helpers
    private PillarScore build(int no, String name, int score, List<Evidence> ev, String sources, String confidence) {
        String status = score >= 75 ? "PASS" : score >= 40 ? "WARN" : "FAIL";
        return PillarScore.builder()
            .pillarNo(no).pillarName(name).score(score).status(status)
            .confidence(confidence).evidences(ev).sourcesUsed(sources)
            .build();
    }

    /**
     * Confidence reflects data COMPLETENESS (how many of the crawler's fields
     * actually came back non-null), not favorability — a low score with full
     * data is still HIGH confidence; a good-looking score built from mostly
     * null/unknown fields is LOW confidence.
     */
    private String confidenceFor(Object... fields) {
        if (fields.length == 0) return "LOW";
        long known = java.util.Arrays.stream(fields).filter(java.util.Objects::nonNull).count();
        double ratio = (double) known / fields.length;
        if (ratio >= 0.8) return "HIGH";
        if (ratio >= 0.5) return "MEDIUM";
        return "LOW";
    }

    private PillarScore skip(int no, String name, String reason) {
        return PillarScore.builder()
            .pillarNo(no).pillarName(name).score(null).status("SKIP")
            .confidence("LOW").findings(reason).build();
    }
}

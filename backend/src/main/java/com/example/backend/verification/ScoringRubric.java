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

    // P1 — Entity Validation
    public PillarScore scoreP1(FactJson.P1Facts f) {
        if (f == null) return skip(1, "Entity Validation", "Không có dữ liệu P1");
        List<Evidence> ev = new ArrayList<>();
        int score = 0;
        if ("ACTIVE".equalsIgnoreCase(f.getStatus())) {
            score += 50;
            ev.add(Evidence.builder().type("PASS").text("Doanh nghiệp đang hoạt động").source("P1").build());
        } else if ("INACTIVE".equalsIgnoreCase(f.getStatus())) {
            score += 5;
            ev.add(Evidence.builder().type("FAIL").text("Doanh nghiệp đã ngừng hoạt động").source("P1").build());
        } else {
            score += 20;
            ev.add(Evidence.builder().type("WARN").text("Trạng thái không xác định").source("P1").build());
        }
        if (f.getAgeYears() != null && f.getAgeYears() > 2) {
            score += 25;
            ev.add(Evidence.builder().type("PASS").text("Doanh nghiệp đã hoạt động " + String.format("%.1f", f.getAgeYears()) + " năm").source("P1").build());
        } else if (f.getAgeYears() != null && f.getAgeYears() > 0.5) {
            score += 10;
            ev.add(Evidence.builder().type("WARN").text("Doanh nghiệp mới thành lập < 2 năm").source("P1").build());
        }
        if (Boolean.TRUE.equals(f.getHasLegalRepresentative())) {
            score += 15;
            ev.add(Evidence.builder().type("PASS").text("Có người đại diện pháp luật được xác minh").source("P1").build());
        }
        if ("MATCH".equalsIgnoreCase(f.getIndustryMatch())) {
            score += 10;
            ev.add(Evidence.builder().type("PASS").text("Ngành nghề phù hợp").source("P1").build());
        } else if ("PARTIAL".equalsIgnoreCase(f.getIndustryMatch())) {
            score += 5;
            ev.add(Evidence.builder().type("WARN").text("Ngành nghề khớp một phần").source("P1").build());
        }
        return build(1, "Entity Validation", Math.min(100, score), ev, "vietqr.io / gleif.org");
    }

    // P2 — Digital Footprint
    public PillarScore scoreP2(FactJson.P2Facts f) {
        if (f == null) return skip(2, "Digital Footprint", "Không có dữ liệu P2");
        List<Evidence> ev = new ArrayList<>();
        int score = 0;
        if (Boolean.TRUE.equals(f.getHasOfficialWebsite())) {
            score += 30;
            ev.add(Evidence.builder().type("PASS").text("Có website chính thức").source("P2").build());
        } else {
            ev.add(Evidence.builder().type("FAIL").text("Không có website chính thức").source("P2").build());
        }
        if (f.getDomainAgeMonths() != null && f.getDomainAgeMonths() > 12) {
            score += 25;
            ev.add(Evidence.builder().type("PASS").text("Domain đã " + f.getDomainAgeMonths() + " tháng tuổi").source("RDAP").build());
        } else if (f.getDomainAgeMonths() != null && f.getDomainAgeMonths() > 0) {
            score += 10;
            ev.add(Evidence.builder().type("WARN").text("Domain mới (< 12 tháng)").source("RDAP").build());
        }
        if (Boolean.TRUE.equals(f.getHasSsl())) {
            score += 15;
            ev.add(Evidence.builder().type("PASS").text("Website có chứng chỉ SSL").source("P2").build());
        }
        if (Boolean.FALSE.equals(f.getUsesFreeEmail())) {
            score += 15;
            ev.add(Evidence.builder().type("PASS").text("Sử dụng email doanh nghiệp").source("P2").build());
        } else if (Boolean.TRUE.equals(f.getUsesFreeEmail())) {
            score -= 10;
            ev.add(Evidence.builder().type("WARN").text("Sử dụng email miễn phí (Gmail/Yahoo)").source("P2").build());
        }
        if ("HIGH".equalsIgnoreCase(f.getSocialMediaScore())) {
            score += 15;
            ev.add(Evidence.builder().type("PASS").text("Hiện diện mạng xã hội cao").source("Tavily").build());
        } else if ("MEDIUM".equalsIgnoreCase(f.getSocialMediaScore())) {
            score += 8;
            ev.add(Evidence.builder().type("WARN").text("Hiện diện mạng xã hội trung bình").source("Tavily").build());
        }
        return build(2, "Digital Footprint", Math.min(100, Math.max(0, score)), ev, "RDAP / Tavily");
    }

    // P3 — Trade Activity
    public PillarScore scoreP3(FactJson.P3Facts f) {
        if (f == null) return skip(3, "Trade Activity", "Không có dữ liệu P3");
        List<Evidence> ev = new ArrayList<>();
        int score = 0;
        if (Boolean.TRUE.equals(f.getHasTradeHistory())) {
            score += 40;
            ev.add(Evidence.builder().type("PASS").text("Có lịch sử giao thương quốc tế").source("P3").build());
        } else {
            ev.add(Evidence.builder().type("FAIL").text("Không tìm thấy lịch sử giao thương").source("P3").build());
        }
        if (f.getShipmentCountYear() != null && f.getShipmentCountYear() > 10) {
            score += 30;
            ev.add(Evidence.builder().type("PASS").text(f.getShipmentCountYear() + " lô hàng/năm").source("P3").build());
        } else if (f.getShipmentCountYear() != null && f.getShipmentCountYear() > 3) {
            score += 15;
            ev.add(Evidence.builder().type("WARN").text(f.getShipmentCountYear() + " lô hàng/năm (ít)").source("P3").build());
        }
        if ("GROWING".equalsIgnoreCase(f.getTradeTrend())) {
            score += 20;
            ev.add(Evidence.builder().type("PASS").text("Xu hướng tăng trưởng thương mại").source("P3").build());
        } else if ("DECLINING".equalsIgnoreCase(f.getTradeTrend())) {
            score -= 10;
            ev.add(Evidence.builder().type("WARN").text("Xu hướng suy giảm thương mại").source("P3").build());
        }
        if (Boolean.TRUE.equals(f.getIsIndustryMatched())) {
            score += 10;
            ev.add(Evidence.builder().type("PASS").text("Đúng ngành nghề").source("P3").build());
        }
        return build(3, "Trade Activity", Math.min(100, Math.max(0, score)), ev, "VCCI / ImportYeti");
    }

    // P4 — Identity Consistency
    public PillarScore scoreP4(FactJson.P4Facts f) {
        if (f == null) return skip(4, "Identity Consistency", "Không có dữ liệu P4");
        List<Evidence> ev = new ArrayList<>();
        int score = 30; // base
        if ("COMPLETELY_MATCHED".equalsIgnoreCase(f.getIdentityMatchLevel())) {
            score = 80;
            ev.add(Evidence.builder().type("PASS").text("Thông tin nhận dạng khớp hoàn toàn").source("Google Places").build());
        } else if ("MINOR_MISMATCH".equalsIgnoreCase(f.getIdentityMatchLevel())) {
            score = 55;
            ev.add(Evidence.builder().type("WARN").text("Có sự không khớp nhỏ về thông tin").source("Google Places").build());
        } else if ("MAJOR_MISMATCH".equalsIgnoreCase(f.getIdentityMatchLevel())) {
            score = 15;
            ev.add(Evidence.builder().type("FAIL").text("Sự không khớp nghiêm trọng về thông tin").source("Google Places").build());
        }
        if (Boolean.TRUE.equals(f.getAddressVerified())) {
            score += 10;
            ev.add(Evidence.builder().type("PASS").text("Địa chỉ được xác minh").source("Google Places").build());
        }
        if (Boolean.TRUE.equals(f.getCeoVerified())) {
            score += 10;
            ev.add(Evidence.builder().type("PASS").text("Người đại diện được xác minh").source("Tavily").build());
        }
        return build(4, "Identity Consistency", Math.min(100, score), ev, "Google Places / Tavily");
    }

    // P5 — Financial & Tax
    public PillarScore scoreP5(FactJson.P5Facts f) {
        if (f == null) return skip(5, "Financial & Tax", "Không có dữ liệu P5");
        List<Evidence> ev = new ArrayList<>();
        int score = 0;
        if ("NORMAL".equalsIgnoreCase(f.getTaxComplianceStatus())) {
            score += 50;
            ev.add(Evidence.builder().type("PASS").text("Tuân thủ thuế bình thường").source("P5").build());
        } else if ("PENALIZED".equalsIgnoreCase(f.getTaxComplianceStatus())) {
            score += 10;
            ev.add(Evidence.builder().type("FAIL").text("Đang bị xử phạt thuế").source("P5").build());
        } else if ("DISSOLVING".equalsIgnoreCase(f.getTaxComplianceStatus())) {
            score += 2;
            ev.add(Evidence.builder().type("FAIL").text("Đang trong quá trình giải thể").source("P5").build());
        }
        if (f.getRegisteredCapitalUsd() != null && f.getRegisteredCapitalUsd() > 50000) {
            score += 25;
            ev.add(Evidence.builder().type("PASS").text("Vốn điều lệ: " + String.format("$%.0f", f.getRegisteredCapitalUsd())).source("P5").build());
        } else if (f.getRegisteredCapitalUsd() != null && f.getRegisteredCapitalUsd() > 10000) {
            score += 15;
            ev.add(Evidence.builder().type("WARN").text("Vốn điều lệ thấp: " + String.format("$%.0f", f.getRegisteredCapitalUsd())).source("P5").build());
        }
        if (Boolean.TRUE.equals(f.getHasFinancialReport())) {
            score += 15;
            ev.add(Evidence.builder().type("PASS").text("Có báo cáo tài chính").source("P5").build());
        }
        if ("GROWING".equalsIgnoreCase(f.getRevenueTrend())) {
            score += 10;
            ev.add(Evidence.builder().type("PASS").text("Doanh thu đang tăng trưởng").source("P5").build());
        }
        return build(5, "Financial & Tax", Math.min(100, score), ev, "dangkykinhdoanh.gov.vn / Tavily");
    }

    // P6 — Payment & Bank Sanctions
    public PillarScore scoreP6(FactJson.P6Facts f) {
        if (f == null) return skip(6, "Payment & Bank", "Không có dữ liệu P6");
        List<Evidence> ev = new ArrayList<>();
        if (Boolean.TRUE.equals(f.getIsSanctionHit())) {
            ev.add(Evidence.builder().type("FAIL").text("CẢNH BÁO: Nằm trong danh sách trừng phạt quốc tế").source("OpenSanctions").build());
            return build(6, "Payment & Bank", 0, ev, "OpenSanctions");
        }
        int score = 60;
        ev.add(Evidence.builder().type("PASS").text("Không nằm trong danh sách trừng phạt").source("OpenSanctions").build());
        if (Boolean.TRUE.equals(f.getBicVerified())) {
            score += 25;
            ev.add(Evidence.builder().type("PASS").text("Mã BIC/SWIFT được xác minh").source("P6").build());
        }
        if ("CORPORATE".equalsIgnoreCase(f.getAccountType())) {
            score += 15;
            ev.add(Evidence.builder().type("PASS").text("Tài khoản doanh nghiệp").source("P6").build());
        } else if ("PERSONAL".equalsIgnoreCase(f.getAccountType())) {
            score -= 20;
            ev.add(Evidence.builder().type("WARN").text("CẢNH BÁO: Yêu cầu tài khoản cá nhân").source("P6").build());
        }
        if (Boolean.TRUE.equals(f.getIsPersonalAccountRequested())) {
            score -= 20;
            ev.add(Evidence.builder().type("WARN").text("Yêu cầu thanh toán vào tài khoản cá nhân").source("P6").build());
        }
        return build(6, "Payment & Bank", Math.min(100, Math.max(0, score)), ev, "OpenSanctions");
    }

    // P7 — Deal Structure Risk
    public PillarScore scoreP7(FactJson.P7Facts f) {
        if (f == null) return skip(7, "Deal Structure Risk", "Chưa có thông tin giao dịch");
        List<Evidence> ev = new ArrayList<>();
        int score = 0;
        if ("SAFE".equalsIgnoreCase(f.getPaymentMethodSafety())) {
            score += 60;
            ev.add(Evidence.builder().type("PASS").text("Phương thức thanh toán an toàn").source("P7").build());
        } else if ("MODERATE".equalsIgnoreCase(f.getPaymentMethodSafety())) {
            score += 40;
            ev.add(Evidence.builder().type("WARN").text("Phương thức thanh toán trung bình").source("P7").build());
        } else if ("RISKY".equalsIgnoreCase(f.getPaymentMethodSafety())) {
            score += 15;
            ev.add(Evidence.builder().type("FAIL").text("Phương thức thanh toán rủi ro cao").source("P7").build());
        }
        if (Boolean.TRUE.equals(f.getHasWrittenContract())) {
            score += 25;
            ev.add(Evidence.builder().type("PASS").text("Có hợp đồng thành văn").source("P7").build());
        } else {
            ev.add(Evidence.builder().type("WARN").text("Chưa có hợp đồng thành văn").source("P7").build());
        }
        if (f.getDepositPercentage() != null && f.getDepositPercentage() <= 30) {
            score += 15;
            ev.add(Evidence.builder().type("PASS").text("Đặt cọc hợp lý (" + f.getDepositPercentage() + "%)").source("P7").build());
        } else if (f.getDepositPercentage() != null && f.getDepositPercentage() > 50) {
            score -= 10;
            ev.add(Evidence.builder().type("WARN").text("Đặt cọc cao (" + f.getDepositPercentage() + "%)").source("P7").build());
        }
        return build(7, "Deal Structure Risk", Math.min(100, Math.max(0, score)), ev, "Gemini Deal Safety");
    }

    // P8 — Operational Proof
    public PillarScore scoreP8(FactJson.P8Facts f) {
        if (f == null) return skip(8, "Operational Proof", "Không có dữ liệu P8");
        List<Evidence> ev = new ArrayList<>();
        int score = 0;
        if (Boolean.TRUE.equals(f.getHasVerifiedLocation())) {
            score += 40;
            ev.add(Evidence.builder().type("PASS").text("Địa điểm được xác minh").source("P8").build());
        } else {
            ev.add(Evidence.builder().type("FAIL").text("Không xác minh được địa điểm thực tế").source("P8").build());
        }
        if (Boolean.FALSE.equals(f.getIsStockImageUsed())) {
            score += 30;
            ev.add(Evidence.builder().type("PASS").text("Ảnh thực tế (không phải ảnh stock)").source("TinEye").build());
        } else if (Boolean.TRUE.equals(f.getIsStockImageUsed())) {
            score -= 10;
            ev.add(Evidence.builder().type("WARN").text("CẢNH BÁO: Sử dụng ảnh stock").source("TinEye").build());
        }
        if (Boolean.TRUE.equals(f.getHasPhysicalEvidence())) {
            score += 30;
            ev.add(Evidence.builder().type("PASS").text("Có bằng chứng vật lý (ảnh nhà máy/văn phòng)").source("P8").build());
        }
        if ("MEDIUM".equalsIgnoreCase(f.getEmployeeCountRange()) || "LARGE".equalsIgnoreCase(f.getEmployeeCountRange())) {
            score += 10;
            ev.add(Evidence.builder().type("PASS").text("Quy mô nhân sự: " + f.getEmployeeCountRange()).source("Tavily").build());
        }
        return build(8, "Operational Proof", Math.min(100, Math.max(0, score)), ev, "TinEye / Tavily");
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

    public String getRiskLevel(double overall) {
        if (overall >= 75) return "Thấp";
        if (overall >= 40) return "Trung bình";
        if (overall >= 20) return "Cao";
        return "Nghiêm trọng";
    }

    // Helpers
    private PillarScore build(int no, String name, int score, List<Evidence> ev, String sources) {
        String status = score >= 75 ? "PASS" : score >= 40 ? "WARN" : "FAIL";
        return PillarScore.builder()
            .pillarNo(no).pillarName(name).score(score).status(status)
            .confidence("MEDIUM").evidences(ev).sourcesUsed(sources)
            .build();
    }

    private PillarScore skip(int no, String name, String reason) {
        return PillarScore.builder()
            .pillarNo(no).pillarName(name).score(null).status("SKIP")
            .confidence("LOW").findings(reason).build();
    }
}

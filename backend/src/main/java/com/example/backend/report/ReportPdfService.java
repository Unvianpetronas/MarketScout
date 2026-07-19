package com.example.backend.report;

import com.example.backend.domain.PillarResult;
import com.example.backend.domain.Report;
import com.example.backend.shared.model.scoring.Evidence;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.lowagie.text.*;
import com.lowagie.text.pdf.BaseFont;
import com.lowagie.text.pdf.PdfPCell;
import com.lowagie.text.pdf.PdfPTable;
import com.lowagie.text.pdf.PdfWriter;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Service;

import java.awt.Color;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Locale;

/**
 * Renders a {@link Report} + its {@link PillarResult}s as a PDF for the
 * "Xuất báo cáo" / "Export" button on the report detail and list pages.
 *
 * Uses a bundled Noto Sans TTF (embedded, Identity-H) instead of a built-in
 * PDF base font — Vietnamese diacritics (ệ, ằ, ữ...) fall outside WinAnsi/
 * CP1252, so Helvetica alone renders them as boxes or drops them.
 */
@Slf4j
@Service
public class ReportPdfService {

    private static final DateTimeFormatter DATE_FMT =
            DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm").withZone(ZoneOffset.UTC);

    private final ObjectMapper objectMapper;
    private final BaseFont baseFont;

    public ReportPdfService(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
        this.baseFont = loadBaseFont();
    }

    /**
     * Reads the TTF as bytes (not {@code getFile()}) so this also works when the
     * app runs from a packaged Spring Boot jar, where the font resource lives
     * inside a nested jar and has no filesystem path.
     */
    private static BaseFont loadBaseFont() {
        try (var in = new ClassPathResource("fonts/NotoSans-Regular.ttf").getInputStream()) {
            byte[] ttfBytes = in.readAllBytes();
            return BaseFont.createFont("NotoSans-Regular.ttf", BaseFont.IDENTITY_H, BaseFont.EMBEDDED,
                    false, ttfBytes, null);
        } catch (Exception e) {
            throw new IllegalStateException("Failed to load fonts/NotoSans-Regular.ttf for PDF export", e);
        }
    }

    private Font font(float size, int style, Color color) {
        return new Font(baseFont, size, style, color);
    }

    public byte[] generate(Report report, List<PillarResult> pillars) {
        Document doc = new Document(PageSize.A4, 40, 40, 50, 40);
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        try {
            PdfWriter.getInstance(doc, out);
            doc.open();

            addHeader(doc, report);
            addOverview(doc, report);
            addDealSafety(doc, report);
            addPillars(doc, pillars);
            addFooter(doc);

            doc.close();
        } catch (DocumentException e) {
            throw new IllegalStateException("Failed to generate report PDF", e);
        }
        return out.toByteArray();
    }

    private void addHeader(Document doc, Report report) throws DocumentException {
        Paragraph brand = new Paragraph("MarketScout — Báo cáo thẩm định đối tác", font(9, Font.NORMAL, new Color(140, 134, 114)));
        brand.setSpacingAfter(4);
        doc.add(brand);

        Paragraph title = new Paragraph(report.getEntityName(), font(20, Font.BOLD, new Color(20, 20, 20)));
        title.setSpacingAfter(6);
        doc.add(title);

        StringBuilder meta = new StringBuilder();
        if (report.getCountryIso2() != null) meta.append("Quốc gia: ").append(report.getCountryIso2()).append("   ");
        if (report.getTaxId() != null) meta.append("MST: ").append(report.getTaxId()).append("   ");
        if (report.getWebsite() != null) meta.append("Website: ").append(report.getWebsite());
        if (meta.length() > 0) {
            Paragraph metaP = new Paragraph(meta.toString(), font(10, Font.NORMAL, new Color(90, 90, 90)));
            metaP.setSpacingAfter(14);
            doc.add(metaP);
        }
    }

    // The override, when present, is what actually gets shown — the raw
    // pipeline output on Report is left untouched for audit (see Report.isOverridden()).
    private Short effectiveScore(Report r) {
        return r.getOverrideScore() != null ? r.getOverrideScore() : r.getOverallScore();
    }

    private String effectiveRiskLevel(Report r) {
        return r.getOverrideRiskLevel() != null ? r.getOverrideRiskLevel() : r.getRiskLevel();
    }

    private boolean effectiveHardStop(Report r) {
        return r.getOverrideHardStop() != null ? r.getOverrideHardStop() : Boolean.TRUE.equals(r.getHardStop());
    }

    private void addOverview(Document doc, Report report) throws DocumentException {
        PdfPTable table = new PdfPTable(3);
        table.setWidthPercentage(100);
        table.setSpacingAfter(report.isOverridden() ? 6 : 16);

        Short score = effectiveScore(report);
        String riskLevel = effectiveRiskLevel(report);
        addStatCell(table, "Điểm tin cậy tổng", score != null ? score + "/100" : "—");
        addStatCell(table, "Đánh giá rủi ro", riskLevel != null ? riskLevel : "—");
        addStatCell(table, "Hard Stop", effectiveHardStop(report) ? "CÓ — cần xem xét" : "Không");

        doc.add(table);

        if (report.isOverridden()) {
            Paragraph note = new Paragraph();
            note.add(new Chunk("Đã được admin điều chỉnh. ", font(9, Font.BOLD, new Color(180, 95, 6))));
            if (report.getOverrideNote() != null && !report.getOverrideNote().isBlank()) {
                note.add(new Chunk(report.getOverrideNote(), font(9, Font.NORMAL, new Color(90, 90, 90))));
            }
            note.setSpacingAfter(16);
            doc.add(note);
        }
    }

    private void addStatCell(PdfPTable table, String label, String value) {
        PdfPCell cell = new PdfPCell();
        cell.setBorderColor(new Color(230, 230, 230));
        cell.setPadding(10);
        Paragraph p = new Paragraph();
        p.add(new Chunk(label.toUpperCase(Locale.ROOT) + "\n", font(7, Font.BOLD, new Color(140, 134, 114))));
        p.add(new Chunk(value, font(13, Font.BOLD, new Color(20, 20, 20))));
        cell.addElement(p);
        table.addCell(cell);
    }

    private void addDealSafety(Document doc, Report report) throws DocumentException {
        if (report.getDealSafetyAnalysis() == null || report.getDealSafetyAnalysis().isBlank()) return;
        try {
            var node = objectMapper.readTree(report.getDealSafetyAnalysis());
            Paragraph heading = new Paragraph("Khuyến nghị Deal Safety", font(13, Font.BOLD, new Color(20, 20, 20)));
            heading.setSpacingBefore(4);
            heading.setSpacingAfter(6);
            doc.add(heading);

            String label = node.hasNonNull("warningLabel") ? node.get("warningLabel").asText() : null;
            String recommendation = node.hasNonNull("recommendation") ? node.get("recommendation").asText() : null;
            if (label != null) {
                Paragraph p = new Paragraph(label, font(11, Font.BOLD, new Color(180, 95, 6)));
                p.setSpacingAfter(3);
                doc.add(p);
            }
            if (recommendation != null) {
                Paragraph p = new Paragraph(recommendation, font(10, Font.NORMAL, new Color(60, 60, 60)));
                p.setSpacingAfter(10);
                doc.add(p);
            }
            if (node.has("requiredProtocols") && node.get("requiredProtocols").isArray()) {
                for (var protocol : node.get("requiredProtocols")) {
                    doc.add(new Paragraph("• " + protocol.asText(), font(10, Font.NORMAL, new Color(60, 60, 60))));
                }
            }
        } catch (IOException e) {
            log.warn("Could not parse dealSafetyAnalysis JSON for report {} — skipping section in PDF", report.getId());
        }
    }

    private void addPillars(Document doc, List<PillarResult> pillars) throws DocumentException {
        Paragraph heading = new Paragraph("Phân tích 8 trụ cột", font(13, Font.BOLD, new Color(20, 20, 20)));
        heading.setSpacingBefore(10);
        heading.setSpacingAfter(8);
        doc.add(heading);

        for (PillarResult pillar : pillars) {
            addPillar(doc, pillar);
        }
    }

    private void addPillar(Document doc, PillarResult pillar) throws DocumentException {
        String scoreLabel = pillar.getScore() != null ? pillar.getScore() + "/100" : "N/A";
        String name = "Trụ cột " + pillar.getPillarNo() + " — " + (pillar.getPillarName() != null ? pillar.getPillarName() : "");
        Color statusColor = statusColor(pillar.getStatus());

        Paragraph p = new Paragraph();
        p.add(new Chunk(name + "   ", font(11, Font.BOLD, new Color(20, 20, 20))));
        p.add(new Chunk(scoreLabel + "  [" + (pillar.getStatus() != null ? pillar.getStatus() : "N/A") + "]",
                font(10, Font.BOLD, statusColor)));
        p.setSpacingBefore(6);
        p.setSpacingAfter(3);
        doc.add(p);

        List<Evidence> evidences = parseEvidences(pillar.getEvidences());
        if (evidences != null) {
            for (Evidence ev : evidences) {
                String line = "  · " + (ev.getText() != null ? ev.getText() : "")
                        + (ev.getSource() != null ? " (" + ev.getSource() + ")" : "");
                doc.add(new Paragraph(line, font(9, Font.NORMAL, new Color(90, 90, 90))));
            }
        } else if (pillar.getFindings() != null && !pillar.getFindings().isBlank()) {
            doc.add(new Paragraph("  " + pillar.getFindings(), font(9, Font.NORMAL, new Color(120, 120, 120))));
        }
    }

    @SuppressWarnings("unchecked")
    private List<Evidence> parseEvidences(String json) {
        if (json == null || json.isBlank()) return null;
        try {
            return objectMapper.readValue(json,
                    objectMapper.getTypeFactory().constructCollectionType(List.class, Evidence.class));
        } catch (Exception e) {
            return null;
        }
    }

    private Color statusColor(String status) {
        if (status == null) return new Color(150, 150, 150);
        return switch (status.toUpperCase(Locale.ROOT)) {
            case "PASS" -> new Color(0, 150, 90);
            case "WARN" -> new Color(200, 130, 10);
            case "FAIL" -> new Color(200, 40, 40);
            default -> new Color(150, 150, 150);
        };
    }

    private void addFooter(Document doc) throws DocumentException {
        Paragraph footer = new Paragraph(
                "Tạo bởi MarketScout lúc " + DATE_FMT.format(java.time.Instant.now()) + " UTC",
                font(8, Font.ITALIC, new Color(160, 160, 160)));
        footer.setSpacingBefore(20);
        doc.add(footer);
    }
}

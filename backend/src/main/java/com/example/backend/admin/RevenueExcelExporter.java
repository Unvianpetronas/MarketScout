package com.example.backend.admin;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.UncheckedIOException;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.List;
import org.apache.poi.ss.usermodel.BorderStyle;
import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.CellStyle;
import org.apache.poi.ss.usermodel.FillPatternType;
import org.apache.poi.ss.usermodel.Font;
import org.apache.poi.ss.usermodel.HorizontalAlignment;
import org.apache.poi.ss.usermodel.IndexedColors;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.stereotype.Component;

/**
 * Builds the admin revenue report as a real .xlsx workbook.
 *
 * <p>Generated server-side so the export covers every transaction rather than
 * the handful the dashboard has loaded, and so no spreadsheet library ships to
 * the browser.
 *
 * <p>Money is written as numbers, not preformatted strings, so the finance side
 * can sum and pivot without cleaning the file first. Timestamps are rendered in
 * Asia/Ho_Chi_Minh because that is what the dashboard shows.
 */
@Component
public class RevenueExcelExporter {

    private static final ZoneId REPORT_ZONE = ZoneId.of("Asia/Ho_Chi_Minh");
    private static final DateTimeFormatter TIMESTAMP =
            DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm").withZone(REPORT_ZONE);

    public byte[] build(AdminDTO.RevenueAnalytics data, List<AdminDTO.RecentTx> allTransactions) {
        try (Workbook wb = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Styles styles = new Styles(wb);
            writeSummary(wb, styles, data);
            writeBreakdown(wb, styles, "Doanh thu theo gói & quota", data.revenueByPlan());
            writeBreakdown(wb, styles, "Doanh thu theo phương thức", data.revenueByProvider());
            writeOverTime(wb, styles, data);
            writeTransactions(wb, styles, allTransactions);
            wb.write(out);
            return out.toByteArray();
        } catch (IOException e) {
            throw new UncheckedIOException("Could not build the revenue workbook", e);
        }
    }

    // ── sheets ───────────────────────────────────────────────────────────────

    private void writeSummary(Workbook wb, Styles s, AdminDTO.RevenueAnalytics d) {
        Sheet sheet = wb.createSheet("Tổng quan");
        int r = 0;

        Row title = sheet.createRow(r++);
        cell(title, 0, "Báo cáo doanh thu MarketScout", s.title);
        Row generated = sheet.createRow(r++);
        cell(generated, 0, "Xuất lúc", s.label);
        cell(generated, 1, TIMESTAMP.format(Instant.now()), s.plain);
        r++;

        Row head = sheet.createRow(r++);
        cell(head, 0, "Chỉ số", s.header);
        cell(head, 1, "Giá trị", s.header);

        r = money(sheet, s, r, "Doanh thu tháng này", d.revenueThisMonth());
        r = money(sheet, s, r, "Doanh thu tháng trước", d.revenueLastMonth());
        r = money(sheet, s, r, "Doanh thu năm nay", d.revenueThisYear());
        r = money(sheet, s, r, "Tổng thực thu (toàn bộ lịch sử)", d.revenueAllTime());
        r = money(sheet, s, r, "Tiền chưa thu được (chờ + thất bại)", d.pendingFailedAmount());
        r = number(sheet, s, r, "Giao dịch thành công (tháng này)", d.completedCountThisMonth());
        r = number(sheet, s, r, "Giao dịch thất bại (tháng này)", d.failedCountThisMonth());
        r = number(sheet, s, r, "Giao dịch đang chờ (tháng này)", d.pendingCountThisMonth());
        r = number(sheet, s, r, "Khách đã trả phí", d.payingUsers());
        number(sheet, s, r, "Tổng người dùng", d.totalUsers());

        sheet.setColumnWidth(0, 12_000);
        sheet.setColumnWidth(1, 6_000);
    }

    private void writeBreakdown(Workbook wb, Styles s, String name, List<AdminDTO.NamedAmount> rows) {
        Sheet sheet = wb.createSheet(name);
        int r = 0;
        Row head = sheet.createRow(r++);
        cell(head, 0, "Hạng mục", s.header);
        cell(head, 1, "Doanh thu (VND)", s.header);

        BigDecimal total = BigDecimal.ZERO;
        for (AdminDTO.NamedAmount row : rows) {
            Row line = sheet.createRow(r++);
            cell(line, 0, row.name(), s.plain);
            cell(line, 1, row.amount(), s.money);
            total = total.add(row.amount() != null ? row.amount() : BigDecimal.ZERO);
        }
        Row totalRow = sheet.createRow(r);
        cell(totalRow, 0, "Tổng", s.label);
        cell(totalRow, 1, total, s.moneyBold);

        sheet.setColumnWidth(0, 10_000);
        sheet.setColumnWidth(1, 6_000);
    }

    private void writeOverTime(Workbook wb, Styles s, AdminDTO.RevenueAnalytics d) {
        Sheet sheet = wb.createSheet("Doanh thu theo thời gian");
        int r = 0;
        Row head = sheet.createRow(r++);
        cell(head, 0, "Kỳ", s.header);
        cell(head, 1, "Doanh thu (VND)", s.header);
        for (AdminDTO.MonthlyRevenue m : d.revenueOverTime()) {
            Row line = sheet.createRow(r++);
            cell(line, 0, m.label(), s.plain);
            cell(line, 1, m.amount(), s.money);
        }
        sheet.setColumnWidth(0, 5_000);
        sheet.setColumnWidth(1, 6_000);
    }

    private void writeTransactions(Workbook wb, Styles s, List<AdminDTO.RecentTx> txs) {
        Sheet sheet = wb.createSheet("Giao dịch");
        int r = 0;
        Row head = sheet.createRow(r++);
        String[] headers = {"Khách hàng", "Email", "Mua gì", "Số tiền (VND)", "Phương thức", "Trạng thái", "Ngày"};
        for (int i = 0; i < headers.length; i++) cell(head, i, headers[i], s.header);

        for (AdminDTO.RecentTx t : txs) {
            Row line = sheet.createRow(r++);
            cell(line, 0, t.customer(), s.plain);
            cell(line, 1, t.email(), s.plain);
            cell(line, 2, t.plan(), s.plain);
            cell(line, 3, t.amount(), s.money);
            cell(line, 4, t.provider(), s.plain);
            cell(line, 5, t.status(), s.plain);
            cell(line, 6, t.date() != null ? TIMESTAMP.format(t.date()) : "", s.plain);
        }

        // Freeze the header so a long list stays readable while scrolling.
        sheet.createFreezePane(0, 1);
        int[] widths = {7_000, 9_000, 5_000, 5_000, 4_000, 4_000, 5_000};
        for (int i = 0; i < widths.length; i++) sheet.setColumnWidth(i, widths[i]);
    }

    // ── helpers ──────────────────────────────────────────────────────────────

    private int money(Sheet sheet, Styles s, int r, String label, BigDecimal value) {
        Row row = sheet.createRow(r);
        cell(row, 0, label, s.label);
        cell(row, 1, value, s.money);
        return r + 1;
    }

    private int number(Sheet sheet, Styles s, int r, String label, long value) {
        Row row = sheet.createRow(r);
        cell(row, 0, label, s.label);
        Cell c = row.createCell(1);
        c.setCellValue(value);
        c.setCellStyle(s.plain);
        return r + 1;
    }

    private void cell(Row row, int col, String value, CellStyle style) {
        Cell c = row.createCell(col);
        c.setCellValue(value != null ? value : "");
        c.setCellStyle(style);
    }

    private void cell(Row row, int col, BigDecimal value, CellStyle style) {
        Cell c = row.createCell(col);
        // Numeric, not text — otherwise nothing in the sheet can be summed.
        c.setCellValue(value != null ? value.doubleValue() : 0d);
        c.setCellStyle(style);
    }

    /** Created once per workbook: POI caps the number of distinct cell styles. */
    private static final class Styles {
        final CellStyle title;
        final CellStyle header;
        final CellStyle label;
        final CellStyle plain;
        final CellStyle money;
        final CellStyle moneyBold;

        Styles(Workbook wb) {
            Font boldFont = wb.createFont();
            boldFont.setBold(true);

            Font titleFont = wb.createFont();
            titleFont.setBold(true);
            titleFont.setFontHeightInPoints((short) 14);

            title = wb.createCellStyle();
            title.setFont(titleFont);

            header = wb.createCellStyle();
            header.setFont(boldFont);
            header.setFillForegroundColor(IndexedColors.GREY_25_PERCENT.getIndex());
            header.setFillPattern(FillPatternType.SOLID_FOREGROUND);
            header.setBorderBottom(BorderStyle.THIN);
            header.setAlignment(HorizontalAlignment.LEFT);

            label = wb.createCellStyle();
            label.setFont(boldFont);

            plain = wb.createCellStyle();

            short vnd = wb.createDataFormat().getFormat("#,##0");
            money = wb.createCellStyle();
            money.setDataFormat(vnd);

            moneyBold = wb.createCellStyle();
            moneyBold.setDataFormat(vnd);
            moneyBold.setFont(boldFont);
        }
    }
}

package com.example.backend.payment;

import com.example.backend.shared.mail.MailService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.text.NumberFormat;
import java.time.Instant;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.Locale;

/**
 * Sends the post-payment thank-you + invoice email (English).
 * Async so it never blocks (or fails) the webhook confirmation transaction.
 * Receives plain values only — no JPA entities — so it is safe to run after
 * the originating transaction has committed.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class PaymentEmailService {

    private static final NumberFormat VND = NumberFormat.getNumberInstance(new Locale("vi", "VN"));
    private static final DateTimeFormatter DATE =
            DateTimeFormatter.ofPattern("dd MMM yyyy, HH:mm 'UTC'", Locale.ENGLISH).withZone(ZoneId.of("UTC"));

    private final MailService mailService;

    @Async
    public void sendInvoiceEmail(String toEmail, String customerName, String invoiceNo,
                                 int quantity, BigDecimal amountVnd, String transferContent,
                                 String sepayRef, Instant paidAt) {
        if (toEmail == null || toEmail.isBlank()) return;
        String subject = "Your MarketScout receipt — invoice " + invoiceNo;
        String html = buildHtml(customerName, invoiceNo, quantity, amountVnd, transferContent, sepayRef, paidAt);
        boolean ok = mailService.send(toEmail, subject, html);
        log.info("Invoice email to {} for invoice {} — sent={}", toEmail, invoiceNo, ok);
    }

    private String buildHtml(String customerName, String invoiceNo, int quantity, BigDecimal amountVnd,
                             String transferContent, String sepayRef, Instant paidAt) {
        String name = (customerName == null || customerName.isBlank()) ? "there" : customerName;
        String amount = VND.format(amountVnd) + " VND";
        String unit = VND.format(amountVnd.divide(BigDecimal.valueOf(Math.max(quantity, 1)))) + " VND";
        String paid = paidAt != null ? DATE.format(paidAt) : "";
        String ref = (sepayRef == null || sepayRef.isBlank()) ? "—" : sepayRef;

        return """
            <!DOCTYPE html>
            <html lang="en">
            <body style="font-family:Arial,Helvetica,sans-serif;background:#f4f5f7;padding:32px;margin:0">
              <div style="max-width:560px;margin:auto;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #ececec">
                <div style="background:#0A0E1A;padding:24px 32px">
                  <span style="color:#ffffff;font-size:18px;font-weight:bold">MarketScout</span>
                  <span style="color:#00D26A;font-size:11px;letter-spacing:1px;margin-left:8px">B2B INTELLIGENCE</span>
                </div>
                <div style="padding:32px">
                  <h2 style="margin:0 0 4px;color:#0A0E1A">Thank you for your purchase, %s!</h2>
                  <p style="color:#555;font-size:14px;margin:0 0 24px">
                    Your payment has been confirmed and your verification credits have been added to your account.
                  </p>

                  <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:16px 20px;margin-bottom:24px">
                    <span style="color:#15803d;font-weight:bold;font-size:15px">+%d verification credit%s added</span>
                  </div>

                  <table style="width:100%%;border-collapse:collapse;font-size:14px;color:#333">
                    <tr><td style="padding:8px 0;color:#888">Invoice</td><td style="padding:8px 0;text-align:right;font-weight:bold">%s</td></tr>
                    <tr><td style="padding:8px 0;color:#888">Date paid</td><td style="padding:8px 0;text-align:right">%s</td></tr>
                    <tr><td style="padding:8px 0;color:#888">Reference</td><td style="padding:8px 0;text-align:right">%s</td></tr>
                    <tr><td style="padding:8px 0;color:#888">Payment code</td><td style="padding:8px 0;text-align:right;font-family:monospace">%s</td></tr>
                  </table>

                  <hr style="border:none;border-top:1px solid #eee;margin:16px 0">

                  <table style="width:100%%;border-collapse:collapse;font-size:14px;color:#333">
                    <tr>
                      <td style="padding:8px 0">Verification credits</td>
                      <td style="padding:8px 0;text-align:center;color:#888">%d × %s</td>
                      <td style="padding:8px 0;text-align:right">%s</td>
                    </tr>
                    <tr>
                      <td style="padding:12px 0;font-weight:bold;border-top:2px solid #0A0E1A">Total paid</td>
                      <td style="border-top:2px solid #0A0E1A"></td>
                      <td style="padding:12px 0;text-align:right;font-weight:bold;border-top:2px solid #0A0E1A;font-size:16px">%s</td>
                    </tr>
                  </table>

                  <p style="color:#888;font-size:12px;margin-top:28px">
                    This is an automated receipt for your MarketScout account. If you have any questions about this
                    charge, just reply to this email and our team will help you out.
                  </p>
                </div>
                <div style="background:#fafafa;padding:16px 32px;border-top:1px solid #eee">
                  <span style="color:#aaa;font-size:11px">© MarketScout — Trade partner verification. All rights reserved.</span>
                </div>
              </div>
            </body>
            </html>
            """.formatted(
                name,
                quantity, quantity > 1 ? "s" : "",
                invoiceNo, paid, ref, transferContent,
                quantity, unit, amount,
                amount
        );
    }
}

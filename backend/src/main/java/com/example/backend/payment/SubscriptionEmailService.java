package com.example.backend.payment;

import com.example.backend.shared.mail.MailService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.Locale;

/**
 * Renewal-reminder and downgrade-notice emails for the subscription lifecycle.
 * Async so it never blocks the daily lifecycle sweep transaction.
 * Receives plain values only — no JPA entities — so it is safe to run after
 * the originating transaction has committed.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class SubscriptionEmailService {

    private static final DateTimeFormatter DATE =
            DateTimeFormatter.ofPattern("dd MMM yyyy", Locale.ENGLISH).withZone(ZoneId.of("UTC"));

    private final MailService mailService;

    @Value("${app.frontend-url:http://localhost:3000}")
    private String frontendUrl;

    @Async
    public void sendRenewalReminderEmail(String toEmail, String customerName, String planName,
                                          int daysLeft, Instant expiresAt) {
        if (toEmail == null || toEmail.isBlank()) return;
        String subject = daysLeft <= 1
                ? "Your MarketScout " + planName + " plan expires tomorrow"
                : "Your MarketScout " + planName + " plan expires in " + daysLeft + " days";
        try {
            String html = buildReminderHtml(customerName, planName, daysLeft, expiresAt);
            boolean ok = mailService.send(toEmail, subject, html);
            log.info("Renewal reminder (T-{}) email to {} for plan {} — sent={}", daysLeft, toEmail, planName, ok);
        } catch (Exception e) {
            log.error("Failed to build/send renewal reminder email to {}: {}", toEmail, e.getMessage(), e);
        }
    }

    @Async
    public void sendScheduledPlanChangeReadyEmail(String toEmail, String customerName, String newPlanName) {
        if (toEmail == null || toEmail.isBlank()) return;
        String subject = "Your MarketScout plan change to " + newPlanName + " is ready to activate";
        try {
            String html = buildScheduledChangeReadyHtml(customerName, newPlanName);
            boolean ok = mailService.send(toEmail, subject, html);
            log.info("Scheduled plan-change-ready email to {} (plan={}) — sent={}", toEmail, newPlanName, ok);
        } catch (Exception e) {
            log.error("Failed to build/send scheduled plan-change email to {}: {}", toEmail, e.getMessage(), e);
        }
    }

    @Async
    public void sendDowngradedEmail(String toEmail, String customerName, String oldPlanName) {
        if (toEmail == null || toEmail.isBlank()) return;
        String subject = "Your MarketScout plan has been downgraded to Free";
        try {
            String html = buildDowngradedHtml(customerName, oldPlanName);
            boolean ok = mailService.send(toEmail, subject, html);
            log.info("Downgrade notice email to {} (was {}) — sent={}", toEmail, oldPlanName, ok);
        } catch (Exception e) {
            log.error("Failed to build/send downgrade email to {}: {}", toEmail, e.getMessage(), e);
        }
    }

    private String buildReminderHtml(String customerName, String planName, int daysLeft, Instant expiresAt) {
        String name = (customerName == null || customerName.isBlank()) ? "there" : customerName;
        String when = daysLeft <= 1 ? "tomorrow" : "in " + daysLeft + " days";
        String expiry = DATE.format(expiresAt);
        String pricingUrl = frontendUrl + "/pricing";

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
                  <h2 style="margin:0 0 4px;color:#0A0E1A">Hi %s, your plan expires %s</h2>
                  <p style="color:#555;font-size:14px;margin:0 0 24px">
                    Your <b>%s</b> plan is set to expire on <b>%s</b>. Since MarketScout payments are one-time
                    bank transfers, we can't auto-charge you — renew before then to keep your monthly verification
                    credits without interruption.
                  </p>
                  <a href="%s" style="display:inline-block;background:#00D26A;color:#0A0E1A;font-weight:bold;
                    text-decoration:none;padding:12px 24px;border-radius:8px;font-size:14px">Renew my plan</a>
                  <p style="color:#888;font-size:12px;margin-top:28px">
                    If you don't renew, your account will automatically move to the Free tier once the plan expires.
                  </p>
                </div>
                <div style="background:#fafafa;padding:16px 32px;border-top:1px solid #eee">
                  <span style="color:#aaa;font-size:11px">&copy; MarketScout — Trade partner verification. All rights reserved.</span>
                </div>
              </div>
            </body>
            </html>
            """.formatted(name, when, planName, expiry, pricingUrl);
    }

    private String buildScheduledChangeReadyHtml(String customerName, String newPlanName) {
        String name = (customerName == null || customerName.isBlank()) ? "there" : customerName;
        String checkoutUrl = frontendUrl + "/checkout?plan=" + newPlanName.toLowerCase(Locale.ENGLISH);

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
                  <h2 style="margin:0 0 4px;color:#0A0E1A">Hi %s, your plan change is ready</h2>
                  <p style="color:#555;font-size:14px;margin:0 0 24px">
                    Your previous cycle just ended and your scheduled change to <b>%s</b> is ready to activate.
                    Since MarketScout payments are one-time bank transfers, complete the transfer below to switch
                    over — your account is on the Free tier in the meantime.
                  </p>
                  <a href="%s" style="display:inline-block;background:#00D26A;color:#0A0E1A;font-weight:bold;
                    text-decoration:none;padding:12px 24px;border-radius:8px;font-size:14px">Complete the switch to %s</a>
                </div>
                <div style="background:#fafafa;padding:16px 32px;border-top:1px solid #eee">
                  <span style="color:#aaa;font-size:11px">&copy; MarketScout — Trade partner verification. All rights reserved.</span>
                </div>
              </div>
            </body>
            </html>
            """.formatted(name, newPlanName, checkoutUrl, newPlanName);
    }

    private String buildDowngradedHtml(String customerName, String oldPlanName) {
        String name = (customerName == null || customerName.isBlank()) ? "there" : customerName;
        String pricingUrl = frontendUrl + "/pricing";

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
                  <h2 style="margin:0 0 4px;color:#0A0E1A">Hi %s, your account is now on the Free plan</h2>
                  <p style="color:#555;font-size:14px;margin:0 0 24px">
                    Your <b>%s</b> plan expired and no renewal payment was received, so your account has moved to
                    the Free tier. You can resubscribe anytime to get your monthly verification credits back.
                  </p>
                  <a href="%s" style="display:inline-block;background:#00D26A;color:#0A0E1A;font-weight:bold;
                    text-decoration:none;padding:12px 24px;border-radius:8px;font-size:14px">View plans</a>
                </div>
                <div style="background:#fafafa;padding:16px 32px;border-top:1px solid #eee">
                  <span style="color:#aaa;font-size:11px">&copy; MarketScout — Trade partner verification. All rights reserved.</span>
                </div>
              </div>
            </body>
            </html>
            """.formatted(name, oldPlanName, pricingUrl);
    }
}

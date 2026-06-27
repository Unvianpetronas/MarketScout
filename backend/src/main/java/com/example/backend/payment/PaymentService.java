package com.example.backend.payment;

import com.example.backend.domain.*;
import com.example.backend.exception.AppException;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.security.SecureRandom;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Quota top-up via SePay VietQR.
 *
 * A purchase atomically creates an invoice, a pending payment transaction, a
 * pending quota top-up and a pending VietQR payment. Quota is granted only when
 * SePay's webhook reports a matching incoming transfer — the payment row is
 * locked during confirmation so webhook retries cannot grant quota twice.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class PaymentService {

    static final String STATUS_PENDING   = "pending";
    static final String STATUS_PAID      = "paid";
    static final String STATUS_EXPIRED   = "expired";
    static final String STATUS_COMPLETED = "completed";

    private static final String CODE_PREFIX = "MSQT";
    private static final String ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    private static final Pattern CODE_PATTERN = Pattern.compile(CODE_PREFIX + "[A-Z0-9]+");
    private static final SecureRandom RNG = new SecureRandom();

    /** Outcome of processing a SePay webhook — surfaced for logging/tests. */
    public enum WebhookResult { CONFIRMED, DUPLICATE, EXPIRED, AMOUNT_MISMATCH, IRRELEVANT }

    private final UsersRepository usersRepository;
    private final InvoiceRepository invoiceRepository;
    private final PaymentTransactionRepository transactionRepository;
    private final VietqrPaymentRepository vietqrRepository;
    private final QuotaTopupRepository topupRepository;
    private final BillingEventRepository billingEventRepository;
    private final PlanRepository planRepository;
    private final SubscriptionRepository subscriptionRepository;
    private final PlanPurchaseRepository planPurchaseRepository;
    private final PaymentProperties props;
    private final ObjectMapper objectMapper;
    private final PaymentEmailService paymentEmailService;

    // ── Create top-up ──────────────────────────────────────────────────

    @Transactional
    public PaymentDTO.TopupResponse createTopup(UUID userId, int quantity) {
        if (quantity < 1) {
            throw new AppException(AppException.ErrorCode.BAD_REQUEST, "Quantity must be at least 1");
        }
        Users user = requireUserForOrder(userId);
        BigDecimal amount = props.getPricePerCreditVnd().multiply(BigDecimal.valueOf(quantity));
        Instant now = Instant.now();
        Instant expiresAt = now.plus(props.getQrExpiryMinutes(), ChronoUnit.MINUTES);
        try {
            Order o = createOrder(user, amount, now, expiresAt);
            QuotaTopup topup = new QuotaTopup();
            topup.setUser(user);
            topup.setTransaction(o.tx());
            topup.setQuotaAdded(quantity);
            topup.setPriceVnd(amount);
            topup.setStatus(STATUS_PENDING);
            topupRepository.save(topup);
            log.info("Top-up created — user={} invoice={} quantity={} amount={} code={}",
                    user.getId(), o.invoice().getId(), quantity, amount, o.qr().getTransferContent());
            return buildResponse(o, quantity, amount);
        } catch (org.springframework.dao.DataAccessException e) {
            throw orderPersistError(userId, e);
        }
    }

    // ── Plan purchase (one-time, via VietQR) ───────────────────────────

    @Transactional
    public PaymentDTO.TopupResponse createPlanCheckout(UUID userId, String planName) {
        Users user = requireUserForOrder(userId);
        Plan plan = planRepository.findByNameIgnoreCase(planName)
                .orElseThrow(() -> new AppException(AppException.ErrorCode.BAD_REQUEST, "Gói không hợp lệ"));
        if (plan.getPriceVnd() == null || plan.getPriceVnd().signum() <= 0) {
            throw new AppException(AppException.ErrorCode.BAD_REQUEST,
                    "Gói này không hỗ trợ thanh toán trực tuyến");
        }
        BigDecimal amount = plan.getPriceVnd();
        Instant now = Instant.now();
        Instant expiresAt = now.plus(props.getQrExpiryMinutes(), ChronoUnit.MINUTES);
        try {
            Order o = createOrder(user, amount, now, expiresAt);
            PlanPurchase pp = new PlanPurchase();
            pp.setUser(user);
            pp.setTransaction(o.tx());
            pp.setPlan(plan);
            pp.setBillingCycle(plan.getBillingCycle());
            pp.setPriceVnd(amount);
            pp.setStatus(STATUS_PENDING);
            planPurchaseRepository.save(pp);
            log.info("Plan checkout created — user={} plan={} invoice={} amount={} code={}",
                    user.getId(), plan.getName(), o.invoice().getId(), amount, o.qr().getTransferContent());
            return buildResponse(o, plan.getMonthlyQuota(), amount);
        } catch (org.springframework.dao.DataAccessException e) {
            throw orderPersistError(userId, e);
        }
    }

    // ── Shared order creation ──────────────────────────────────────────

    private Users requireUserForOrder(UUID userId) {
        Users user = usersRepository.findById(userId)
                .orElseThrow(() -> new AppException(AppException.ErrorCode.USER_NOT_FOUND));
        if (props.getAccountNo() == null || props.getAccountNo().isBlank()) {
            log.warn("Payment order created but app.payment.account-no is not configured — the QR will be "
                    + "unusable. Set SEPAY_ACCOUNT_NO in the environment.");
        }
        return user;
    }

    private AppException orderPersistError(UUID userId, org.springframework.dao.DataAccessException e) {
        String cause = e.getMostSpecificCause() != null ? e.getMostSpecificCause().getMessage() : e.getMessage();
        log.error("Payment order persistence failed for user {} — payment tables may be missing. "
                + "Run backend/src/main/resources/db/payment_tables.sql. Cause: {}", userId, cause, e);
        return new AppException(AppException.ErrorCode.BAD_REQUEST,
                "Không thể tạo đơn thanh toán. Vui lòng thử lại sau.");
    }

    private record Order(Invoice invoice, PaymentTransaction tx, VietqrPayment qr) {}

    private Order createOrder(Users user, BigDecimal amount, Instant now, Instant expiresAt) {
        String transferContent = generateTransferCode();

        Invoice invoice = new Invoice();
        invoice.setUser(user);
        invoice.setInvoiceNo(generateInvoiceNo());
        invoice.setStatus(STATUS_PENDING);
        invoice.setSubtotalVnd(amount);
        invoice.setTaxVnd(BigDecimal.ZERO);
        invoice.setTotalVnd(amount);
        invoice.setAmountPaidVnd(BigDecimal.ZERO);
        invoice.setPeriodStart(now);
        invoice.setPeriodEnd(now);
        invoice.setDueAt(expiresAt);
        invoice = invoiceRepository.save(invoice);

        PaymentTransaction tx = new PaymentTransaction();
        tx.setInvoice(invoice);
        tx.setProvider("sepay");
        tx.setStatus(STATUS_PENDING);
        tx.setAmountVnd(amount);
        tx.setRetryCount(0);
        tx = transactionRepository.save(tx);

        VietqrPayment qr = new VietqrPayment();
        qr.setInvoice(invoice);
        qr.setBankCode(props.getBankCode());
        qr.setAccountNo(props.getAccountNo());
        qr.setTransferContent(transferContent);
        qr.setExpectedAmountVnd(amount);
        qr.setQrDataUrl(buildQrUrl(amount, transferContent));
        qr.setStatus(STATUS_PENDING);
        qr.setExpiresAt(expiresAt);
        vietqrRepository.save(qr);

        return new Order(invoice, tx, qr);
    }

    private PaymentDTO.TopupResponse buildResponse(Order o, int quantity, BigDecimal amount) {
        return PaymentDTO.TopupResponse.builder()
                .invoiceId(o.invoice().getId())
                .quantity(quantity)
                .amountVnd(amount)
                .qrUrl(o.qr().getQrDataUrl())
                .transferContent(o.qr().getTransferContent())
                .bankCode(props.getBankCode())
                .accountNo(props.getAccountNo())
                .accountName(props.getAccountName())
                .status(STATUS_PENDING)
                .expiresAt(o.qr().getExpiresAt())
                .build();
    }

    // ── Status poll ────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public PaymentDTO.StatusResponse getStatus(UUID invoiceId, UUID userId) {
        Invoice invoice = invoiceRepository.findById(invoiceId)
                .orElseThrow(() -> new AppException(AppException.ErrorCode.RESOURCE_NOT_FOUND));

        if (!invoice.getUser().getId().equals(userId)) {
            throw new AppException(AppException.ErrorCode.UNAUTHORIZED);
        }

        VietqrPayment qr = vietqrRepository.findByInvoice_Id(invoiceId)
                .orElseThrow(() -> new AppException(AppException.ErrorCode.RESOURCE_NOT_FOUND));

        int quotaRemaining = usersRepository.findById(userId)
                .map(Users::getQuotaRemaining).orElse(0);

        return PaymentDTO.StatusResponse.builder()
                .invoiceId(invoiceId)
                .status(resolveStatus(qr))
                .quotaRemaining(quotaRemaining)
                .build();
    }

    private String resolveStatus(VietqrPayment qr) {
        if (STATUS_PAID.equals(qr.getStatus())) return STATUS_PAID;
        if (STATUS_EXPIRED.equals(qr.getStatus()) || qr.getExpiresAt().isBefore(Instant.now())) {
            return STATUS_EXPIRED;
        }
        return STATUS_PENDING;
    }

    // ── Webhook ────────────────────────────────────────────────────────

    /** Returns true when the Authorization header carries the configured SePay key. */
    public boolean isValidApiKey(String authHeader) {
        String configured = props.getSepayApiKey();
        if (configured == null || configured.isBlank()) {
            log.warn("SePay webhook rejected — no app.payment.sepay-api-key configured");
            return false;
        }
        if (authHeader == null) return false;
        String h = authHeader.trim();
        // SePay sends "Authorization: Apikey <key>"
        if (h.regionMatches(true, 0, "Apikey ", 0, "Apikey ".length())) {
            h = h.substring("Apikey ".length()).trim();
        }
        return configured.equals(h);
    }

    @Transactional
    public WebhookResult processWebhook(PaymentDTO.SepayWebhook p) {
        // Only money-in transfers can fulfill an order.
        if (p.getTransferType() == null || !p.getTransferType().equalsIgnoreCase("in")) {
            return WebhookResult.IRRELEVANT;
        }
        // Must land on our configured receiving account.
        if (props.getAccountNo() == null || props.getAccountNo().isBlank()
                || !props.getAccountNo().equals(p.getAccountNumber())) {
            return WebhookResult.IRRELEVANT;
        }
        String code = extractCode(p);
        if (code == null) return WebhookResult.IRRELEVANT;

        Optional<VietqrPayment> opt = vietqrRepository.findByTransferContentForUpdate(code);
        if (opt.isEmpty()) return WebhookResult.IRRELEVANT;
        VietqrPayment qr = opt.get();

        // Idempotency: a retry of an already-confirmed transfer must not re-credit.
        if (STATUS_PAID.equals(qr.getStatus())) return WebhookResult.DUPLICATE;

        if (STATUS_EXPIRED.equals(qr.getStatus()) || qr.getExpiresAt().isBefore(Instant.now())) {
            return WebhookResult.EXPIRED;
        }
        // Amount must match exactly.
        if (p.getTransferAmount() == null
                || qr.getExpectedAmountVnd().compareTo(p.getTransferAmount()) != 0) {
            return WebhookResult.AMOUNT_MISMATCH;
        }

        fulfill(qr, p);
        return WebhookResult.CONFIRMED;
    }

    private void fulfill(VietqrPayment qr, PaymentDTO.SepayWebhook p) {
        Instant now = Instant.now();
        String sepayRef = p.getId() != null ? String.valueOf(p.getId()) : null;

        qr.setStatus(STATUS_PAID);
        qr.setMatchedRef(sepayRef);
        qr.setMatchedAt(now);
        vietqrRepository.save(qr);

        Invoice invoice = qr.getInvoice();
        invoice.setStatus(STATUS_PAID);
        invoice.setAmountPaidVnd(p.getTransferAmount());
        invoice.setPaidAt(now);
        invoiceRepository.save(invoice);

        PaymentTransaction tx = transactionRepository.findByInvoice_Id(invoice.getId()).orElse(null);
        if (tx == null) {
            log.error("Confirmed payment {} has no transaction — cannot fulfill", qr.getId());
            return;
        }
        tx.setStatus(STATUS_COMPLETED);
        tx.setProviderRef(sepayRef);
        tx.setCompletedAt(now);
        transactionRepository.save(tx);

        // Two kinds of order ride the same rails — credit top-up or plan purchase.
        QuotaTopup topup = topupRepository.findByTransaction_Id(tx.getId()).orElse(null);
        if (topup != null) {
            grantTopup(topup, invoice, qr, sepayRef, now);
            return;
        }
        PlanPurchase plan = planPurchaseRepository.findByTransaction_Id(tx.getId()).orElse(null);
        if (plan != null) {
            grantPlan(plan, invoice, qr, sepayRef, now);
            return;
        }
        log.error("Confirmed payment {} has neither top-up nor plan purchase — nothing to grant", qr.getId());
    }

    private void grantTopup(QuotaTopup topup, Invoice invoice, VietqrPayment qr, String sepayRef, Instant now) {
        topup.setStatus(STATUS_COMPLETED);
        topupRepository.save(topup);

        Users user = topup.getUser();
        usersRepository.addQuota(user.getId(), topup.getQuotaAdded());

        recordBillingEvent(user, "quota_topup_paid", invoice, topup.getQuotaAdded(), topup.getPriceVnd(), sepayRef);
        log.info("Quota granted — user={} credits={} invoice={} sepayRef={}",
                user.getId(), topup.getQuotaAdded(), invoice.getId(), sepayRef);

        // Thank-you + invoice email. Async + plain values so it never blocks or
        // fails this confirmation transaction. Read entity fields while the
        // session is still open here.
        paymentEmailService.sendInvoiceEmail(
                user.getEmail(), user.getFullName(), invoice.getInvoiceNo(),
                topup.getQuotaAdded(), topup.getPriceVnd(), qr.getTransferContent(), sepayRef, now);
    }

    private void grantPlan(PlanPurchase pp, Invoice invoice, VietqrPayment qr, String sepayRef, Instant now) {
        pp.setStatus(STATUS_COMPLETED);
        planPurchaseRepository.save(pp);

        Users user = pp.getUser();
        Plan plan = pp.getPlan();

        // Assign the plan and refresh the monthly quota cycle.
        user.setPlan(plan);
        user.setQuotaRemaining(plan.getMonthlyQuota());
        user.setQuotaUsedThisCycle(0);
        user.setCycleResetAt(now.plus(30, ChronoUnit.DAYS));
        usersRepository.save(user);

        Subscription sub = Subscription.builder()
                .user(user).plan(plan)
                .status("active")
                .billingCycle(plan.getBillingCycle() != null ? plan.getBillingCycle() : "monthly")
                .currentPeriodStart(now)
                .currentPeriodEnd(now.plus(30, ChronoUnit.DAYS))
                .build();
        subscriptionRepository.save(sub);

        recordBillingEvent(user, "plan_purchased", invoice, plan.getMonthlyQuota(), pp.getPriceVnd(), sepayRef);
        log.info("Plan assigned — user={} plan={} quota={} invoice={} sepayRef={}",
                user.getId(), plan.getName(), plan.getMonthlyQuota(), invoice.getId(), sepayRef);

        paymentEmailService.sendInvoiceEmail(
                user.getEmail(), user.getFullName(), invoice.getInvoiceNo(),
                plan.getMonthlyQuota(), pp.getPriceVnd(), qr.getTransferContent(), sepayRef, now);
    }

    private void recordBillingEvent(Users user, String eventType, Invoice invoice,
                                    int credits, BigDecimal amount, String sepayRef) {
        try {
            BillingEvent ev = new BillingEvent();
            ev.setUser(user);
            ev.setEventType(eventType);
            ev.setPayload(objectMapper.writeValueAsString(Map.of(
                    "invoiceId", invoice.getId().toString(),
                    "credits", credits,
                    "amountVnd", amount.toPlainString(),
                    "sepayRef", sepayRef == null ? "" : sepayRef
            )));
            billingEventRepository.save(ev);
        } catch (Exception e) {
            log.warn("Failed to record billing event for invoice {}: {}", invoice.getId(), e.getMessage());
        }
    }

    private String extractCode(PaymentDTO.SepayWebhook p) {
        if (p.getCode() != null && !p.getCode().isBlank()) {
            String c = p.getCode().trim().toUpperCase();
            if (c.startsWith(CODE_PREFIX)) return c;
        }
        if (p.getContent() != null) {
            Matcher m = CODE_PATTERN.matcher(p.getContent().toUpperCase());
            if (m.find()) return m.group();
        }
        return null;
    }

    // ── Scheduled expiry ───────────────────────────────────────────────

    @Scheduled(fixedDelayString = "${app.payment.expiry-sweep-ms:60000}")
    @Transactional
    public void expireStalePayments() {
        List<VietqrPayment> expired = vietqrRepository.findExpired(STATUS_PENDING, Instant.now());
        for (VietqrPayment qr : expired) {
            qr.setStatus(STATUS_EXPIRED);
            Invoice inv = qr.getInvoice();
            if (STATUS_PENDING.equals(inv.getStatus())) inv.setStatus(STATUS_EXPIRED);

            PaymentTransaction tx = transactionRepository.findByInvoice_Id(inv.getId()).orElse(null);
            if (tx != null && STATUS_PENDING.equals(tx.getStatus())) {
                tx.setStatus(STATUS_EXPIRED);
                tx.setFailureReason("QR expired before payment");
                QuotaTopup topup = topupRepository.findByTransaction_Id(tx.getId()).orElse(null);
                if (topup != null && STATUS_PENDING.equals(topup.getStatus())) {
                    topup.setStatus(STATUS_EXPIRED);
                }
                PlanPurchase pp = planPurchaseRepository.findByTransaction_Id(tx.getId()).orElse(null);
                if (pp != null && STATUS_PENDING.equals(pp.getStatus())) {
                    pp.setStatus(STATUS_EXPIRED);
                }
            }
        }
        if (!expired.isEmpty()) log.info("Expired {} stale VietQR payment(s)", expired.size());
    }

    // ── Helpers ────────────────────────────────────────────────────────

    private String buildQrUrl(BigDecimal amount, String transferContent) {
        long amt = amount.setScale(0, java.math.RoundingMode.HALF_UP).longValueExact();
        return props.getSepayQrBaseUrl()
                + "?acc=" + enc(props.getAccountNo())
                + "&bank=" + enc(props.getBankCode())
                + "&amount=" + amt
                + "&des=" + enc(transferContent);
    }

    private static String enc(String s) {
        return URLEncoder.encode(s == null ? "" : s, StandardCharsets.UTF_8);
    }

    private String generateTransferCode() {
        String code;
        do {
            StringBuilder sb = new StringBuilder(CODE_PREFIX);
            for (int i = 0; i < 8; i++) sb.append(ALPHABET.charAt(RNG.nextInt(ALPHABET.length())));
            code = sb.toString();
        } while (vietqrRepository.existsByTransferContent(code));
        return code;
    }

    private String generateInvoiceNo() {
        return "INV-" + System.currentTimeMillis() + "-" + RNG.nextInt(10000);
    }
}

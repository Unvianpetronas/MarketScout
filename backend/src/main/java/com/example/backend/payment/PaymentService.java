package com.example.backend.payment;

import com.example.backend.domain.*;
import com.example.backend.exception.AppException;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

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
    private final PaymentSettingsRepository paymentSettingsRepository;
    private final ObjectMapper objectMapper;
    private final PaymentEmailService paymentEmailService;

    // ── Create top-up ──────────────────────────────────────────────────

    /** Admin-editable price per credit (payment_settings row id=1), set up by db/payment_settings.sql. */
    private BigDecimal currentPricePerCreditVnd() {
        return paymentSettingsRepository.findById(1)
                .map(PaymentSettings::getPricePerCreditVnd)
                .orElseThrow(() -> new AppException(AppException.ErrorCode.RESOURCE_NOT_FOUND,
                        "Payment settings not configured — run db/payment_settings.sql"));
    }

    @Transactional
    public PaymentDTO.TopupResponse createTopup(UUID userId, int quantity) {
        if (quantity < 1) {
            throw new AppException(AppException.ErrorCode.BAD_REQUEST, "Quantity must be at least 1");
        }
        Users user = requireUserForOrder(userId);
        BigDecimal amount = currentPricePerCreditVnd().multiply(BigDecimal.valueOf(quantity));
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

    // ── Public pricing (no auth) — feeds the marketing pricing page and the
    //    checkout pre-order summary so they never drift from admin-edited
    //    prices in the `plans` / `payment_settings` tables. ─────────────

    @Transactional(readOnly = true)
    public List<PaymentDTO.PublicPlanResponse> listActivePlans() {
        return planRepository.findByIsActiveTrueOrderById().stream()
                .map(p -> PaymentDTO.PublicPlanResponse.builder()
                        .id(p.getId())
                        .name(p.getName())
                        .billingCycle(p.getBillingCycle())
                        .priceVnd(p.getPriceVnd())
                        .priceUsd(p.getPriceUsd())
                        .monthlyQuota(p.getMonthlyQuota())
                        .build())
                .toList();
    }

    @Transactional(readOnly = true)
    public PaymentDTO.PricePerCreditResponse getPricePerCredit() {
        return PaymentDTO.PricePerCreditResponse.builder()
                .pricePerCreditVnd(currentPricePerCreditVnd())
                .build();
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

    // ── Deferred plan change ─────────────────────────────────────────────
    // SePay can't auto-charge, so a plan change requested while a paid
    // subscription is still running is recorded (not charged) here and only
    // takes effect — with a fresh checkout — once the current cycle ends
    // (see SubscriptionLifecycleService). Upgrading off Free (no active paid
    // subscription) skips this entirely and checks out immediately via
    // createPlanCheckout above — there's no already-paid time to protect.

    @Transactional
    public PaymentDTO.ScheduledPlanChangeResponse schedulePlanChange(UUID userId, String planName) {
        Users user = usersRepository.findById(userId)
                .orElseThrow(() -> new AppException(AppException.ErrorCode.USER_NOT_FOUND));
        Plan targetPlan = planRepository.findByNameIgnoreCase(planName)
                .orElseThrow(() -> new AppException(AppException.ErrorCode.BAD_REQUEST, "Gói không hợp lệ"));

        Subscription active = subscriptionRepository.findByUser_IdAndStatus(userId, "active")
                .stream().findFirst()
                .orElseThrow(() -> new AppException(AppException.ErrorCode.BAD_REQUEST,
                        "Bạn chưa có gói trả phí đang hoạt động — hãy mua gói trực tiếp."));

        if (active.getPlan() != null && active.getPlan().getId().equals(targetPlan.getId())) {
            throw new AppException(AppException.ErrorCode.BAD_REQUEST, "Bạn đang dùng gói này rồi.");
        }

        // Re-confirming overwrites any earlier pending choice — latest wins.
        user.setPendingPlan(targetPlan);
        user.setPendingPlanRequestedAt(Instant.now());
        usersRepository.save(user);

        log.info("Plan change scheduled — user={} from={} to={} effectiveAt={}",
                userId, active.getPlan() != null ? active.getPlan().getName() : null,
                targetPlan.getName(), active.getCurrentPeriodEnd());

        return PaymentDTO.ScheduledPlanChangeResponse.builder()
                .currentPlanName(active.getPlan() != null ? active.getPlan().getName() : null)
                .pendingPlanName(targetPlan.getName())
                .effectiveAt(active.getCurrentPeriodEnd())
                .build();
    }

    /** Current paid subscription (or a "free" marker) for the profile page. */
    @Transactional(readOnly = true)
    public PaymentDTO.SubscriptionResponse getSubscription(UUID userId) {
        Users user = usersRepository.findById(userId)
                .orElseThrow(() -> new AppException(AppException.ErrorCode.USER_NOT_FOUND));
        Subscription active = activePaidSubscription(userId);
        if (active == null) {
            return PaymentDTO.SubscriptionResponse.builder()
                    .planName(user.getPlan() != null ? user.getPlan().getName() : "free")
                    .status("free").paid(false).build();
        }
        return toSubscriptionResponse(active);
    }

    /**
     * "Hủy đăng ký" — the user opts out of renewing their paid plan. SePay is
     * one-time so nothing is charged/refunded: the plan stays usable until the
     * end of the already-paid cycle, then SubscriptionLifecycleService downgrades
     * it to Free. cancelAt marks the sub so no renewal reminders are sent.
     */
    @Transactional
    public PaymentDTO.SubscriptionResponse cancelSubscription(UUID userId) {
        Users user = usersRepository.findById(userId)
                .orElseThrow(() -> new AppException(AppException.ErrorCode.USER_NOT_FOUND));
        Subscription active = activePaidSubscription(userId);
        if (active == null) {
            throw new AppException(AppException.ErrorCode.BAD_REQUEST,
                    "Bạn đang dùng gói miễn phí — không có đăng ký trả phí nào để hủy.");
        }
        if (active.getCancelAt() == null) {
            active.setCancelAt(active.getCurrentPeriodEnd());
            subscriptionRepository.save(active);
        }
        // Cancelling means "don't renew, don't switch" — drop any scheduled change.
        if (user.getPendingPlan() != null) {
            user.setPendingPlan(null);
            user.setPendingPlanRequestedAt(null);
            usersRepository.save(user);
        }
        log.info("Subscription cancelled (no renewal) — user={} plan={} activeUntil={}",
                userId, active.getPlan().getName(), active.getCurrentPeriodEnd());
        return toSubscriptionResponse(active);
    }

    private Subscription activePaidSubscription(UUID userId) {
        return subscriptionRepository.findByUser_IdAndStatus(userId, "active").stream()
                .filter(s -> s.getPlan() != null && !"free".equalsIgnoreCase(s.getPlan().getName()))
                .findFirst().orElse(null);
    }

    private PaymentDTO.SubscriptionResponse toSubscriptionResponse(Subscription s) {
        return PaymentDTO.SubscriptionResponse.builder()
                .planName(s.getPlan().getName())
                .status(s.getCancelAt() != null ? "canceled" : s.getStatus())
                .currentPeriodEnd(s.getCurrentPeriodEnd())
                .cancelAt(s.getCancelAt())
                .paid(true).build();
    }

    @Transactional
    public PaymentDTO.ScheduledPlanChangeResponse cancelScheduledPlanChange(UUID userId) {
        Users user = usersRepository.findById(userId)
                .orElseThrow(() -> new AppException(AppException.ErrorCode.USER_NOT_FOUND));
        user.setPendingPlan(null);
        user.setPendingPlanRequestedAt(null);
        usersRepository.save(user);

        log.info("Plan change cancelled — user={}", userId);
        return PaymentDTO.ScheduledPlanChangeResponse.builder()
                .currentPlanName(user.getPlan() != null ? user.getPlan().getName() : null)
                .pendingPlanName(null)
                .effectiveAt(null)
                .build();
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

    // ── Billing history ────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<PaymentDTO.InvoiceSummaryResponse> listInvoices(UUID userId) {
        return invoiceRepository.findByUser_IdOrderByCreatedAtDesc(userId).stream()
                .map(inv -> PaymentDTO.InvoiceSummaryResponse.builder()
                        .invoiceId(inv.getId())
                        .invoiceNo(inv.getInvoiceNo())
                        .status(inv.getStatus())
                        .totalVnd(inv.getTotalVnd())
                        .paidAt(inv.getPaidAt())
                        .createdAt(inv.getCreatedAt())
                        .itemLabel(resolveItemLabel(inv))
                        .build())
                .toList();
    }

    private String resolveItemLabel(Invoice invoice) {
        PaymentTransaction tx = transactionRepository.findByInvoice_Id(invoice.getId()).orElse(null);
        if (tx == null) return "—";
        PlanPurchase plan = planPurchaseRepository.findByTransaction_Id(tx.getId()).orElse(null);
        if (plan != null) return plan.getPlan().getName() + " plan";
        QuotaTopup topup = topupRepository.findByTransaction_Id(tx.getId()).orElse(null);
        if (topup != null) return "Nạp thêm " + topup.getQuotaAdded() + " lượt verify";
        return "—";
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

        // The invoice's owner is this user — read the balance off the already
        // loaded association instead of a second user query per 4s poll.
        Integer balance = invoice.getUser().getQuotaRemaining();
        int quotaRemaining = balance != null ? balance : 0;

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
            log.info("SePay webhook ignored — transferType={} (not an incoming transfer) sepayRef={}",
                    p.getTransferType(), p.getId());
            return WebhookResult.IRRELEVANT;
        }
        // Must land on our configured receiving account. Some banks (e.g. BIDV)
        // route collection through an alphanumeric virtual account (VA) — for
        // those, SePay reports the VA in `subAccount` and the underlying physical
        // account (shared by every VA on that bank connection) in `accountNumber`.
        // So a configured VA must be checked against subAccount, not accountNumber.
        // Compared case/whitespace-insensitive rather than digits-only — stripping
        // to digits would mangle a VA like "96247MARKETSCOUT" down to "96247".
        if (props.getAccountNo() == null || props.getAccountNo().isBlank()) {
            log.error("SePay webhook ignored — app.payment.account-no is not configured, "
                    + "so no incoming transfer can ever be matched. Set SEPAY_ACCOUNT_NO. sepayRef={}", p.getId());
            return WebhookResult.IRRELEVANT;
        }
        String configuredAccount = normalizeAccountId(props.getAccountNo());
        boolean accountMatches = configuredAccount.equals(normalizeAccountId(p.getAccountNumber()))
                || configuredAccount.equals(normalizeAccountId(p.getSubAccount()));
        if (!accountMatches) {
            log.warn("SePay webhook ignored — account mismatch: configured={} received accountNumber={} subAccount={} sepayRef={}",
                    props.getAccountNo(), p.getAccountNumber(), p.getSubAccount(), p.getId());
            return WebhookResult.IRRELEVANT;
        }
        String code = extractCode(p);
        if (code == null) {
            log.warn("SePay webhook ignored — no MSQT payment code found in code/content: "
                    + "code={} content={} sepayRef={}", p.getCode(), p.getContent(), p.getId());
            return WebhookResult.IRRELEVANT;
        }

        String sepayRef = p.getId() != null ? String.valueOf(p.getId()) : null;
        WebhookResult result = confirmTransfer(code, p.getTransferAmount(), sepayRef, "webhook");
        if (result == WebhookResult.IRRELEVANT) {
            log.warn("SePay webhook parsed code={} but no matching pending order was found — "
                    + "possibly already expired-and-swept or never created. sepayRef={}", code, p.getId());
        }
        return result;
    }

    /**
     * Confirms a matched incoming transfer and fulfills the order. Shared by the
     * SePay webhook and the reconciliation poller, so a missed webhook can still
     * be recovered from SePay's transaction list.
     *
     * The money has already left the buyer's account by the time we get here, so
     * we are deliberately lenient: overpayment is accepted, and a transfer that
     * lands after QR expiry is still honored (logged for visibility).
     */
    @Transactional
    public WebhookResult confirmTransfer(String code, BigDecimal paidAmount, String sepayRef, String source) {
        Optional<VietqrPayment> opt = vietqrRepository.findByTransferContentForUpdate(code);
        if (opt.isEmpty()) {
            log.warn("No VietQR payment row for code={} (source={}) — the buyer's transfer content did not "
                    + "carry a code this system ever generated, or the code was misread from the bank message.",
                    code, source);
            return WebhookResult.IRRELEVANT;
        }
        VietqrPayment qr = opt.get();

        // Idempotency: a retry of an already-confirmed transfer must not re-credit.
        if (STATUS_PAID.equals(qr.getStatus())) return WebhookResult.DUPLICATE;

        // Underpayment cannot fulfill; overpayment can (the buyer's money is in).
        if (paidAmount == null || paidAmount.compareTo(qr.getExpectedAmountVnd()) < 0) {
            log.warn("Payment amount mismatch — code={} expected={} received={} source={}",
                    code, qr.getExpectedAmountVnd(), paidAmount, source);
            return WebhookResult.AMOUNT_MISMATCH;
        }

        if (STATUS_EXPIRED.equals(qr.getStatus()) || qr.getExpiresAt().isBefore(Instant.now())) {
            log.warn("Late payment honored — code={} arrived after QR expiry (source={})", code, source);
        }

        fulfill(qr, paidAmount, sepayRef);
        return WebhookResult.CONFIRMED;
    }

    private void fulfill(VietqrPayment qr, BigDecimal paidAmount, String sepayRef) {
        Instant now = Instant.now();

        qr.setStatus(STATUS_PAID);
        qr.setMatchedRef(sepayRef);
        qr.setMatchedAt(now);
        vietqrRepository.save(qr);

        Invoice invoice = qr.getInvoice();
        invoice.setStatus(STATUS_PAID);
        invoice.setAmountPaidVnd(paidAmount);
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

        // Thank-you + invoice email. Plain values read while the session is open,
        // dispatched only after this confirmation transaction commits, so a
        // rollback can never send a false receipt.
        String email = user.getEmail(), name = user.getFullName();
        String invoiceNo = invoice.getInvoiceNo(), transferContent = qr.getTransferContent();
        int credits = topup.getQuotaAdded();
        BigDecimal price = topup.getPriceVnd();
        runAfterCommit(() -> paymentEmailService.sendInvoiceEmail(
                email, name, invoiceNo, null, credits, price, transferContent, sepayRef, now));
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

        // A user has at most one active subscription — supersede any old ones.
        List<Subscription> previous = subscriptionRepository.findByUser_IdAndStatus(user.getId(), "active");
        for (Subscription old : previous) {
            old.setStatus("canceled");
            old.setCancelAt(now);
        }
        if (!previous.isEmpty()) subscriptionRepository.saveAll(previous);

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

        String email = user.getEmail(), name = user.getFullName();
        String invoiceNo = invoice.getInvoiceNo(), transferContent = qr.getTransferContent();
        String planName = plan.getName();
        int credits = plan.getMonthlyQuota();
        BigDecimal price = pp.getPriceVnd();
        runAfterCommit(() -> paymentEmailService.sendInvoiceEmail(
                email, name, invoiceNo, planName, credits, price, transferContent, sepayRef, now));
    }

    /** Runs after the surrounding transaction commits; immediately when there is none (tests). */
    private static void runAfterCommit(Runnable action) {
        if (TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override
                public void afterCommit() {
                    action.run();
                }
            });
        } else {
            action.run();
        }
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

    /**
     * Uppercased, whitespace/dash-stripped, or null — so a receiving account
     * identifier (plain numeric account OR an alphanumeric virtual account like
     * "96247MARKETSCOUT") compares equal regardless of case or incidental
     * formatting, without discarding letters the way a digits-only strip would.
     */
    private static String normalizeAccountId(String s) {
        if (s == null) return null;
        String t = s.replaceAll("[\\s-]", "").toUpperCase();
        return t.isBlank() ? null : t;
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

package com.example.backend.payment;

import com.example.backend.domain.*;
import com.example.backend.exception.AppException;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class PaymentServiceTest {

    @Mock private UsersRepository usersRepository;
    @Mock private InvoiceRepository invoiceRepository;
    @Mock private PaymentTransactionRepository transactionRepository;
    @Mock private VietqrPaymentRepository vietqrRepository;
    @Mock private QuotaTopupRepository topupRepository;
    @Mock private BillingEventRepository billingEventRepository;
    @Mock private PlanRepository planRepository;
    @Mock private SubscriptionRepository subscriptionRepository;
    @Mock private PlanPurchaseRepository planPurchaseRepository;
    @Mock private PaymentSettingsRepository paymentSettingsRepository;
    @Mock private PaymentEmailService paymentEmailService;

    private PaymentProperties props;
    private PaymentService service;

    private static final UUID USER_ID = UUID.randomUUID();
    private static final UUID OTHER_USER = UUID.randomUUID();
    private static final UUID INVOICE_ID = UUID.randomUUID();
    private static final UUID TX_ID = UUID.randomUUID();
    private static final String CODE = "MSQTAB12CD34";

    @BeforeEach
    void setUp() {
        props = new PaymentProperties();
        props.setQrExpiryMinutes(15);
        props.setBankCode("MB");
        props.setAccountNo("0123456789");
        props.setAccountName("MARKETSCOUT");
        props.setSepayApiKey("secret-key");
        props.setSepayQrBaseUrl("https://qr.sepay.vn/img");

        PaymentSettings settings = new PaymentSettings(1, new BigDecimal("200000"), Instant.now());
        lenient().when(paymentSettingsRepository.findById(1)).thenReturn(Optional.of(settings));

        service = new PaymentService(usersRepository, invoiceRepository, transactionRepository,
                vietqrRepository, topupRepository, billingEventRepository, planRepository,
                subscriptionRepository, planPurchaseRepository, props, paymentSettingsRepository,
                new ObjectMapper(), paymentEmailService);
    }

    // ── createTopup ────────────────────────────────────────────────────

    @Test
    void createTopup_calculatesAmount_andCreatesAllRecords() {
        Users user = new Users();
        user.setId(USER_ID);
        when(usersRepository.findById(USER_ID)).thenReturn(Optional.of(user));
        when(vietqrRepository.existsByTransferContent(any())).thenReturn(false);
        when(invoiceRepository.save(any())).thenAnswer(a -> {
            Invoice i = a.getArgument(0);
            if (i.getId() == null) i.setId(INVOICE_ID);
            return i;
        });
        when(transactionRepository.save(any())).thenAnswer(a -> {
            PaymentTransaction t = a.getArgument(0);
            if (t.getId() == null) t.setId(TX_ID);
            return t;
        });
        when(topupRepository.save(any())).thenAnswer(a -> a.getArgument(0));
        when(vietqrRepository.save(any())).thenAnswer(a -> a.getArgument(0));

        PaymentDTO.TopupResponse resp = service.createTopup(USER_ID, 5);

        // 5 × 200,000 = 1,000,000 VND
        assertThat(resp.getAmountVnd()).isEqualByComparingTo("1000000");
        assertThat(resp.getQuantity()).isEqualTo(5);
        assertThat(resp.getStatus()).isEqualTo("pending");
        assertThat(resp.getTransferContent()).startsWith("MSQT");
        assertThat(resp.getQrUrl()).contains("amount=1000000").contains("acc=0123456789");
        assertThat(resp.getInvoiceId()).isEqualTo(INVOICE_ID);

        // All four linked records persisted.
        verify(invoiceRepository).save(any(Invoice.class));
        verify(transactionRepository).save(any(PaymentTransaction.class));
        verify(vietqrRepository).save(any(VietqrPayment.class));

        ArgumentCaptor<QuotaTopup> topupCap = ArgumentCaptor.forClass(QuotaTopup.class);
        verify(topupRepository).save(topupCap.capture());
        assertThat(topupCap.getValue().getQuotaAdded()).isEqualTo(5);
        assertThat(topupCap.getValue().getPriceVnd()).isEqualByComparingTo("1000000");
        assertThat(topupCap.getValue().getStatus()).isEqualTo("pending");
    }

    // ── getStatus ──────────────────────────────────────────────────────

    @Test
    void getStatus_rejectsNonOwner() {
        Users owner = new Users();
        owner.setId(USER_ID);
        Invoice invoice = new Invoice();
        invoice.setId(INVOICE_ID);
        invoice.setUser(owner);
        when(invoiceRepository.findById(INVOICE_ID)).thenReturn(Optional.of(invoice));

        assertThatThrownBy(() -> service.getStatus(INVOICE_ID, OTHER_USER))
                .isInstanceOf(AppException.class)
                .extracting("errorCode").isEqualTo(AppException.ErrorCode.UNAUTHORIZED);

        verify(vietqrRepository, never()).findByInvoice_Id(any());
    }

    @Test
    void getStatus_ownerSeesPaidStatus() {
        Users owner = new Users();
        owner.setId(USER_ID);
        owner.setQuotaRemaining(8);
        Invoice invoice = new Invoice();
        invoice.setId(INVOICE_ID);
        invoice.setUser(owner);
        VietqrPayment qr = new VietqrPayment();
        qr.setStatus("paid");
        qr.setExpiresAt(Instant.now().plusSeconds(600));
        when(invoiceRepository.findById(INVOICE_ID)).thenReturn(Optional.of(invoice));
        when(vietqrRepository.findByInvoice_Id(INVOICE_ID)).thenReturn(Optional.of(qr));

        PaymentDTO.StatusResponse resp = service.getStatus(INVOICE_ID, USER_ID);
        assertThat(resp.getStatus()).isEqualTo("paid");
        assertThat(resp.getQuotaRemaining()).isEqualTo(8);
    }

    // ── webhook auth ───────────────────────────────────────────────────

    @Test
    void isValidApiKey_acceptsCorrectKey_rejectsWrong() {
        assertThat(service.isValidApiKey("Apikey secret-key")).isTrue();
        assertThat(service.isValidApiKey("apikey secret-key")).isTrue(); // scheme case-insensitive
        assertThat(service.isValidApiKey("Apikey wrong")).isFalse();
        assertThat(service.isValidApiKey(null)).isFalse();
        assertThat(service.isValidApiKey("secret-key")).isTrue(); // bare key also accepted
    }

    @Test
    void isValidApiKey_rejectsWhenNotConfigured() {
        props.setSepayApiKey("");
        assertThat(service.isValidApiKey("Apikey anything")).isFalse();
    }

    // ── webhook processing ─────────────────────────────────────────────

    @Test
    void webhook_validTransfer_grantsQuota() {
        VietqrPayment qr = pendingQr(new BigDecimal("600000"));
        when(vietqrRepository.findByTransferContentForUpdate(CODE)).thenReturn(Optional.of(qr));
        PaymentTransaction tx = new PaymentTransaction();
        tx.setId(TX_ID);
        tx.setStatus("pending");
        when(transactionRepository.findByInvoice_Id(INVOICE_ID)).thenReturn(Optional.of(tx));
        QuotaTopup topup = new QuotaTopup();
        topup.setUser(qr.getInvoice().getUser());
        topup.setQuotaAdded(3);
        topup.setPriceVnd(new BigDecimal("600000"));
        topup.setStatus("pending");
        when(topupRepository.findByTransaction_Id(TX_ID)).thenReturn(Optional.of(topup));

        PaymentService.WebhookResult result =
                service.processWebhook(webhook("in", "0123456789", CODE, new BigDecimal("600000")));

        assertThat(result).isEqualTo(PaymentService.WebhookResult.CONFIRMED);
        assertThat(qr.getStatus()).isEqualTo("paid");
        assertThat(qr.getMatchedRef()).isEqualTo("999");
        verify(usersRepository).addQuota(USER_ID, 3);
        verify(billingEventRepository).save(any(BillingEvent.class));
        verify(paymentEmailService).sendInvoiceEmail(
                eq("buyer@example.com"), eq("Test Buyer"), eq("INV-1"),
                isNull(), eq(3), any(), eq(CODE), eq("999"), any());
    }

    @Test
    void webhook_duplicate_doesNotCreditTwice() {
        VietqrPayment qr = pendingQr(new BigDecimal("600000"));
        qr.setStatus("paid"); // already confirmed by a previous webhook
        when(vietqrRepository.findByTransferContentForUpdate(CODE)).thenReturn(Optional.of(qr));

        PaymentService.WebhookResult result =
                service.processWebhook(webhook("in", "0123456789", CODE, new BigDecimal("600000")));

        assertThat(result).isEqualTo(PaymentService.WebhookResult.DUPLICATE);
        verify(usersRepository, never()).addQuota(any(), anyInt());
    }

    @Test
    void webhook_wrongAmount_doesNotFulfill() {
        VietqrPayment qr = pendingQr(new BigDecimal("600000"));
        when(vietqrRepository.findByTransferContentForUpdate(CODE)).thenReturn(Optional.of(qr));

        PaymentService.WebhookResult result =
                service.processWebhook(webhook("in", "0123456789", CODE, new BigDecimal("500000")));

        assertThat(result).isEqualTo(PaymentService.WebhookResult.AMOUNT_MISMATCH);
        verify(usersRepository, never()).addQuota(any(), anyInt());
    }

    @Test
    void webhook_afterExpiry_stillHonoredBecauseMoneyArrived() {
        VietqrPayment qr = pendingQr(new BigDecimal("600000"));
        qr.setExpiresAt(Instant.now().minusSeconds(60));
        when(vietqrRepository.findByTransferContentForUpdate(CODE)).thenReturn(Optional.of(qr));
        PaymentTransaction tx = new PaymentTransaction();
        tx.setId(TX_ID);
        tx.setStatus("expired");
        when(transactionRepository.findByInvoice_Id(INVOICE_ID)).thenReturn(Optional.of(tx));
        QuotaTopup topup = new QuotaTopup();
        topup.setUser(qr.getInvoice().getUser());
        topup.setQuotaAdded(3);
        topup.setPriceVnd(new BigDecimal("600000"));
        topup.setStatus("expired");
        when(topupRepository.findByTransaction_Id(TX_ID)).thenReturn(Optional.of(topup));

        PaymentService.WebhookResult result =
                service.processWebhook(webhook("in", "0123456789", CODE, new BigDecimal("600000")));

        assertThat(result).isEqualTo(PaymentService.WebhookResult.CONFIRMED);
        assertThat(qr.getStatus()).isEqualTo("paid");
        verify(usersRepository).addQuota(USER_ID, 3);
    }

    @Test
    void webhook_overpayment_isAccepted() {
        VietqrPayment qr = pendingQr(new BigDecimal("600000"));
        when(vietqrRepository.findByTransferContentForUpdate(CODE)).thenReturn(Optional.of(qr));
        PaymentTransaction tx = new PaymentTransaction();
        tx.setId(TX_ID);
        tx.setStatus("pending");
        when(transactionRepository.findByInvoice_Id(INVOICE_ID)).thenReturn(Optional.of(tx));
        QuotaTopup topup = new QuotaTopup();
        topup.setUser(qr.getInvoice().getUser());
        topup.setQuotaAdded(3);
        topup.setPriceVnd(new BigDecimal("600000"));
        topup.setStatus("pending");
        when(topupRepository.findByTransaction_Id(TX_ID)).thenReturn(Optional.of(topup));

        PaymentService.WebhookResult result =
                service.processWebhook(webhook("in", "0123456789", CODE, new BigDecimal("650000")));

        assertThat(result).isEqualTo(PaymentService.WebhookResult.CONFIRMED);
        assertThat(qr.getInvoice().getAmountPaidVnd()).isEqualByComparingTo("650000");
        verify(usersRepository).addQuota(USER_ID, 3);
    }

    @Test
    void webhook_wrongDirection_isIrrelevant() {
        PaymentService.WebhookResult result =
                service.processWebhook(webhook("out", "0123456789", CODE, new BigDecimal("600000")));
        assertThat(result).isEqualTo(PaymentService.WebhookResult.IRRELEVANT);
        verify(vietqrRepository, never()).findByTransferContentForUpdate(any());
    }

    @Test
    void webhook_wrongAccount_isIrrelevant() {
        PaymentService.WebhookResult result =
                service.processWebhook(webhook("in", "9999999999", CODE, new BigDecimal("600000")));
        assertThat(result).isEqualTo(PaymentService.WebhookResult.IRRELEVANT);
        verify(vietqrRepository, never()).findByTransferContentForUpdate(any());
    }

    @Test
    void webhook_unknownReference_isIrrelevant() {
        when(vietqrRepository.findByTransferContentForUpdate(CODE)).thenReturn(Optional.empty());
        PaymentService.WebhookResult result =
                service.processWebhook(webhook("in", "0123456789", CODE, new BigDecimal("600000")));
        assertThat(result).isEqualTo(PaymentService.WebhookResult.IRRELEVANT);
        verify(usersRepository, never()).addQuota(any(), anyInt());
    }

    // ── plan checkout ───────────────────────────────────────────────────

    @Test
    void createPlanCheckout_usesPlanPrice_andCreatesPlanPurchase() {
        Users user = new Users();
        user.setId(USER_ID);
        Plan plan = new Plan();
        plan.setId(2);
        plan.setName("starter");
        plan.setPriceVnd(new BigDecimal("2000000"));
        plan.setMonthlyQuota(15);
        plan.setBillingCycle("monthly");
        when(usersRepository.findById(USER_ID)).thenReturn(Optional.of(user));
        when(planRepository.findByNameIgnoreCase("starter")).thenReturn(Optional.of(plan));
        when(vietqrRepository.existsByTransferContent(any())).thenReturn(false);
        when(invoiceRepository.save(any())).thenAnswer(a -> {
            Invoice i = a.getArgument(0);
            if (i.getId() == null) i.setId(INVOICE_ID);
            return i;
        });
        when(transactionRepository.save(any())).thenAnswer(a -> {
            PaymentTransaction t = a.getArgument(0);
            if (t.getId() == null) t.setId(TX_ID);
            return t;
        });
        when(vietqrRepository.save(any())).thenAnswer(a -> a.getArgument(0));

        PaymentDTO.TopupResponse resp = service.createPlanCheckout(USER_ID, "starter");

        assertThat(resp.getAmountVnd()).isEqualByComparingTo("2000000");
        assertThat(resp.getStatus()).isEqualTo("pending");
        ArgumentCaptor<PlanPurchase> cap = ArgumentCaptor.forClass(PlanPurchase.class);
        verify(planPurchaseRepository).save(cap.capture());
        assertThat(cap.getValue().getPlan().getName()).isEqualTo("starter");
        assertThat(cap.getValue().getPriceVnd()).isEqualByComparingTo("2000000");
    }

    @Test
    void webhook_planPurchase_assignsPlanAndQuota() {
        VietqrPayment qr = pendingQr(new BigDecimal("2000000"));
        when(vietqrRepository.findByTransferContentForUpdate(CODE)).thenReturn(Optional.of(qr));
        PaymentTransaction tx = new PaymentTransaction();
        tx.setId(TX_ID);
        tx.setStatus("pending");
        when(transactionRepository.findByInvoice_Id(INVOICE_ID)).thenReturn(Optional.of(tx));
        when(topupRepository.findByTransaction_Id(TX_ID)).thenReturn(Optional.empty());
        Plan plan = new Plan();
        plan.setId(2);
        plan.setName("starter");
        plan.setMonthlyQuota(15);
        plan.setBillingCycle("monthly");
        PlanPurchase pp = new PlanPurchase();
        pp.setUser(qr.getInvoice().getUser());
        pp.setPlan(plan);
        pp.setPriceVnd(new BigDecimal("2000000"));
        pp.setStatus("pending");
        when(planPurchaseRepository.findByTransaction_Id(TX_ID)).thenReturn(Optional.of(pp));

        PaymentService.WebhookResult result =
                service.processWebhook(webhook("in", "0123456789", CODE, new BigDecimal("2000000")));

        assertThat(result).isEqualTo(PaymentService.WebhookResult.CONFIRMED);
        ArgumentCaptor<Users> userCap = ArgumentCaptor.forClass(Users.class);
        verify(usersRepository).save(userCap.capture());
        assertThat(userCap.getValue().getPlan().getName()).isEqualTo("starter");
        assertThat(userCap.getValue().getQuotaRemaining()).isEqualTo(15);
        verify(subscriptionRepository).save(any(Subscription.class));
        verify(usersRepository, never()).addQuota(any(), anyInt());
        verify(paymentEmailService).sendInvoiceEmail(
                eq("buyer@example.com"), eq("Test Buyer"), eq("INV-1"),
                eq("starter"), eq(15), any(), eq(CODE), eq("999"), any());
    }

    @Test
    void webhook_planPurchase_cancelsPreviousActiveSubscription() {
        VietqrPayment qr = pendingQr(new BigDecimal("2000000"));
        when(vietqrRepository.findByTransferContentForUpdate(CODE)).thenReturn(Optional.of(qr));
        PaymentTransaction tx = new PaymentTransaction();
        tx.setId(TX_ID);
        tx.setStatus("pending");
        when(transactionRepository.findByInvoice_Id(INVOICE_ID)).thenReturn(Optional.of(tx));
        when(topupRepository.findByTransaction_Id(TX_ID)).thenReturn(Optional.empty());
        Plan plan = new Plan();
        plan.setId(2);
        plan.setName("pro");
        plan.setMonthlyQuota(50);
        plan.setBillingCycle("monthly");
        PlanPurchase pp = new PlanPurchase();
        pp.setUser(qr.getInvoice().getUser());
        pp.setPlan(plan);
        pp.setPriceVnd(new BigDecimal("2000000"));
        pp.setStatus("pending");
        when(planPurchaseRepository.findByTransaction_Id(TX_ID)).thenReturn(Optional.of(pp));

        Subscription oldSub = Subscription.builder().status("active").build();
        when(subscriptionRepository.findByUser_IdAndStatus(USER_ID, "active"))
                .thenReturn(java.util.List.of(oldSub));

        service.processWebhook(webhook("in", "0123456789", CODE, new BigDecimal("2000000")));

        assertThat(oldSub.getStatus()).isEqualTo("canceled");
        assertThat(oldSub.getCancelAt()).isNotNull();
        verify(subscriptionRepository).saveAll(java.util.List.of(oldSub));
    }

    // ── helpers ────────────────────────────────────────────────────────

    private VietqrPayment pendingQr(BigDecimal amount) {
        Users user = new Users();
        user.setId(USER_ID);
        user.setQuotaRemaining(5);
        user.setEmail("buyer@example.com");
        user.setFullName("Test Buyer");
        Invoice invoice = new Invoice();
        invoice.setId(INVOICE_ID);
        invoice.setInvoiceNo("INV-1");
        invoice.setUser(user);
        invoice.setStatus("pending");
        VietqrPayment qr = new VietqrPayment();
        qr.setId(UUID.randomUUID());
        qr.setInvoice(invoice);
        qr.setTransferContent(CODE);
        qr.setExpectedAmountVnd(amount);
        qr.setStatus("pending");
        qr.setExpiresAt(Instant.now().plusSeconds(600));
        return qr;
    }

    private PaymentDTO.SepayWebhook webhook(String type, String account, String code, BigDecimal amount) {
        PaymentDTO.SepayWebhook p = new PaymentDTO.SepayWebhook();
        p.setId(999L);
        p.setTransferType(type);
        p.setAccountNumber(account);
        p.setCode(code);
        p.setTransferAmount(amount);
        p.setContent("CT DEN:" + code);
        return p;
    }
}

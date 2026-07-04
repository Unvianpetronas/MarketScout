package com.example.backend.payment;

import com.example.backend.domain.VietqrPayment;
import com.example.backend.domain.VietqrPaymentRepository;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

/**
 * Safety net for missed SePay webhooks.
 *
 * The webhook is the primary confirmation path, but it is a single point of
 * failure: if SePay cannot reach the server (downtime, misconfigured URL, bad
 * API key) the buyer's money arrives while the order stays pending forever.
 * This poller periodically asks SePay's transaction-list API for recent
 * incoming transfers and confirms any open order whose payment code and amount
 * match — through the exact same locked, idempotent path the webhook uses.
 *
 * Enabled only when {@code app.payment.sepay-api-token} is configured.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class SepayReconciliationService {

    private static final Pattern CODE_PATTERN = Pattern.compile("MSQT[A-Z0-9]+");
    private static final DateTimeFormatter SEPAY_DATE =
            DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss").withZone(ZoneId.of("Asia/Ho_Chi_Minh"));

    private final VietqrPaymentRepository vietqrRepository;
    private final PaymentService paymentService;
    private final PaymentProperties props;
    private final RestTemplate restTemplate;

    @Scheduled(fixedDelayString = "${app.payment.reconcile-sweep-ms:90000}", initialDelay = 30000)
    public void reconcilePendingPayments() {
        String token = props.getSepayApiToken();
        if (token == null || token.isBlank()) return;

        Instant cutoff = Instant.now().minus(props.getReconcileLookbackHours(), ChronoUnit.HOURS);
        List<VietqrPayment> open = vietqrRepository.findByStatusInAndCreatedAtAfter(
                List.of(PaymentService.STATUS_PENDING, PaymentService.STATUS_EXPIRED), cutoff);
        if (open.isEmpty()) return;

        Map<String, VietqrPayment> byCode = open.stream()
                .collect(Collectors.toMap(VietqrPayment::getTransferContent, Function.identity(), (a, b) -> a));
        Instant earliest = open.stream().map(VietqrPayment::getCreatedAt).min(Instant::compareTo).orElse(cutoff);

        List<SepayTx> transactions;
        try {
            transactions = fetchIncomingTransactions(token, earliest.minus(5, ChronoUnit.MINUTES));
        } catch (Exception e) {
            log.warn("SePay reconciliation fetch failed: {}", e.getMessage());
            return;
        }

        int confirmed = 0;
        for (SepayTx tx : transactions) {
            BigDecimal amountIn = tx.amountIn();
            if (amountIn == null || amountIn.signum() <= 0) continue;
            String code = extractCode(tx);
            if (code == null || !byCode.containsKey(code)) continue;

            String ref = tx.getId() != null ? tx.getId() : tx.getReferenceNumber();
            PaymentService.WebhookResult result =
                    paymentService.confirmTransfer(code, amountIn, ref, "reconciliation");
            if (result == PaymentService.WebhookResult.CONFIRMED) {
                confirmed++;
                log.warn("Reconciliation recovered a missed payment — code={} amount={} sepayRef={}. "
                        + "Check that the SePay webhook URL and API key are configured correctly.",
                        code, amountIn, ref);
            }
        }
        if (confirmed > 0) {
            log.info("Reconciliation confirmed {} previously unmatched payment(s)", confirmed);
        }
    }

    private List<SepayTx> fetchIncomingTransactions(String token, Instant since) {
        String url = UriComponentsBuilder.fromUriString(props.getSepayTxListUrl())
                .queryParam("account_number", props.getAccountNo())
                .queryParam("transaction_date_min", SEPAY_DATE.format(since))
                .queryParam("limit", 100)
                .build().toUriString();

        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(token);
        ResponseEntity<SepayTxListResponse> resp = restTemplate.exchange(
                url, HttpMethod.GET, new HttpEntity<>(headers), SepayTxListResponse.class);
        SepayTxListResponse body = resp.getBody();
        return body != null && body.getTransactions() != null ? body.getTransactions() : List.of();
    }

    private static String extractCode(SepayTx tx) {
        if (tx.getCode() != null && tx.getCode().toUpperCase().startsWith("MSQT")) {
            return tx.getCode().trim().toUpperCase();
        }
        if (tx.getTransactionContent() != null) {
            Matcher m = CODE_PATTERN.matcher(tx.getTransactionContent().toUpperCase());
            if (m.find()) return m.group();
        }
        return null;
    }

    // ── SePay userapi response shapes ──────────────────────────────────

    @Data
    @JsonIgnoreProperties(ignoreUnknown = true)
    static class SepayTxListResponse {
        private Integer status;
        private List<SepayTx> transactions;
    }

    @Data
    @JsonIgnoreProperties(ignoreUnknown = true)
    static class SepayTx {
        private String id;
        @JsonProperty("transaction_date")
        private String transactionDate;
        @JsonProperty("account_number")
        private String accountNumber;
        private String code;
        @JsonProperty("transaction_content")
        private String transactionContent;
        @JsonProperty("amount_in")
        private String amountInRaw;
        @JsonProperty("reference_number")
        private String referenceNumber;

        BigDecimal amountIn() {
            try {
                return amountInRaw == null || amountInRaw.isBlank() ? null : new BigDecimal(amountInRaw);
            } catch (NumberFormatException e) {
                return null;
            }
        }
    }
}

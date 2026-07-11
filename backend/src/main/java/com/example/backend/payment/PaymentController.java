package com.example.backend.payment;

import com.example.backend.config.JwtService;
import com.example.backend.shared.cache.CacheService;
import io.jsonwebtoken.Claims;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.Duration;
import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Slf4j
@RestController
@RequestMapping("/api/v1/payments")
@RequiredArgsConstructor
public class PaymentController {

    private final PaymentService paymentService;
    private final JwtService jwtService;
    private final PaymentProperties paymentProperties;
    private final CacheService cacheService;

    private static final int WEBHOOK_RATE_LIMIT = 30;
    private static final Duration WEBHOOK_RATE_LIMIT_WINDOW = Duration.ofMinutes(1);

    /**
     * POST /api/v1/payments/topups
     * Creates a pending quota top-up and returns VietQR transfer instructions.
     */
    @PostMapping("/topups")
    public ResponseEntity<PaymentDTO.TopupResponse> createTopup(
            @RequestHeader("Authorization") String authHeader,
            @Valid @RequestBody PaymentDTO.TopupRequest request) {
        UUID userId = extractUserId(authHeader);
        return ResponseEntity.ok(paymentService.createTopup(userId, request.getQuantity()));
    }

    /**
     * POST /api/v1/payments/plans
     * Creates a one-time VietQR checkout to buy a subscription plan.
     */
    @PostMapping("/plans")
    public ResponseEntity<PaymentDTO.TopupResponse> createPlanCheckout(
            @RequestHeader("Authorization") String authHeader,
            @Valid @RequestBody PaymentDTO.PlanCheckoutRequest request) {
        UUID userId = extractUserId(authHeader);
        return ResponseEntity.ok(paymentService.createPlanCheckout(userId, request.getPlan()));
    }

    /**
     * GET /api/v1/payments/topups/{invoiceId}/status
     * Owner-only poll for payment state (pending | paid | expired).
     */
    @GetMapping("/topups/{invoiceId}/status")
    public ResponseEntity<PaymentDTO.StatusResponse> getStatus(
            @RequestHeader("Authorization") String authHeader,
            @PathVariable UUID invoiceId) {
        UUID userId = extractUserId(authHeader);
        return ResponseEntity.ok(paymentService.getStatus(invoiceId, userId));
    }

    /**
     * GET /api/v1/payments/invoices
     * Owner-only billing history — real invoices, newest first.
     */
    @GetMapping("/invoices")
    public ResponseEntity<List<PaymentDTO.InvoiceSummaryResponse>> listInvoices(
            @RequestHeader("Authorization") String authHeader) {
        UUID userId = extractUserId(authHeader);
        return ResponseEntity.ok(paymentService.listInvoices(userId));
    }

    /**
     * POST /api/v1/payments/webhooks/sepay
     * Public (no JWT) — authenticated by SePay's Apikey header.
     * Returns {"success": true} for any authenticated, processed transaction
     * (including duplicates and irrelevant ones); HTTP 401 for a bad key.
     */
    @PostMapping("/webhooks/sepay")
    public ResponseEntity<Map<String, Object>> sepayWebhook(
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            @RequestBody PaymentDTO.SepayWebhook payload,
            HttpServletRequest request) {

        String clientIp = clientIp(request);

        long count = cacheService.incrementCounter("sepay:webhook:rate:" + clientIp, WEBHOOK_RATE_LIMIT_WINDOW, 1);
        if (count > WEBHOOK_RATE_LIMIT) {
            log.warn("SePay webhook REJECTED (429) — rate limit exceeded from ip={}", clientIp);
            return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS)
                    .body(Map.of("success", false, "message", "Rate limit exceeded"));
        }

        if (!isAllowedIp(clientIp)) {
            log.warn("SePay webhook REJECTED (403) — ip={} not in app.payment.sepay-ip-allowlist", clientIp);
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("success", false, "message", "IP not allowed"));
        }

        if (!paymentService.isValidApiKey(authHeader)) {
            // Without this log a mis-keyed webhook fails invisibly while the
            // buyer's money is already in the account.
            log.warn("SePay webhook REJECTED (401) — Authorization header {}. sepayRef={} content={}",
                    authHeader == null ? "missing" : "did not match SEPAY_API_KEY",
                    payload != null ? payload.getId() : null,
                    payload != null ? payload.getContent() : null);
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("success", false, "message", "Invalid API key"));
        }
        PaymentService.WebhookResult result = paymentService.processWebhook(payload);
        if (result == PaymentService.WebhookResult.CONFIRMED
                || result == PaymentService.WebhookResult.DUPLICATE) {
            log.info("SePay webhook processed — sepayRef={} result={}", payload.getId(), result);
        } else {
            log.warn("SePay webhook NOT fulfilled — sepayRef={} result={} content={} amount={}",
                    payload.getId(), result, payload.getContent(), payload.getTransferAmount());
        }
        return ResponseEntity.ok(Map.of("success", true));
    }

    private UUID extractUserId(String authHeader) {
        Claims claims = jwtService.parseToken(authHeader.replace("Bearer ", ""));
        return jwtService.getId(claims);
    }

    /** First hop of X-Forwarded-For (reverse-proxy/PaaS deploys) or the raw remote address. */
    private String clientIp(HttpServletRequest request) {
        String forwarded = request.getHeader("X-Forwarded-For");
        if (forwarded != null && !forwarded.isBlank()) {
            return forwarded.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }

    /** Disabled (allows any IP) until app.payment.sepay-ip-allowlist is configured. */
    private boolean isAllowedIp(String clientIp) {
        String allowlist = paymentProperties.getSepayIpAllowlist();
        if (allowlist == null || allowlist.isBlank()) return true;
        return Arrays.stream(allowlist.split(","))
                .map(String::trim)
                .filter(ip -> !ip.isEmpty())
                .anyMatch(ip -> ip.equals(clientIp));
    }
}

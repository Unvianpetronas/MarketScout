package com.example.backend.payment;

import com.example.backend.config.JwtService;
import io.jsonwebtoken.Claims;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.UUID;

@Slf4j
@RestController
@RequestMapping("/api/v1/payments")
@RequiredArgsConstructor
public class PaymentController {

    private final PaymentService paymentService;
    private final JwtService jwtService;

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
     * POST /api/v1/payments/webhooks/sepay
     * Public (no JWT) — authenticated by SePay's Apikey header.
     * Returns {"success": true} for any authenticated, processed transaction
     * (including duplicates and irrelevant ones); HTTP 401 for a bad key.
     */
    @PostMapping("/webhooks/sepay")
    public ResponseEntity<Map<String, Object>> sepayWebhook(
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            @RequestBody PaymentDTO.SepayWebhook payload) {

        if (!paymentService.isValidApiKey(authHeader)) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("success", false, "message", "Invalid API key"));
        }
        PaymentService.WebhookResult result = paymentService.processWebhook(payload);
        log.info("SePay webhook processed — sepayRef={} result={}", payload.getId(), result);
        return ResponseEntity.ok(Map.of("success", true));
    }

    private UUID extractUserId(String authHeader) {
        Claims claims = jwtService.parseToken(authHeader.replace("Bearer ", ""));
        return jwtService.getId(claims);
    }
}

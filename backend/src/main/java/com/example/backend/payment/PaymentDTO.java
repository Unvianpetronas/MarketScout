package com.example.backend.payment;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public class PaymentDTO {

    // ── Create top-up ──────────────────────────────────────────────────

    @Data @NoArgsConstructor @AllArgsConstructor
    public static class TopupRequest {
        @NotNull
        @Min(value = 1, message = "Quantity must be at least 1")
        @Max(value = 1000, message = "Quantity must be at most 1000")
        private Integer quantity;
    }

    @Data @NoArgsConstructor @AllArgsConstructor
    public static class PlanCheckoutRequest {
        @jakarta.validation.constraints.NotBlank
        private String plan;   // plan name: starter | pro | ...
    }

    @Data @NoArgsConstructor @AllArgsConstructor @Builder
    public static class TopupResponse {
        private UUID       invoiceId;
        private int        quantity;
        private BigDecimal amountVnd;
        private String     qrUrl;
        private String     transferContent;
        private String     bankCode;
        private String     accountNo;
        private String     accountName;
        private String     status;       // pending | paid | expired
        private Instant    expiresAt;
    }

    // ── Status poll ────────────────────────────────────────────────────

    @Data @NoArgsConstructor @AllArgsConstructor @Builder
    public static class StatusResponse {
        private UUID    invoiceId;
        private String  status;          // pending | paid | expired
        private int     quotaRemaining;  // user balance after a confirmed payment
    }

    // ── SePay webhook payload ──────────────────────────────────────────
    // https://developer.sepay.vn/vi/sepay-webhooks/tich-hop-webhook
    @Data @NoArgsConstructor @AllArgsConstructor
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class SepayWebhook {
        private Long       id;             // SePay transaction id (idempotency ref)
        private String     gateway;
        private String     transactionDate;
        private String     accountNumber;  // receiving account
        private String     code;           // payment code SePay parsed (may be null)
        private String     content;        // raw transfer content
        private String     transferType;   // "in" | "out"
        private BigDecimal transferAmount;
        private String     referenceCode;
    }
}

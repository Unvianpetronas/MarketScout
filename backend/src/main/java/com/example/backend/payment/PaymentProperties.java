package com.example.backend.payment;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

/**
 * Bank / SePay configuration for the VietQR quota-top-up flow.
 * Bound from {@code app.payment.*} in application.properties.
 */
@Data
@Component
@ConfigurationProperties(prefix = "app.payment")
public class PaymentProperties {

    /** How long a generated VietQR stays valid before expiry. */
    private int qrExpiryMinutes = 15;

    /** Napas/SePay bank short code of the receiving account (e.g. "MB"). */
    private String bankCode;

    /** Receiving account number that SePay watches for incoming transfers. */
    private String accountNo;

    /** Display name shown on the QR. */
    private String accountName;

    /** Shared secret sent by SePay as {@code Authorization: Apikey <key>}. */
    private String sepayApiKey;

    /** SePay dynamic-QR image endpoint. */
    private String sepayQrBaseUrl = "https://qr.sepay.vn/img";

    /**
     * SePay "userapi" Bearer token used by the reconciliation poller to list
     * incoming transactions. Optional — when blank, reconciliation is disabled
     * and only the webhook confirms payments.
     */
    private String sepayApiToken;

    /** SePay transaction-list endpoint polled by the reconciler. */
    private String sepayTxListUrl = "https://my.sepay.vn/userapi/transactions/list";

    /** How far back the reconciler looks for unconfirmed-but-paid orders. */
    private int reconcileLookbackHours = 24;

    /**
     * Comma-separated IP allowlist for the SePay webhook. Empty (default) = disabled —
     * set this once SePay publishes its outbound IP ranges, no code change needed.
     */
    private String sepayIpAllowlist = "";
}

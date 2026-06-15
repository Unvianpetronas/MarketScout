package com.example.backend.domain;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.ColumnDefault;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Getter
@Setter
@Entity
@Table(name = "vietqr_payments")
public class VietqrPayment {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", nullable = false)
    private UUID id;

    @NotNull
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "invoice_id", nullable = false)
    private Invoice invoice;

    @Size(max = 10)
    @NotNull
    @Column(name = "bank_code", nullable = false, length = 10)
    private String bankCode;

    @Size(max = 50)
    @NotNull
    @Column(name = "account_no", nullable = false, length = 50)
    private String accountNo;

    @Size(max = 50)
    @NotNull
    @Column(name = "transfer_content", nullable = false, length = 50)
    private String transferContent;

    @NotNull
    @Column(name = "expected_amount_vnd", nullable = false, precision = 18)
    private BigDecimal expectedAmountVnd;

    @Column(name = "qr_data_url", columnDefinition = "text")
    private String qrDataUrl;

    @Size(max = 20)
    @NotNull
    @ColumnDefault("'pending'")
    @Column(name = "status", nullable = false, length = 20)
    private String status;

    @Size(max = 255)
    @Column(name = "matched_ref")
    private String matchedRef;

    @NotNull
    @Column(name = "expires_at", nullable = false)
    private Instant expiresAt;

    @Column(name = "matched_at")
    private Instant matchedAt;

    @NotNull
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @PrePersist
    protected void onCreate() {
        if (createdAt == null) createdAt = Instant.now();
    }
}
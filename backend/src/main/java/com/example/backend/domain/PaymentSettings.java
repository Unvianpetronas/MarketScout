package com.example.backend.domain;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotNull;
import lombok.*;

import java.math.BigDecimal;
import java.time.Instant;

/** Single-row table (id always 1) holding admin-editable payment config. */
@Getter @Setter
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "payment_settings")
public class PaymentSettings {
    @Id
    @Column(name = "id", nullable = false)
    private Integer id;

    @NotNull
    @Column(name = "price_per_credit_vnd", nullable = false, precision = 18)
    private BigDecimal pricePerCreditVnd;

    @NotNull
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;
}

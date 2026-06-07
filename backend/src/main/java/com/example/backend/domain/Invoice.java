package com.example.backend.domain;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.ColumnDefault;
import org.hibernate.annotations.Nationalized;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Getter
@Setter
@Entity
@Table(name = "invoices")
public class Invoice {
    @Id
    @ColumnDefault("newid()")
    @Column(name = "id", nullable = false)
    private UUID id;

    @NotNull
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private Users user;

    @Size(max = 50)
    @NotNull
    @Nationalized
    @Column(name = "invoice_no", nullable = false, length = 50)
    private String invoiceNo;

    @Size(max = 20)
    @NotNull
    @Nationalized
    @ColumnDefault("'draft'")
    @Column(name = "status", nullable = false, length = 20)
    private String status;

    @NotNull
    @ColumnDefault("0")
    @Column(name = "subtotal_vnd", nullable = false, precision = 18)
    private BigDecimal subtotalVnd;

    @NotNull
    @ColumnDefault("0")
    @Column(name = "tax_vnd", nullable = false, precision = 18)
    private BigDecimal taxVnd;

    @NotNull
    @ColumnDefault("0")
    @Column(name = "total_vnd", nullable = false, precision = 18)
    private BigDecimal totalVnd;

    @NotNull
    @ColumnDefault("0")
    @Column(name = "amount_paid_vnd", nullable = false, precision = 18)
    private BigDecimal amountPaidVnd;

    @NotNull
    @Column(name = "period_start", nullable = false)
    private Instant periodStart;

    @NotNull
    @Column(name = "period_end", nullable = false)
    private Instant periodEnd;

    @NotNull
    @Column(name = "due_at", nullable = false)
    private Instant dueAt;

    @Column(name = "paid_at")
    private Instant paidAt;

    @NotNull
    @ColumnDefault("getutcdate()")
    @Column(name = "created_at", nullable = false)
    private Instant createdAt;


}
package com.example.backend.model;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.ColumnDefault;
import org.hibernate.annotations.Nationalized;

import java.time.Instant;
import java.util.UUID;

@Getter
@Setter
@Entity
@Table(name = "payment_methods")
public class PaymentMethod {
    @Id
    @ColumnDefault("newid()")
    @Column(name = "id", nullable = false)
    private UUID id;

    @NotNull
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private Users user;

    @Size(max = 20)
    @NotNull
    @Nationalized
    @Column(name = "provider", nullable = false, length = 20)
    private String provider;

    @Size(max = 20)
    @NotNull
    @Nationalized
    @Column(name = "method_type", nullable = false, length = 20)
    private String methodType;

    @Size(max = 100)
    @NotNull
    @Nationalized
    @Column(name = "display_name", nullable = false, length = 100)
    private String displayName;

    @Size(max = 500)
    @NotNull
    @Nationalized
    @Column(name = "provider_token", nullable = false, length = 500)
    private String providerToken;

    @Nationalized
    @Lob
    @Column(name = "metadata")
    private String metadata;

    @NotNull
    @ColumnDefault("0")
    @Column(name = "is_default", nullable = false)
    private Boolean isDefault;

    @NotNull
    @ColumnDefault("1")
    @Column(name = "is_active", nullable = false)
    private Boolean isActive;

    @Column(name = "expires_at")
    private Instant expiresAt;

    @NotNull
    @ColumnDefault("getutcdate()")
    @Column(name = "created_at", nullable = false)
    private Instant createdAt;


}
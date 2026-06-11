package com.example.backend.domain;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.ColumnDefault;

import java.time.Instant;
import java.util.UUID;

@Getter
@Setter
@Entity
@Table(name = "report_shares")
public class ReportShare {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", nullable = false)
    private UUID id;

    @NotNull
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "created_by", nullable = false)
    private Users createdBy;

    @Size(max = 100)
    @NotNull
    @Column(name = "share_token", nullable = false, length = 100)
    private String shareToken;

    @NotNull
    @ColumnDefault("false")
    @Column(name = "requires_password", nullable = false)
    private Boolean requiresPassword;

    @Size(max = 255)
    @Column(name = "password_hash")
    private String passwordHash;

    @Column(name = "expires_at")
    private Instant expiresAt;

    @NotNull
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @PrePersist
    protected void onCreate() {
        if (createdAt == null) createdAt = Instant.now();
    }
}
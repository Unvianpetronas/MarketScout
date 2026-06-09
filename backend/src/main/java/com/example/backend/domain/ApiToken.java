package com.example.backend.domain;

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
@Table(name = "api_tokens")
public class ApiToken {
    @Id
    @ColumnDefault("newid()")
    @Column(name = "id", nullable = false)
    private UUID id;

    @NotNull
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private Users user;

    @Size(max = 255)
    @NotNull
    @Nationalized
    @Column(name = "token_hash", nullable = false)
    private String tokenHash;

    @Size(max = 100)
    @Nationalized
    @Column(name = "label", length = 100)
    private String label;

    @Column(name = "last_used_at")
    private Instant lastUsedAt;

    @Column(name = "expires_at")
    private Instant expiresAt;

    @NotNull
    @ColumnDefault("getutcdate()")
    @Column(name = "created_at", nullable = false)
    private Instant createdAt;


}
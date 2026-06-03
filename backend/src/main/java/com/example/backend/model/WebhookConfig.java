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
@Table(name = "webhook_configs")
public class WebhookConfig {
    @Id
    @ColumnDefault("newid()")
    @Column(name = "id", nullable = false)
    private UUID id;

    @NotNull
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private Users user;

    @Size(max = 500)
    @NotNull
    @Nationalized
    @Column(name = "url", nullable = false, length = 500)
    private String url;

    @Size(max = 255)
    @NotNull
    @Nationalized
    @Column(name = "secret_hash", nullable = false)
    private String secretHash;

    @NotNull
    @Column(name = "event_types", nullable = false, columnDefinition = "text")
    private String eventTypes;

    @NotNull
    @ColumnDefault("1")
    @Column(name = "is_active", nullable = false)
    private Boolean isActive;

    @NotNull
    @ColumnDefault("getutcdate()")
    @Column(name = "created_at", nullable = false)
    private Instant createdAt;


}
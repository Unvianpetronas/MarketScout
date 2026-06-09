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
@Table(name = "webhook_deliveries")
public class WebhookDelivery {
    @Id
    @ColumnDefault("newid()")
    @Column(name = "id", nullable = false)
    private UUID id;

    @NotNull
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "webhook_id", nullable = false)
    private WebhookConfig webhook;

    @Size(max = 100)
    @NotNull
    @Nationalized
    @Column(name = "event_type", nullable = false, length = 100)
    private String eventType;

    @Column(name = "http_status")
    private Integer httpStatus;

    @Column(name = "error", columnDefinition = "text")
    private String error;

    @NotNull
    @ColumnDefault("0")
    @Column(name = "attempt_count", nullable = false)
    private Integer attemptCount;

    @Column(name = "delivered_at")
    private Instant deliveredAt;


}
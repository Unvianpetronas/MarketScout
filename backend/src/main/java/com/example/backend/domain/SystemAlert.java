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
@Table(name = "system_alerts")
public class SystemAlert {
    @Id
    @ColumnDefault("newid()")
    @Column(name = "id", nullable = false)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id")
    private Users user;

    @Size(max = 100)
    @NotNull
    @Nationalized
    @Column(name = "alert_type", nullable = false, length = 100)
    private String alertType;

    @Size(max = 10)
    @NotNull
    @Nationalized
    @Column(name = "severity", nullable = false, length = 10)
    private String severity;

    @NotNull
    @Column(name = "message", nullable = false, columnDefinition = "text")
    private String message;

    @NotNull
    @ColumnDefault("0")
    @Column(name = "is_resolved", nullable = false)
    private Boolean isResolved;

    @NotNull
    @ColumnDefault("getutcdate()")
    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "resolved_at")
    private Instant resolvedAt;


}
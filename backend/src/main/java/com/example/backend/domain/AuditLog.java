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
@Table(name = "audit_logs")
public class AuditLog {
    @Id
    @ColumnDefault("newid()")
    @Column(name = "id", nullable = false)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "actor_id")
    private Users actor;

    @Size(max = 100)
    @NotNull
    @Nationalized
    @Column(name = "\"action\"", nullable = false, length = 100)
    private String action;

    @Size(max = 50)
    @Nationalized
    @Column(name = "target_type", length = 50)
    private String targetType;

    @Column(name = "target_id")
    private UUID targetId;

    @Column(name = "payload", columnDefinition = "text")
    private String payload;

    @Size(max = 45)
    @Nationalized
    @Column(name = "ip_address", length = 45)
    private String ipAddress;

    @NotNull
    @ColumnDefault("getutcdate()")
    @Column(name = "created_at", nullable = false)
    private Instant createdAt;


}
package com.example.backend.domain;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.ColumnDefault;

import java.time.Instant;
import java.util.UUID;

/** A user's "báo kết quả sai" report against one of their own {@link Report}s. */
@Getter
@Setter
@Entity
@Table(name = "report_flags")
public class ReportFlag {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", nullable = false)
    private UUID id;

    @NotNull
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "report_id", nullable = false)
    private Report report;

    @NotNull
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private Users user;

    // WRONG_SCORE | WRONG_INFO | SANCTIONS_FALSE_POSITIVE | OTHER
    @Size(max = 30)
    @NotNull
    @Column(name = "reason", nullable = false, length = 30)
    private String reason;

    @Column(name = "note", columnDefinition = "text")
    private String note;

    // open | resolved | dismissed
    @Size(max = 20)
    @NotNull
    @ColumnDefault("'open'")
    @Column(name = "status", nullable = false, length = 20)
    private String status = "open";

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "resolved_by")
    private Users resolvedBy;

    @Column(name = "resolved_at")
    private Instant resolvedAt;

    @NotNull
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @PrePersist
    protected void onCreate() {
        if (createdAt == null) createdAt = Instant.now();
        if (status == null) status = "open";
    }
}

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
@Table(name = "report_jobs")
public class ReportJob {
    @Id
    @ColumnDefault("newid()")
    @Column(name = "id", nullable = false)
    private UUID id;

    @Size(max = 20)
    @NotNull
    @Nationalized
    @ColumnDefault("'queued'")
    @Column(name = "status", nullable = false, length = 20)
    private String status;

    @Column(name = "current_pillar")
    private Short currentPillar;

    @NotNull
    @ColumnDefault("0")
    @Column(name = "attempt_count", nullable = false)
    private Integer attemptCount;

    @Column(name = "error_message", columnDefinition = "text")
    private String errorMessage;

    @Column(name = "started_at")
    private Instant startedAt;

    @Column(name = "completed_at")
    private Instant completedAt;

    @NotNull
    @ColumnDefault("getutcdate()")
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;


}
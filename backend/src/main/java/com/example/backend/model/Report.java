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
@Table(name = "reports")
public class Report {
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
    @Column(name = "entity_name", nullable = false, length = 500)
    private String entityName;

    @Size(max = 2)
    @Nationalized
    @Column(name = "country_iso2", length = 2)
    private String countryIso2;

    @Size(max = 20)
    @NotNull
    @Nationalized
    @ColumnDefault("'standard'")
    @Column(name = "tier", nullable = false, length = 20)
    private String tier;

    @Column(name = "overall_score")
    private Short overallScore;

    @NotNull
    @ColumnDefault("0")
    @Column(name = "hard_stop", nullable = false)
    private Boolean hardStop;

    @Column(name = "raw_data", columnDefinition = "text")
    private String rawData;

    @NotNull
    @ColumnDefault("getutcdate()")
    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "updated_at")
    private Instant updatedAt;


}
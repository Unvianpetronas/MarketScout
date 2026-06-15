package com.example.backend.domain;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.ColumnDefault;

import java.util.UUID;

@Getter
@Setter
@Entity
@Table(name = "recommendations")
public class Recommendation {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", nullable = false)
    private UUID id;

    @NotNull
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "analysis_id", nullable = false)
    private DealAnalysis analysis;

    @Size(max = 20)
    @NotNull
    @Column(name = "rec_type", nullable = false, length = 20)
    private String recType;

    @NotNull
    @Column(name = "content", nullable = false, columnDefinition = "text")
    private String content;

    @NotNull
    @ColumnDefault("1")
    @Column(name = "priority", nullable = false)
    private Short priority;
}
package com.example.backend.domain;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.ColumnDefault;

import java.util.UUID;

@Getter
@Setter
@Entity
@Table(name = "tineye_results")
public class TineyeResult {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", nullable = false)
    private UUID id;

    @NotNull
    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "asset_id", nullable = false)
    private ImageAsset asset;

    @NotNull
    @ColumnDefault("0")
    @Column(name = "match_count", nullable = false)
    private Integer matchCount;

    @Column(name = "matches", columnDefinition = "text")
    private String matches;
}
package com.example.backend.model;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.Nationalized;

import java.time.Instant;

@Getter
@Setter
@Entity
@Table(name = "entity_cache")
public class EntityCache {
    @Id
    @Size(max = 450)
    @Nationalized
    @Column(name = "cache_key", nullable = false, length = 450)
    private String cacheKey;

    @NotNull
    @Column(name = "pillar_no", nullable = false)
    private Short pillarNo;

    @NotNull
    @Nationalized
    @Lob
    @Column(name = "cached_data", nullable = false)
    private String cachedData;

    @NotNull
    @Column(name = "expires_at", nullable = false)
    private Instant expiresAt;


}
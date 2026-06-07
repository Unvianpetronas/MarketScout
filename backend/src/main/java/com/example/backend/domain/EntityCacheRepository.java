package com.example.backend.domain;

import com.example.backend.domain.EntityCache;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface EntityCacheRepository extends JpaRepository<EntityCache, String> {
    Optional<EntityCache> findByCacheKey(String cacheKey);
}

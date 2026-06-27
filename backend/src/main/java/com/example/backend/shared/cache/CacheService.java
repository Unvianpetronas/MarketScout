package com.example.backend.shared.cache;

import com.example.backend.domain.EntityCache;
import com.example.backend.domain.EntityCacheRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.Instant;
import java.util.Optional;

@Slf4j
@Service
@RequiredArgsConstructor
public class CacheService {

    private final StringRedisTemplate redisTemplate;
    private final EntityCacheRepository entityCacheRepo;
    private final ObjectMapper objectMapper;

    public <T> Optional<T> get(String key, Class<T> type) {
        try {
            String value = redisTemplate.opsForValue().get(key);
            if (value != null) {
                return Optional.of(objectMapper.readValue(value, type));
            }
            // Redis miss — try PostgreSQL fallback
            return entityCacheRepo.findByCacheKey(key)
                .filter(c -> c.getExpiresAt().isAfter(Instant.now()))
                .map(c -> {
                    try {
                        T obj = objectMapper.readValue(c.getCachedData(), type);
                        // Re-warm Redis from DB
                        long ttlSecs = Duration.between(Instant.now(), c.getExpiresAt()).getSeconds();
                        if (ttlSecs > 0) {
                            redisTemplate.opsForValue().set(key, c.getCachedData(), Duration.ofSeconds(ttlSecs));
                        }
                        return obj;
                    } catch (Exception e) {
                        log.warn("DB cache deserialize failed for key {}: {}", key, e.getMessage());
                        return null;
                    }
                });
        } catch (Exception e) {
            log.warn("Cache get failed for key {}: {}", key, e.getMessage());
            return Optional.empty();
        }
    }

    public void set(String key, Object value, Duration ttl, short pillarNo, String dataSource, String countryIso2) {
        try {
            String json = objectMapper.writeValueAsString(value);
            redisTemplate.opsForValue().set(key, json, ttl);

            EntityCache cache = entityCacheRepo.findByCacheKey(key).orElse(new EntityCache());
            cache.setCacheKey(key);
            cache.setPillarNo(pillarNo);
            cache.setCachedData(json);
            cache.setExpiresAt(Instant.now().plus(ttl));
            cache.setDataSource(dataSource);
            cache.setCountryIso2(countryIso2);
            entityCacheRepo.save(cache);
        } catch (Exception e) {
            log.warn("Cache set failed for key {}: {}", key, e.getMessage());
        }
    }

    // Simplified overload without DB persistence (for transient keys like leads)
    public void setRedisOnly(String key, Object value, Duration ttl) {
        try {
            String json = objectMapper.writeValueAsString(value);
            redisTemplate.opsForValue().set(key, json, ttl);
        } catch (Exception e) {
            log.warn("Redis set failed for key {}: {}", key, e.getMessage());
        }
    }

    public Optional<String> getRaw(String key) {
        try {
            return Optional.ofNullable(redisTemplate.opsForValue().get(key));
        } catch (Exception e) {
            log.warn("Redis getRaw failed for key {}: {}", key, e.getMessage());
            return Optional.empty();
        }
    }

    public void delete(String key) {
        try {
            redisTemplate.delete(key);
        } catch (Exception e) {
            log.warn("Redis delete failed for key {}: {}", key, e.getMessage());
        }
    }

    // ── Atomic counters (rate / daily-budget guards) ───────────────────
    // All fail-open: on any Redis error they behave as if the counter is 0
    // so a Redis outage never blocks a legitimate API call.

    /**
     * Atomically increments {@code key} by {@code delta}, returning the new value.
     * The TTL is applied only on the first increment (when the value equals delta),
     * so the window starts when the first request of the period lands.
     */
    public long incrementCounter(String key, Duration ttl, long delta) {
        try {
            Long v = redisTemplate.opsForValue().increment(key, delta);
            if (v != null && v == delta) {
                redisTemplate.expire(key, ttl);
            }
            return v != null ? v : 0L;
        } catch (Exception e) {
            log.warn("incrementCounter failed for key {}: {}", key, e.getMessage());
            return 0L;
        }
    }

    /** Reads a counter; returns 0 on miss or any error (fail-open). */
    public long getCounter(String key) {
        try {
            String v = redisTemplate.opsForValue().get(key);
            return v != null ? Long.parseLong(v) : 0L;
        } catch (Exception e) {
            log.warn("getCounter failed for key {}: {}", key, e.getMessage());
            return 0L;
        }
    }

    /** Sets a counter to an exact value with a TTL. */
    public void setCounter(String key, long value, Duration ttl) {
        try {
            redisTemplate.opsForValue().set(key, String.valueOf(value), ttl);
        } catch (Exception e) {
            log.warn("setCounter failed for key {}: {}", key, e.getMessage());
        }
    }
}

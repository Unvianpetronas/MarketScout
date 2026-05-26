package com.example.backend.service;

import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class RefreshTokenService {

    private static final String PREFIX = "rt:";

    private final StringRedisTemplate redis;

    @Value("${jwt.refresh-expiration-ms:604800000}")
    private long refreshExpirationMs;

    public String create(UUID userId) {
        String token = UUID.randomUUID().toString().replace("-", "");
        redis.opsForValue().set(PREFIX + token, userId.toString(), Duration.ofMillis(refreshExpirationMs));
        return token;
    }

    public record RotateResult(String newToken, UUID userId) {}

    public RotateResult validateAndRotate(String token) {
        String userIdStr = redis.opsForValue().get(PREFIX + token);
        if (userIdStr == null) {
            throw new RuntimeException("Refresh token không hợp lệ hoặc đã hết hạn");
        }

        redis.delete(PREFIX + token);

        UUID userId = UUID.fromString(userIdStr);
        String newToken = create(userId);
        return new RotateResult(newToken, userId);
    }

    public void revokeByToken(String token) {
        redis.delete(PREFIX + token);
    }
}

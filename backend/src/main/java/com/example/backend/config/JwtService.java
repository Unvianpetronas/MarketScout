package com.example.backend.config;

import io.jsonwebtoken.*;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;
import java.util.Map;
import java.util.UUID;

@Component
public class JwtService {
    private final SecretKey key;
    private final long expirationMs;

    public JwtService(
            @Value("${jwt.secret:HrKmsSecretKeyMustBeAtLeast256BitsLongForHS256Algorithm2025!}") String secret,
            @Value("${jwt.expiration-ms:86400000}") long expirationMs) { // default 24h
        this.key = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
        this.expirationMs = expirationMs;
    }

    /**
     * Generate JWT token with user info embedded in claims.
     */
    public String generateToken(UUID id, String email, String role, String fullName) {
        Date now = new Date();
        String jti = UUID.randomUUID().toString().replace("-", "");
        return Jwts.builder()
                .subject(email)
                .id(jti)
                .claims(Map.of(
                        "id", id.toString(),
                        "role", role,
                        "fullName", fullName,
                        "email", email
                ))
                .issuedAt(now)
                .expiration(new Date(now.getTime() + expirationMs))
                .signWith(key)
                .compact();
    }

    /**
     * Parse and validate token → return Claims.
     * Throws exception nếu token invalid/expired.
     */
    public Claims parseToken(String token) {
        try {
            return Jwts.parser()
                    .verifyWith(key)
                    .build()
                    .parseSignedClaims(token)
                    .getPayload();
        } catch (ExpiredJwtException e) {
            throw new RuntimeException("Token expired, please log in again");
        } catch (JwtException e) {
            throw new RuntimeException("Invalid token");
        }
    }

    // === Convenience getters from Claims ===

    public UUID getId(Claims claims) {
        String idStr = claims.get("id", String.class);
        return UUID.fromString(idStr);
    }

    public String getRole(Claims claims) {
        return claims.get("role", String.class);
    }

    public String getFullName(Claims claims) {
        return claims.get("fullName", String.class);
    }

    public String getEmail(Claims claims) {
        return claims.get("email", String.class);
    }

    public String getJti(Claims claims) {
        return claims.getId();
    }

    public boolean isExpired(Claims claims) {
        return claims.getExpiration().before(new Date());
    }
}

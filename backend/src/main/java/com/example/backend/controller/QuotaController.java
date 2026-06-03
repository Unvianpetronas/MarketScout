package com.example.backend.controller;

import com.example.backend.DTO.QuotaDTO;
import com.example.backend.config.JwtService;
import com.example.backend.service.QuotaService;
import io.jsonwebtoken.Claims;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/quota")
@RequiredArgsConstructor
public class QuotaController {

    private final QuotaService quotaService;
    private final JwtService   jwtService;

    /**
     * GET /api/v1/quota/me
     * Returns the current user's quota status.
     * Called by frontend to show the quota badge and decide
     * whether to show the upsell modal before Deep Verify.
     *
     * Response:
     *   quotaRemaining      – verifies left this cycle
     *   quotaUsedThisCycle  – verifies consumed so far
     *   monthlyQuota        – plan ceiling (null = no plan)
     *   planName            – "free" / "starter" / "pro" / "enterprise"
     *   cycleResetAt        – next reset date (null = free plan, never resets)
     */
    @GetMapping("/me")
    public ResponseEntity<QuotaDTO.QuotaStatusResponse> getMyQuota(
            @RequestHeader("Authorization") String authHeader) {

        Claims claims = jwtService.parseToken(authHeader.replace("Bearer ", ""));
        UUID userId = jwtService.getId(claims);
        return ResponseEntity.ok(quotaService.getStatus(userId));
    }
}

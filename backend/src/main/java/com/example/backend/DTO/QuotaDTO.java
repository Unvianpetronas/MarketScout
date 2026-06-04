package com.example.backend.DTO;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.UUID;

public class QuotaDTO {

    // ── User-facing ───────────────────────────────────────────────────

    @Data @NoArgsConstructor @AllArgsConstructor @Builder
    public static class QuotaStatusResponse {
        private int     quotaRemaining;
        private int     quotaUsedThisCycle;
        private Integer monthlyQuota;   // null if no plan attached
        private String  planName;
        private Instant cycleResetAt;   // null = free plan, never resets
    }

    // ── Admin-facing ──────────────────────────────────────────────────

    @Data @NoArgsConstructor @AllArgsConstructor
    public static class AdminSetRequest {
        @NotNull
        @Min(value = 0, message = "Quota không được âm")
        private Integer quota;
    }

    @Data @NoArgsConstructor @AllArgsConstructor
    public static class QuotaResponse {
        private UUID   userId;
        private int    quotaRemaining;
        private String message;
    }
}

package com.example.backend.quota;

import com.example.backend.quota.QuotaDTO;
import com.example.backend.exception.AppException;
import com.example.backend.domain.Users;
import com.example.backend.domain.UsersRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class QuotaService {

    private final UsersRepository usersRepository;

    // ── Public API ────────────────────────────────────────────────────

    /** Returns the current quota status for the logged-in user. */
    @Transactional(readOnly = true)
    public QuotaDTO.QuotaStatusResponse getStatus(UUID userId) {
        Users user = usersRepository.findById(userId)
                .orElseThrow(() -> new AppException(AppException.ErrorCode.USER_NOT_FOUND));

        return QuotaDTO.QuotaStatusResponse.builder()
                .quotaRemaining(user.getQuotaRemaining())
                .quotaUsedThisCycle(user.getQuotaUsedThisCycle())
                .monthlyQuota(user.getPlan() != null ? user.getPlan().getMonthlyQuota() : null)
                .planName(user.getPlan() != null ? user.getPlan().getName() : null)
                .cycleResetAt(user.getCycleResetAt())
                .build();
    }


    /**
     * Called at the start of every Deep Verify before anything else runs.
     *
     * Flow
     *   1. Load user
     *   2. Reset cycle if anniversary has passed (paid plans only)
     *   3. Fast-fail if quota is visibly 0 (better error message)
     *   4. Atomic UPDATE … WHERE quota_remaining > 0 — race-condition safe
     *
     * Throws QUOTA_EXHAUSTED (HTTP 403) if the user has no quota left.
     */
    @Transactional
    public void checkAndDeduct(UUID userId) {
        Users user = usersRepository.findById(userId)
                .orElseThrow(() -> new AppException(AppException.ErrorCode.USER_NOT_FOUND));

        resetCycleIfExpired(user);

        // Fast-fail before hitting the DB — gives a clear message to the caller
        if (user.getQuotaRemaining() <= 0) {
            throw new AppException(AppException.ErrorCode.QUOTA_EXHAUSTED);
        }

        // Atomic deduct: returns 0 if another concurrent request consumed the last quota
        int updated = usersRepository.deductOneQuota(userId);
        if (updated == 0) {
            throw new AppException(AppException.ErrorCode.QUOTA_EXHAUSTED);
        }

        log.info("Quota deducted — user={} remaining={}", userId, user.getQuotaRemaining() - 1);
    }

    /**
     * Refunds 1 quota back to the user.
     * Called automatically by ScoringEngineService when the pipeline fails,
     * so the user never loses a quota for a system-side error.
     * Admin can also call this via POST /api/v1/admin/users/{id}/quota/refund
     * for edge cases (e.g. OS-level crash before the catch block runs).
     */
    @Transactional
    public void refundOne(UUID userId) {
        requireUserExists(userId);
        usersRepository.refundOneQuota(userId);
        log.info("Quota refunded — user={}", userId);
    }

    /**
     * Admin overrides quota to any exact value.
     * Called by PATCH /api/v1/admin/users/{id}/quota
     */
    @Transactional
    public void adminSetQuota(UUID userId, int newQuota) {
        if (newQuota < 0) {
            throw new AppException(AppException.ErrorCode.BAD_REQUEST, "Quota cannot be negative");
        }
        requireUserExists(userId);
        usersRepository.setQuotaRemaining(userId, newQuota);
        log.info("Admin set quota — user={} newQuota={}", userId, newQuota);
    }

    // ── Internal ──────────────────────────────────────────────────────

    /**
     * Resets quota when the billing anniversary date has passed.
     *
     * Free plan  → cycleResetAt == null → never reset (lifetime 2 verifies).
     * Paid plans → cycleResetAt advances 30 days from the stored date (not
     *              from now) so the anniversary day never drifts.
     */
    private void resetCycleIfExpired(Users user) {
        if (user.getCycleResetAt() == null) {
            return; // Free plan — lifetime quota, no cycle reset
        }

        if (Instant.now().isAfter(user.getCycleResetAt())) {
            int planQuota = user.getPlan() != null ? user.getPlan().getMonthlyQuota() : 0;
            Instant nextReset = user.getCycleResetAt().plus(30, ChronoUnit.DAYS);

            usersRepository.resetCycle(user.getId(), planQuota, nextReset);

            // Reflect in-memory so the fast-fail check below sees the updated quota
            user.setQuotaRemaining(planQuota);
            user.setQuotaUsedThisCycle(0);
            user.setCycleResetAt(nextReset);

            log.info("Quota cycle reset — user={} newQuota={} nextReset={}", user.getId(), planQuota, nextReset);
        }
    }

    private void requireUserExists(UUID userId) {
        if (!usersRepository.existsById(userId)) {
            throw new AppException(AppException.ErrorCode.USER_NOT_FOUND);
        }
    }
}

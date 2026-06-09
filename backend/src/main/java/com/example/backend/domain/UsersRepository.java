package com.example.backend.domain;

import com.example.backend.domain.Users;
import jakarta.transaction.Transactional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface UsersRepository extends JpaRepository<Users, UUID> {

    Optional<Users> findByEmail(String email);
    boolean existsByEmail(String email);

    // ── Quota mutations ───────────────────────────────────────────────

    // Atomic deduct: returns 1 = OK, 0 = already exhausted (race-condition safe)
    @Modifying
    @Transactional
    @Query("UPDATE Users u SET u.quotaRemaining = u.quotaRemaining - 1, " +
           "u.quotaUsedThisCycle = u.quotaUsedThisCycle + 1 " +
           "WHERE u.id = :userId AND u.quotaRemaining > 0")
    int deductOneQuota(@Param("userId") UUID userId);

    // Admin: add 1 back (manual refund after a failed report)
    @Modifying
    @Transactional
    @Query("UPDATE Users u SET u.quotaRemaining = u.quotaRemaining + 1 " +
           "WHERE u.id = :userId")
    void refundOneQuota(@Param("userId") UUID userId);

    // Cycle reset: called when anniversary date passes for paid plans
    @Modifying
    @Transactional
    @Query("UPDATE Users u SET u.quotaRemaining = :quota, " +
           "u.quotaUsedThisCycle = 0, " +
           "u.cycleResetAt = :nextResetAt " +
           "WHERE u.id = :userId")
    void resetCycle(@Param("userId") UUID userId,
                    @Param("quota") int quota,
                    @Param("nextResetAt") Instant nextResetAt);

    // Admin: set quota to an exact value without touching quotaUsedThisCycle
    @Modifying
    @Transactional
    @Query("UPDATE Users u SET u.quotaRemaining = :quota WHERE u.id = :userId")
    void setQuotaRemaining(@Param("userId") UUID userId, @Param("quota") int quota);
}

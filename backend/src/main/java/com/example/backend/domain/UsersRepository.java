package com.example.backend.domain;

import com.example.backend.domain.Users;
import jakarta.transaction.Transactional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface UsersRepository extends JpaRepository<Users, UUID> {

    Optional<Users> findByEmail(String email);
    boolean existsByEmail(String email);

    // Admin: single-user lookup with plan eagerly fetched (avoids LazyInitializationException
    // once the request-scoped session closes after the repository call returns)
    @Query("SELECT u FROM Users u LEFT JOIN FETCH u.plan WHERE u.id = :id")
    Optional<Users> findByIdWithPlan(@Param("id") UUID id);

    // Admin: paginated/filterable user list with plan eagerly fetched.
    // `search` must never be null — an empty string matches everything via the
    // '%%' LIKE pattern. Binding a literal null here makes Postgres unable to
    // infer the parameter type inside LOWER(CONCAT(...)) (it falls back to
    // bytea and "lower(bytea) does not exist" blows up the query).
    @Query("SELECT u FROM Users u LEFT JOIN FETCH u.plan WHERE " +
           "LOWER(u.email) LIKE LOWER(CONCAT('%', :search, '%')) " +
           "OR LOWER(u.fullName) LIKE LOWER(CONCAT('%', :search, '%'))")
    Page<Users> searchUsers(@Param("search") String search, Pageable pageable);

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

    // Top-up: atomically add purchased credits to the user's balance.
    // Returns rows updated (1 = OK, 0 = user missing) so the caller can verify.
    @Modifying
    @Transactional
    @Query("UPDATE Users u SET u.quotaRemaining = u.quotaRemaining + :amount " +
           "WHERE u.id = :userId")
    int addQuota(@Param("userId") UUID userId, @Param("amount") int amount);

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

    // ── Analytics queries ─────────────────────────────────────────────
    long countByIsActiveTrue();
    long countByCreatedAtBetween(Instant start, Instant end);

    @Query("SELECT u.plan.name, COUNT(u) FROM Users u WHERE u.plan IS NOT NULL GROUP BY u.plan.name")
    List<Object[]> countGroupByPlanName();

    // Admin: toggle active status
    @Modifying
    @Transactional
    @Query("UPDATE Users u SET u.isActive = :active WHERE u.id = :userId")
    void setActiveStatus(@Param("userId") UUID userId, @Param("active") boolean active);

    // Admin: change role
    @Modifying
    @Transactional
    @Query("UPDATE Users u SET u.role = :role WHERE u.id = :userId")
    void setRole(@Param("userId") UUID userId, @Param("role") String role);
}

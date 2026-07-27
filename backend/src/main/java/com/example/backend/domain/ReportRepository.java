package com.example.backend.domain;

import com.example.backend.domain.Report;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Repository
public interface ReportRepository extends JpaRepository<Report, UUID> {
    List<Report> findByUserIdOrderByCreatedAtDesc(UUID userId);
    List<Report> findByStatusOrderByUpdatedAtDesc(String status);
    List<Report> findByUserIdAndSourceOrderByCreatedAtDesc(UUID userId, String source);

    // Single-column fetch (no lazy-load risk) — used by the async AI agents to
    // pick the response language without needing an open Hibernate session.
    @Query("SELECT r.user.language FROM Report r WHERE r.id = :reportId")
    String findUserLanguageByReportId(@Param("reportId") UUID reportId);

    // ── Admin queries ─────────────────────────────────────────────────
    long countByCreatedAtBetween(Instant start, Instant end);

    @Query("SELECT r.status, COUNT(r) FROM Report r GROUP BY r.status")
    List<Object[]> countGroupByStatus();

    @Query("SELECT r.riskLevel, COUNT(r) FROM Report r WHERE r.riskLevel IS NOT NULL GROUP BY r.riskLevel")
    List<Object[]> countGroupByRiskLevel();

    @Query("SELECT r.entityName, COUNT(r) FROM Report r GROUP BY r.entityName ORDER BY COUNT(r) DESC")
    List<Object[]> findTopEntities(Pageable pageable);

    @Query("SELECT r.countryIso2, COUNT(r) FROM Report r WHERE r.countryIso2 IS NOT NULL GROUP BY r.countryIso2 ORDER BY COUNT(r) DESC")
    List<Object[]> countGroupByCountry();

    // Reports a human admin corrected (override applied) — a ground-truth "AI was wrong" signal.
    @Query("SELECT COUNT(r) FROM Report r WHERE r.overriddenAt IS NOT NULL")
    long countOverridden();

    // No JOIN FETCH: the caller (AdminController.listReports) is @Transactional,
    // so toReportSummary can lazy-load user/overriddenBy during mapping.
    //
    // entityName is matched with an always-on LIKE (NOT guarded by ":x IS NULL"),
    // and the caller passes "" instead of null. A *null* string bound inside
    // LOWER(CONCAT(...)) has no column to infer its type from, so PostgreSQL types
    // it as bytea and fails at plan time with "function lower(bytea) does not exist"
    // — the IS NULL branch never gets to short-circuit it. An empty string matches
    // every row, which is exactly "no filter". This mirrors UsersRepository.searchUsers.
    @Query("SELECT r FROM Report r WHERE " +
           "LOWER(r.entityName) LIKE LOWER(CONCAT('%', :entityName, '%')) AND " +
           "(:status IS NULL OR r.status = :status) AND " +
           "(:riskLevel IS NULL OR r.riskLevel = :riskLevel) AND " +
           "(:userId IS NULL OR r.user.id = :userId)")
    Page<Report> searchReports(
        @Param("entityName") String entityName,
        @Param("status") String status,
        @Param("riskLevel") String riskLevel,
        @Param("userId") UUID userId,
        Pageable pageable);
}

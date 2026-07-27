package com.example.backend.domain;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.UUID;

public interface ReportFlagRepository extends JpaRepository<ReportFlag, UUID> {
    List<ReportFlag> findByReport_IdOrderByCreatedAtDesc(UUID reportId);
    Page<ReportFlag> findByStatusOrderByCreatedAtDesc(String status, Pageable pageable);
    Page<ReportFlag> findAllByOrderByCreatedAtDesc(Pageable pageable);

    // ── Evaluation aggregates ──
    @Query("SELECT f.status, COUNT(f) FROM ReportFlag f GROUP BY f.status")
    List<Object[]> countGroupByStatus();

    @Query("SELECT f.reason, COUNT(f) FROM ReportFlag f GROUP BY f.reason")
    List<Object[]> countGroupByReason();
}

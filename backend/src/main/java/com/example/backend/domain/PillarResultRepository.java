package com.example.backend.domain;

import com.example.backend.domain.PillarResult;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface PillarResultRepository extends JpaRepository<PillarResult, UUID> {
    List<PillarResult> findByReportIdOrderByPillarNoAsc(UUID reportId);

    // idx_pillar_results_status — fetch by report + status
    List<PillarResult> findByReportIdAndStatus(UUID reportId, String status);

    // Evaluation: distribution of AI self-reported confidence (HIGH|MEDIUM|LOW).
    @Query("SELECT p.confidence, COUNT(p) FROM PillarResult p WHERE p.confidence IS NOT NULL GROUP BY p.confidence")
    List<Object[]> countGroupByConfidence();
}

package com.example.backend.repository;

import com.example.backend.model.PillarResult;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface PillarResultRepository extends JpaRepository<PillarResult, UUID> {
    List<PillarResult> findByReportIdOrderByPillarNoAsc(UUID reportId);

    // idx_pillar_results_status — fetch by report + status
    List<PillarResult> findByReportIdAndStatus(UUID reportId, String status);
}

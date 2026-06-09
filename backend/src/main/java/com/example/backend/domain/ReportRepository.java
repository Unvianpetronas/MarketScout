package com.example.backend.domain;

import com.example.backend.domain.Report;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface ReportRepository extends JpaRepository<Report, UUID> {
    List<Report> findByUserIdOrderByCreatedAtDesc(UUID userId);

    // idx_reports_status — backend status polling
    List<Report> findByStatusOrderByUpdatedAtDesc(String status);

    // idx_reports_source — filter by origin flow
    List<Report> findByUserIdAndSourceOrderByCreatedAtDesc(UUID userId, String source);
}

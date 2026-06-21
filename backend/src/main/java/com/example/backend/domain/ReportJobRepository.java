package com.example.backend.domain;

import com.example.backend.domain.ReportJob;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.UUID;

@Repository
public interface ReportJobRepository extends JpaRepository<ReportJob, UUID> {
    long countByStatus(String status);
    Page<ReportJob> findAllByOrderByUpdatedAtDesc(Pageable pageable);
    Page<ReportJob> findByStatusOrderByUpdatedAtDesc(String status, Pageable pageable);
}

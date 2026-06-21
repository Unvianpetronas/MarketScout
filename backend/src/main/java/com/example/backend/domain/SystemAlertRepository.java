package com.example.backend.domain;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.UUID;

@Repository
public interface SystemAlertRepository extends JpaRepository<SystemAlert, UUID> {
    long countByIsResolvedFalse();
    Page<SystemAlert> findByIsResolvedFalseOrderByCreatedAtDesc(Pageable pageable);
    Page<SystemAlert> findAllByOrderByCreatedAtDesc(Pageable pageable);
}

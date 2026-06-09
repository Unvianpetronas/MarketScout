package com.example.backend.domain;

import com.example.backend.domain.ReportJob;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.UUID;

@Repository
public interface ReportJobRepository extends JpaRepository<ReportJob, UUID> {
}

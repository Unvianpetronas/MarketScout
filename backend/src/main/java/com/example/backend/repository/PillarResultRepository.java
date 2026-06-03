package com.example.backend.repository;

import com.example.backend.model.PillarResult;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.UUID;

@Repository
public interface PillarResultRepository extends JpaRepository<PillarResult, UUID> {
}

package com.example.backend.domain;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface ContractRepository extends JpaRepository<Contract, UUID> {

    List<Contract> findByUser_IdOrderByUploadedAtDesc(UUID userId);

    List<Contract> findByUser_IdAndFileNameContainingIgnoreCaseOrderByUploadedAtDesc(UUID userId, String search);
}

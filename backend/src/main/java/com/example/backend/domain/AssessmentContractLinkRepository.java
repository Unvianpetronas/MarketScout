package com.example.backend.domain;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface AssessmentContractLinkRepository extends JpaRepository<AssessmentContractLink, UUID> {

    Optional<AssessmentContractLink> findByReport_IdAndContract_Id(UUID reportId, UUID contractId);

    List<AssessmentContractLink> findByReport_Id(UUID reportId);

    void deleteByReport_IdAndContract_Id(UUID reportId, UUID contractId);
}

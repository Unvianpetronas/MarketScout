package com.example.backend.domain;

import com.example.backend.domain.Plan;
import com.example.backend.domain.Users;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface PlanRepository extends JpaRepository<Plan, Integer> {
    Optional<Plan> findByName(String planName);
    Optional<Plan> findByNameIgnoreCase(String planName);
}

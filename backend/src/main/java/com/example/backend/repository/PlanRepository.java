package com.example.backend.repository;

import com.example.backend.model.Plan;
import com.example.backend.model.Users;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface PlanRepository extends JpaRepository<Plan, Integer> {
    Optional<Plan> findByName(String planName);
}

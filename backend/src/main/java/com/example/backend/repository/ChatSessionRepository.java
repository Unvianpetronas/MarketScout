package com.example.backend.repository;

import com.example.backend.model.ChatSession;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface ChatSessionRepository extends JpaRepository<ChatSession, UUID> {

    List<ChatSession> findByUser_IdOrderByUpdatedAtDesc(UUID userId);

    Optional<ChatSession> findByIdAndUser_Id(UUID id, UUID userId);

    @Modifying
    @Query("UPDATE ChatSession s SET s.updatedAt = :now WHERE s.id = :id")
    void touchUpdatedAt(@Param("id") UUID id, @Param("now") Instant now);
}

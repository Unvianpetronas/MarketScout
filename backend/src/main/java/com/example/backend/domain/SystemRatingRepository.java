package com.example.backend.domain;

import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface SystemRatingRepository extends JpaRepository<SystemRating, UUID> {

    Optional<SystemRating> findByUser_Id(UUID userId);

    boolean existsByUser_Id(UUID userId);

    long countByStatus(String status);

    /** Averages only submitted responses — dismissals carry no score. */
    @Query("SELECT AVG(s.score) FROM SystemRating s WHERE s.status = 'submitted'")
    Double averageScore();

    /**
     * Per-item means, so the admin page can point at *which* part of the
     * product scored badly rather than only reporting one aggregate. Even
     * items are negatively worded, so a high mean there is a bad result —
     * the caller normalises before display.
     */
    @Query("""
            SELECT AVG(s.q1), AVG(s.q2), AVG(s.q3), AVG(s.q4), AVG(s.q5),
                   AVG(s.q6), AVG(s.q7), AVG(s.q8), AVG(s.q9), AVG(s.q10)
            FROM SystemRating s WHERE s.status = 'submitted'
            """)
    List<Object[]> itemAverages();

    @Query("""
            SELECT s FROM SystemRating s JOIN FETCH s.user
            WHERE s.status = 'submitted'
            ORDER BY s.createdAt DESC
            """)
    List<SystemRating> findRecentSubmitted(Pageable pageable);
}

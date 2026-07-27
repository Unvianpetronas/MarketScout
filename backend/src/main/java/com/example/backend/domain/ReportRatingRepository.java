package com.example.backend.domain;

import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ReportRatingRepository extends JpaRepository<ReportRating, UUID> {
    Optional<ReportRating> findByReport_Id(UUID reportId);

    @Query("SELECT AVG(r.stars) FROM ReportRating r")
    Double averageStars();

    @Query("SELECT r.stars, COUNT(r) FROM ReportRating r GROUP BY r.stars ORDER BY r.stars")
    List<Object[]> starDistribution();

    // Recent ratings with report + user eagerly fetched, for the admin list.
    @Query("SELECT r FROM ReportRating r JOIN FETCH r.report JOIN FETCH r.user ORDER BY r.updatedAt DESC")
    List<ReportRating> findRecentWithRefs(Pageable pageable);
}

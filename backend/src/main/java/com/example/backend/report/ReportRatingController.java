package com.example.backend.report;

import com.example.backend.config.JwtService;
import com.example.backend.domain.Report;
import com.example.backend.domain.ReportRating;
import com.example.backend.domain.ReportRatingRepository;
import com.example.backend.domain.ReportRepository;
import com.example.backend.domain.Users;
import com.example.backend.domain.UsersRepository;
import com.example.backend.exception.AppException;
import io.jsonwebtoken.Claims;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.UUID;

/**
 * Owner-only satisfaction rating (1–5 stars + optional comment) on a finished
 * report. Separate from {@link ReportController} so that controller's test's
 * hand-built constructor stays stable. Feeds the admin evaluation page.
 */
@RestController
@RequestMapping("/api/v1/reports")
@RequiredArgsConstructor
public class ReportRatingController {

    private final ReportRepository reportRepository;
    private final ReportRatingRepository ratingRepository;
    private final UsersRepository usersRepository;
    private final JwtService jwtService;

    public record RatingRequest(
            @NotNull @Min(1) @Max(5) Short stars,
            String comment) {}

    public record RatingResponse(Short stars, String comment, Instant createdAt, Instant updatedAt) {}

    @GetMapping("/{id}/rating")
    public ResponseEntity<RatingResponse> getRating(
            @RequestHeader("Authorization") String authHeader,
            @PathVariable UUID id) {
        UUID userId = extractUserId(authHeader);
        requireOwnedReport(id, userId);
        return ratingRepository.findByReport_Id(id)
                .map(r -> ResponseEntity.ok(toResponse(r)))
                .orElseGet(() -> ResponseEntity.noContent().build());
    }

    @PutMapping("/{id}/rating")
    public ResponseEntity<RatingResponse> upsertRating(
            @RequestHeader("Authorization") String authHeader,
            @PathVariable UUID id,
            @Valid @RequestBody RatingRequest req) {
        UUID userId = extractUserId(authHeader);
        Report report = requireOwnedReport(id, userId);

        ReportRating rating = ratingRepository.findByReport_Id(id).orElseGet(() -> {
            ReportRating fresh = new ReportRating();
            fresh.setReport(report);
            fresh.setUser(usersRepository.findById(userId)
                    .orElseThrow(() -> new AppException(AppException.ErrorCode.USER_NOT_FOUND)));
            return fresh;
        });
        rating.setStars(req.stars());
        rating.setComment(req.comment() != null && !req.comment().isBlank() ? req.comment().trim() : null);
        rating = ratingRepository.save(rating);
        return ResponseEntity.ok(toResponse(rating));
    }

    private Report requireOwnedReport(UUID reportId, UUID userId) {
        return reportRepository.findById(reportId)
                .filter(r -> r.getUser().getId().equals(userId))
                .orElseThrow(() -> new AppException(AppException.ErrorCode.REPORT_NOT_FOUND));
    }

    private RatingResponse toResponse(ReportRating r) {
        return new RatingResponse(r.getStars(), r.getComment(), r.getCreatedAt(), r.getUpdatedAt());
    }

    private UUID extractUserId(String authHeader) {
        Claims claims = jwtService.parseToken(authHeader.replace("Bearer ", ""));
        return jwtService.getId(claims);
    }
}

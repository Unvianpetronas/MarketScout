package com.example.backend.report;

import com.example.backend.config.JwtService;
import com.example.backend.domain.ReportRepository;
import com.example.backend.domain.SystemRating;
import com.example.backend.domain.SystemRatingRepository;
import com.example.backend.domain.Users;
import com.example.backend.domain.UsersRepository;
import com.example.backend.exception.AppException;
import io.jsonwebtoken.Claims;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

/**
 * One-time System Usability Scale survey (see {@link SystemRating}).
 *
 * Deliberately asked at most once per user — a product that nags paying
 * customers for feedback costs more than the data is worth. Both submitting
 * and skipping write the single allowed row, so eligibility flips to false
 * either way.
 */
@Slf4j
@RestController
@RequestMapping("/api/v1/system-survey")
@RequiredArgsConstructor
public class SystemSurveyController {

    /** Users below this many reports haven't used the product enough to judge it. */
    static final long MIN_REPORTS_TO_ASK = 3;

    private final SystemRatingRepository ratingRepository;
    private final ReportRepository reportRepository;
    private final UsersRepository usersRepository;
    private final JwtService jwtService;

    public record EligibilityResponse(boolean eligible, long reportsNeeded) {}

    public record SubmitRequest(
            @NotNull @Size(min = SystemRating.ITEM_COUNT, max = SystemRating.ITEM_COUNT)
            List<@NotNull @Min(1) @Max(5) Short> answers,
            String comment) {}

    public record SubmitResponse(double score) {}

    /**
     * Whether the survey modal should be shown. Returns a plain false (not an
     * error) for users who already answered or skipped, so the client can call
     * this on every page load without special-casing.
     */
    @GetMapping("/eligibility")
    @Transactional(readOnly = true)
    public ResponseEntity<EligibilityResponse> eligibility(
            @RequestHeader("Authorization") String authHeader) {
        UUID userId = extractUserId(authHeader);
        if (ratingRepository.existsByUser_Id(userId)) {
            return ResponseEntity.ok(new EligibilityResponse(false, 0));
        }
        long reports = reportRepository.countByUserId(userId);
        long needed = Math.max(0, MIN_REPORTS_TO_ASK - reports);
        return ResponseEntity.ok(new EligibilityResponse(needed == 0, needed));
    }

    @PostMapping
    @Transactional
    public ResponseEntity<SubmitResponse> submit(
            @RequestHeader("Authorization") String authHeader,
            @Valid @RequestBody SubmitRequest req) {
        UUID userId = extractUserId(authHeader);
        // Not an upsert: SUS measures a first impression of usability, and
        // letting people revise it turns the score into whatever they last felt.
        if (ratingRepository.existsByUser_Id(userId)) {
            throw new AppException(AppException.ErrorCode.BAD_REQUEST, "Bạn đã gửi đánh giá hệ thống rồi.");
        }
        short[] answers = new short[SystemRating.ITEM_COUNT];
        for (int i = 0; i < SystemRating.ITEM_COUNT; i++) {
            answers[i] = req.answers().get(i);
        }

        SystemRating rating = new SystemRating();
        rating.setUser(requireUser(userId));
        rating.applyAnswers(answers);
        rating.setComment(req.comment() != null && !req.comment().isBlank() ? req.comment().trim() : null);
        ratingRepository.save(rating);

        log.info("SUS response recorded — user={} score={}", userId, rating.getScore());
        return ResponseEntity.ok(new SubmitResponse(rating.getScore().doubleValue()));
    }

    /** Records the skip so the prompt is never shown to this user again. */
    @PostMapping("/dismiss")
    @Transactional
    public ResponseEntity<Void> dismiss(@RequestHeader("Authorization") String authHeader) {
        UUID userId = extractUserId(authHeader);
        if (!ratingRepository.existsByUser_Id(userId)) {
            SystemRating dismissal = new SystemRating();
            dismissal.setUser(requireUser(userId));
            dismissal.setStatus(SystemRating.STATUS_DISMISSED);
            ratingRepository.save(dismissal);
        }
        return ResponseEntity.noContent().build();
    }

    private Users requireUser(UUID userId) {
        return usersRepository.findById(userId)
                .orElseThrow(() -> new AppException(AppException.ErrorCode.USER_NOT_FOUND));
    }

    private UUID extractUserId(String authHeader) {
        Claims claims = jwtService.parseToken(authHeader.replace("Bearer ", ""));
        return jwtService.getId(claims);
    }
}

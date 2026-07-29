package com.example.backend.admin;

import com.example.backend.domain.PillarResultRepository;
import com.example.backend.domain.ReportFlagRepository;
import com.example.backend.domain.ReportRatingRepository;
import com.example.backend.domain.ReportRepository;
import com.example.backend.domain.SystemRating;
import com.example.backend.domain.SystemRatingRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * "Đánh giá hệ thống" — measures the quality of the AI verification using
 * signals the platform already collects: admin overrides (ground-truth "AI was
 * wrong"), user report-flags (complaints), AI self-reported confidence, and
 * user satisfaction ratings. Separate controller so AdminController's test
 * constructor stays stable.
 */
@RestController
@RequestMapping("/api/v1/admin/analytics")
@RequiredArgsConstructor
public class AdminEvaluationController {

    private final ReportRepository reportRepository;
    private final ReportFlagRepository reportFlagRepository;
    private final PillarResultRepository pillarResultRepository;
    private final ReportRatingRepository ratingRepository;
    private final SystemRatingRepository systemRatingRepository;

    /** Published SUS industry average (Brooke, 1996) — the bar, not a pass mark. */
    private static final double SUS_BENCHMARK = 68.0;

    @GetMapping("/evaluation")
    @Transactional(readOnly = true)
    public ResponseEntity<AdminDTO.EvaluationAnalytics> getEvaluation() {
        long totalReports = reportRepository.count();
        long overridden = reportRepository.countOverridden();

        Map<String, Long> flagStatus = reportFlagRepository.countGroupByStatus().stream()
                .collect(Collectors.toMap(r -> (String) r[0], r -> (Long) r[1]));
        long flagsOpen      = flagStatus.getOrDefault("open", 0L);
        long flagsResolved  = flagStatus.getOrDefault("resolved", 0L);
        long flagsDismissed = flagStatus.getOrDefault("dismissed", 0L);
        long flaggedTotal   = flagsOpen + flagsResolved + flagsDismissed;

        Map<String, Long> flagReason = reportFlagRepository.countGroupByReason().stream()
                .collect(Collectors.toMap(r -> (String) r[0], r -> (Long) r[1]));
        long sanctionsFalsePositive = flagReason.getOrDefault("SANCTIONS_FALSE_POSITIVE", 0L);

        // Accuracy proxy: a report is "confirmed wrong" when an admin had to
        // override it. Kept to overrides only (ground-truth) to avoid double
        // counting with flags, which are surfaced separately as a complaint rate.
        double accuracyPct     = totalReports > 0 ? (1.0 - (double) overridden / totalReports) * 100 : 100.0;
        double overrideRatePct = totalReports > 0 ? (double) overridden / totalReports * 100 : 0.0;
        double flagRatePct     = totalReports > 0 ? (double) flaggedTotal / totalReports * 100 : 0.0;

        Double avgStars  = ratingRepository.averageStars();
        long ratingCount = ratingRepository.count();

        List<AdminDTO.Bucket> starDistribution = ratingRepository.starDistribution().stream()
                .map(r -> new AdminDTO.Bucket(String.valueOf(r[0]), (Long) r[1]))
                .toList();

        List<AdminDTO.Bucket> confidenceDistribution = pillarResultRepository.countGroupByConfidence().stream()
                .map(r -> new AdminDTO.Bucket((String) r[0], (Long) r[1]))
                .toList();

        List<AdminDTO.Bucket> flagsByReason = reportFlagRepository.countGroupByReason().stream()
                .map(r -> new AdminDTO.Bucket((String) r[0], (Long) r[1]))
                .toList();

        List<AdminDTO.RatingEntry> recentRatings = ratingRepository.findRecentWithRefs(PageRequest.of(0, 20)).stream()
                .map(r -> new AdminDTO.RatingEntry(r.getStars(), r.getComment(),
                        r.getReport().getEntityName(), r.getUser().getEmail(), r.getCreatedAt()))
                .toList();

        return ResponseEntity.ok(new AdminDTO.EvaluationAnalytics(
                totalReports, overridden, flaggedTotal, flagsOpen, flagsResolved, flagsDismissed,
                sanctionsFalsePositive, round1(accuracyPct), round1(overrideRatePct), round1(flagRatePct),
                avgStars, ratingCount, starDistribution, confidenceDistribution, flagsByReason, recentRatings,
                buildSus()));
    }

    /**
     * SUS block. Reported alongside — never merged into — the report-rating
     * numbers above: those measure whether the AI's answer was right, this
     * measures whether the software is usable.
     */
    private AdminDTO.SusSummary buildSus() {
        Double avgScore  = systemRatingRepository.averageScore();
        long responses   = systemRatingRepository.countByStatus(SystemRating.STATUS_SUBMITTED);
        long dismissals  = systemRatingRepository.countByStatus(SystemRating.STATUS_DISMISSED);

        List<AdminDTO.SusItem> items = List.of();
        if (responses > 0) {
            Object[] avgs = systemRatingRepository.itemAverages().get(0);
            List<AdminDTO.SusItem> built = new java.util.ArrayList<>(SystemRating.ITEM_COUNT);
            for (int i = 0; i < SystemRating.ITEM_COUNT; i++) {
                if (avgs[i] == null) continue;
                double raw = ((Number) avgs[i]).doubleValue();
                // Odd-numbered items (index 0, 2, …) are positively worded and
                // contribute answer-1; even ones are negative and contribute
                // 5-answer. Scale the 0–4 result to 0–100 so a low bar on the
                // chart always means "this part of the product is weak".
                double contribution = (i % 2 == 0) ? raw - 1 : 5 - raw;
                built.add(new AdminDTO.SusItem(i + 1, round1(raw), round1(contribution / 4.0 * 100.0)));
            }
            items = List.copyOf(built);
        }

        List<AdminDTO.SusEntry> recent = systemRatingRepository
                .findRecentSubmitted(PageRequest.of(0, 20)).stream()
                .map(s -> new AdminDTO.SusEntry(
                        s.getScore() != null ? s.getScore().doubleValue() : null,
                        s.getComment(), s.getUser().getEmail(), s.getCreatedAt()))
                .toList();

        return new AdminDTO.SusSummary(
                avgScore != null ? round1(avgScore) : null,
                responses, dismissals, SUS_BENCHMARK, items, recent);
    }

    private static double round1(double v) {
        return Math.round(v * 10.0) / 10.0;
    }
}

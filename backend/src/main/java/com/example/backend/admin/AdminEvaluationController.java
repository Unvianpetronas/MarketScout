package com.example.backend.admin;

import com.example.backend.domain.PillarResultRepository;
import com.example.backend.domain.ReportFlagRepository;
import com.example.backend.domain.ReportRatingRepository;
import com.example.backend.domain.ReportRepository;
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
                avgStars, ratingCount, starDistribution, confidenceDistribution, flagsByReason, recentRatings));
    }

    private static double round1(double v) {
        return Math.round(v * 10.0) / 10.0;
    }
}

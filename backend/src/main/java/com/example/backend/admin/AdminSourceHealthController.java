package com.example.backend.admin;

import com.example.backend.health.SourceHealthService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Map;

/**
 * Whether the external sources behind the 8 pillars are actually answering.
 *
 * The question this exists to answer is "how long has it been broken" — the
 * previous answer was "since whenever, nobody was watching". Secured by
 * SecurityConfig's /api/v1/admin/** rule.
 */
@RestController
@RequestMapping("/api/v1/admin/source-health")
@RequiredArgsConstructor
public class AdminSourceHealthController {

    private final SourceHealthService sourceHealthService;

    @GetMapping
    public ResponseEntity<Map<String, Object>> status() {
        List<SourceHealthService.SourceStatus> sources = sourceHealthService.snapshot();
        long down = sources.stream().filter(s -> !s.up()).count();
        return ResponseEntity.ok(Map.of(
            "checkedAt", Instant.now(),
            "downCount", down,
            "sources", sources.stream().map(this::toRow).toList()));
    }

    /** Forces a probe now rather than waiting for the next scheduled sweep. */
    @PostMapping("/probe")
    public ResponseEntity<Map<String, Object>> probeNow() {
        sourceHealthService.probeAll();
        return status();
    }

    private Map<String, Object> toRow(SourceHealthService.SourceStatus s) {
        java.util.Map<String, Object> row = new java.util.LinkedHashMap<>();
        row.put("source", s.source());
        row.put("pillar", s.pillar());
        row.put("up", s.up());
        row.put("detail", s.detail());
        row.put("since", s.since());
        row.put("lastChecked", s.lastChecked());
        row.put("inStateFor", humanize(Duration.between(s.since(), Instant.now())));
        return row;
    }

    private String humanize(Duration d) {
        long days = d.toDays();
        if (days > 0) return days + "d";
        long hours = d.toHours();
        if (hours > 0) return hours + "h";
        return Math.max(1, d.toMinutes()) + "m";
    }
}

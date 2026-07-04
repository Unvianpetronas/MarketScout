package com.example.backend.verification;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Slf4j
@Service
@RequiredArgsConstructor
public class ScoringRubricLoader {

    @Value("${app.scoring.rubric-config:}")
    private String rubricConfigJson;

    private final ObjectMapper objectMapper;

    private ScoringRubric rubric;

    @PostConstruct
    public void init() {
        if (rubricConfigJson != null && !rubricConfigJson.isBlank()) {
            try {
                rubric = objectMapper.readValue(rubricConfigJson, ScoringRubric.class);
                log.info("ScoringRubric loaded from ENV (SCORING_RUBRIC_CONFIG)");
                return;
            } catch (Exception e) {
                log.warn("Failed to parse SCORING_RUBRIC_CONFIG from ENV, using default rubric: {}", e.getMessage());
            }
        }
        rubric = new ScoringRubric();
        log.info("ScoringRubric loaded with default weights: P1=22%, P2=10%, P3=15%, P4=12%, P5=12%, P6=18%, P7=4%, P8=7%");
    }

    public ScoringRubric getRubric() {
        return rubric;
    }
}

package com.example.backend.shared.model.scoring;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PillarScore {
    private int pillarNo;
    private String pillarName;
    private Integer score;          // null = SKIP. Raw points — the overall score still weights this.
    /**
     * Points this pillar could actually have earned given which data came back.
     * A Vietnamese company can never earn P1's age or legal-representative buckets
     * because no free registry publishes them, so scoring it out of 100 labelled a
     * perfectly good entity "WARN". The status below is graded against this instead.
     */
    private Integer obtainablePoints;
    private String status;          // PASS | WARN | FAIL | SKIP
    private String confidence;      // HIGH | MEDIUM | LOW
    private List<Evidence> evidences;
    private String findings;
    private String sourcesUsed;
}

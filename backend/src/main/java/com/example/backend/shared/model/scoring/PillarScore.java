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
    private Integer score;          // null = SKIP
    private String status;          // PASS | WARN | FAIL | SKIP
    private String confidence;      // HIGH | MEDIUM | LOW
    private List<Evidence> evidences;
    private String findings;
    private String sourcesUsed;
}

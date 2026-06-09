package com.example.backend.shared.model.scoring;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ScoringResult {
    private UUID reportId;
    private String companyName;
    private double overallScore;
    private String riskLevel;      // Thấp | Trung bình | Cao | Nghiêm trọng
    private boolean hardStop;
    private String hardStopReason;
    private String status;         // DONE | HARD_STOP | FAILED
    private List<PillarScore> pillars;
    private String dealSafetyAnalysis;
}

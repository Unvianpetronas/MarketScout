package com.example.backend.verification;

import com.example.backend.shared.model.scoring.FactJson;
import com.example.backend.shared.model.scoring.PillarScore;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * P7 — Deal Structure Risk. Verifies the deterministic scoring from user-supplied
 * deal parameters and, crucially, that a missing P7 stays N/A (SKIP) and is
 * excluded from the weighted overall score rather than counted as zero.
 */
class ScoringRubricP7Test {

    private final ScoringRubric rubric = new ScoringRubric();

    @Test
    void nullFacts_isSkip_notZero() {
        PillarScore p7 = rubric.scoreP7(null);
        assertThat(p7.getStatus()).isEqualTo("SKIP");
        assertThat(p7.getScore()).isNull();
        assertThat(p7.getPillarNo()).isEqualTo(7);
    }

    @Test
    void safePayment_writtenContract_lowDeposit_scoresPass() {
        var facts = FactJson.P7Facts.builder()
            .paymentMethodSafety("SAFE")   // +60
            .hasWrittenContract(true)        // +25
            .depositPercentage(20)           // +15
            .build();
        PillarScore p7 = rubric.scoreP7(facts);
        assertThat(p7.getScore()).isEqualTo(100); // capped at 100
        assertThat(p7.getStatus()).isEqualTo("PASS");
    }

    @Test
    void riskyPayment_noContract_highDeposit_scoresFail() {
        var facts = FactJson.P7Facts.builder()
            .paymentMethodSafety("RISKY")  // +15
            .hasWrittenContract(false)       // +0
            .depositPercentage(70)           // -10
            .build();
        PillarScore p7 = rubric.scoreP7(facts);
        assertThat(p7.getScore()).isEqualTo(5); // 15 - 10, floored at 0 -> 5
        assertThat(p7.getStatus()).isEqualTo("FAIL");
    }

    @Test
    void skippedP7_isExcludedFromOverall() {
        // P1 = 80 (PASS), P7 = SKIP. Overall must equal the P1-only weighted
        // average, NOT be dragged down by treating P7 as zero.
        PillarScore p1 = PillarScore.builder()
            .pillarNo(1).pillarName("Entity Validation").score(80).status("PASS").build();
        PillarScore p7skip = rubric.scoreP7(null);

        double overall = rubric.calcOverallScore(List.of(p1, p7skip));
        assertThat(overall).isEqualTo(80.0);
    }
}

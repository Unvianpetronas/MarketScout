package com.example.backend.verification;

import com.example.backend.shared.model.scoring.FactJson;
import com.example.backend.shared.model.scoring.PillarScore;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.within;

/**
 * PASS/WARN/FAIL is graded against the points a pillar could actually earn, while
 * the raw score — and therefore every existing report's overall number — is left
 * exactly as it was.
 */
class ScoringRubricCoverageTest {

    private final ScoringRubric rubric = new ScoringRubric();

    @Test
    void p1_vietnameseCompany_passesOnTheOneCheckThatExists() {
        // VietQR publishes status but never an incorporation date or legal
        // representative, so 50 was the ceiling and every good VN company read "WARN".
        PillarScore s = rubric.scoreP1(FactJson.P1Facts.builder().status("ACTIVE").build(), "vi");

        assertThat(s.getScore()).isEqualTo(50);           // raw score unchanged
        assertThat(s.getObtainablePoints()).isEqualTo(50);
        assertThat(s.getStatus()).isEqualTo("PASS");
        assertThat(s.getConfidence()).isEqualTo("LOW");   // thin data still flagged
    }

    @Test
    void p1_inactiveCompany_stillFails() {
        PillarScore s = rubric.scoreP1(FactJson.P1Facts.builder().status("INACTIVE").build(), "vi");

        assertThat(s.getScore()).isEqualTo(5);
        assertThat(s.getStatus()).isEqualTo("FAIL");
    }

    @Test
    void p1_fullData_isUnaffected() {
        PillarScore s = rubric.scoreP1(FactJson.P1Facts.builder()
            .status("ACTIVE").ageYears(9.0).hasLegalRepresentative(true).industryMatch("MATCH").build(), "vi");

        assertThat(s.getScore()).isEqualTo(100);
        assertThat(s.getObtainablePoints()).isEqualTo(100);
        assertThat(s.getStatus()).isEqualTo("PASS");
    }

    @Test
    void p6_cleanCompanyWithNoBankDetails_noLongerWarns() {
        // Bank fields only exist once a customer supplies them, so every clean report
        // used to show "Payment & Bank — WARN 60/100".
        PillarScore s = rubric.scoreP6(FactJson.P6Facts.builder().isSanctionHit(false).build(), null, "vi");

        assertThat(s.getScore()).isEqualTo(60);
        assertThat(s.getObtainablePoints()).isEqualTo(60);
        assertThat(s.getStatus()).isEqualTo("PASS");
    }

    @Test
    void p6_sanctionHit_isStillZeroAndFailing() {
        PillarScore s = rubric.scoreP6(FactJson.P6Facts.builder().isSanctionHit(true).build(), null, "vi");

        assertThat(s.getScore()).isZero();
        assertThat(s.getStatus()).isEqualTo("FAIL");
    }

    @Test
    void p5_unknownRevenueTrend_isNotCountedAgainstTheCompany() {
        // CrawlerP5VN writes the literal string "UNKNOWN" — that is the crawler
        // saying it has no trend, not a trend of "unknown".
        PillarScore s = rubric.scoreP5(FactJson.P5Facts.builder()
            .taxComplianceStatus("NORMAL").registeredCapitalUsd(60000.0).revenueTrend("UNKNOWN").build(), "vi");

        assertThat(s.getObtainablePoints()).isEqualTo(75);
        assertThat(s.getStatus()).isEqualTo("PASS");
    }

    @Test
    void overallScore_isUnchangedByThisWork() {
        // The whole point of grading the label separately: no report a customer has
        // already paid for and read moves by a single point.
        List<PillarScore> pillars = List.of(
            rubric.scoreP1(FactJson.P1Facts.builder().status("ACTIVE").build(), "vi"),
            rubric.scoreP2(FactJson.P2Facts.builder().hasOfficialWebsite(true).build(), "vi"));

        // P1 raw 50 * 0.22 + P2 raw 30 * 0.10, over the weights that returned data.
        double expected = (50 * 0.22 + 30 * 0.10) / (0.22 + 0.10);
        assertThat(rubric.calcOverallScore(pillars)).isCloseTo(expected, within(0.1));
    }

    @Test
    void skippedPillar_carriesNoObtainablePoints() {
        PillarScore s = rubric.scoreP3(null, "vi");

        assertThat(s.getScore()).isNull();
        assertThat(s.getStatus()).isEqualTo("SKIP");
        assertThat(s.getObtainablePoints()).isNull();
    }
}

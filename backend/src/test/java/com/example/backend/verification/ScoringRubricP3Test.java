package com.example.backend.verification;

import com.example.backend.shared.model.scoring.Evidence;
import com.example.backend.shared.model.scoring.FactJson;
import com.example.backend.shared.model.scoring.PillarScore;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * P3 was redefined from "trade history" to "trade presence" after both of its
 * sources went away (ecosys.vcci.com.vn stopped resolving, importyeti started
 * returning 403). The rule that keeps it honest: a positive claim must carry the
 * URL it came from, and nothing found must never read as nothing exists.
 */
class ScoringRubricP3Test {

    private final ScoringRubric rubric = new ScoringRubric();

    private Evidence evidenceSaying(PillarScore s, String fragment) {
        return s.getEvidences().stream()
            .filter(e -> e.getText().contains(fragment))
            .findFirst().orElseThrow(() -> new AssertionError(
                "no evidence containing '" + fragment + "' in " + s.getEvidences()));
    }

    @Test
    void noFacts_isSkipNotZero() {
        PillarScore s = rubric.scoreP3(null, "vi");
        assertThat(s.getScore()).isNull();
        assertThat(s.getStatus()).isEqualTo("SKIP");
    }

    @Test
    void everySignalPresent_scoresFull() {
        PillarScore s = rubric.scoreP3(FactJson.P3Facts.builder()
            .b2bProfileUrl("https://www.alibaba.com/company/bao-han.html")
            .directoryUrl("https://www.kompass.com/c/bao-han/vn123/")
            .websiteHasTradeContent(true)
            .tradeNewsMentions(3)
            .isIndustryMatched(true)
            .build(), "vi");

        assertThat(s.getScore()).isEqualTo(100);
        assertThat(s.getStatus()).isEqualTo("PASS");
    }

    @Test
    void positiveClaimsCarryTheirSourceUrl() {
        PillarScore s = rubric.scoreP3(FactJson.P3Facts.builder()
            .b2bProfileUrl("https://www.alibaba.com/company/bao-han.html")
            .directoryUrl("https://www.kompass.com/c/bao-han/vn123/")
            .build(), "vi");

        // Without the link the customer cannot tell a marketplace profile from a
        // customs record — which is the confusion the old copy created.
        assertThat(evidenceSaying(s, "sàn giao thương B2B").getUrl())
            .isEqualTo("https://www.alibaba.com/company/bao-han.html");
        assertThat(evidenceSaying(s, "danh bạ ngành").getUrl())
            .isEqualTo("https://www.kompass.com/c/bao-han/vn123/");
    }

    @Test
    void nothingFound_isWarnedAsNotFoundNotAsConfirmedAbsence() {
        PillarScore s = rubric.scoreP3(FactJson.P3Facts.builder().build(), "vi");

        assertThat(s.getScore()).isZero();
        Evidence e = evidenceSaying(s, "Không tìm thấy hồ sơ trên sàn B2B");
        assertThat(e.getType()).isEqualTo("WARN");
        assertThat(e.getText()).contains("qua tìm kiếm công khai");
    }

    @Test
    void singleTradeMention_doesNotCount() {
        // One stray hit is noise; the bucket needs corroboration.
        PillarScore s = rubric.scoreP3(FactJson.P3Facts.builder().tradeNewsMentions(1).build(), "vi");
        assertThat(s.getScore()).isZero();
    }

    @Test
    void partialData_lowersConfidence() {
        PillarScore full = rubric.scoreP3(FactJson.P3Facts.builder()
            .b2bProfileUrl("https://alibaba.com/x").directoryUrl("https://kompass.com/y")
            .websiteHasTradeContent(true).tradeNewsMentions(2).isIndustryMatched(true).build(), "vi");
        PillarScore thin = rubric.scoreP3(FactJson.P3Facts.builder()
            .b2bProfileUrl("https://alibaba.com/x").build(), "vi");

        assertThat(full.getConfidence()).isEqualTo("HIGH");
        assertThat(thin.getConfidence()).isEqualTo("LOW");
    }
}

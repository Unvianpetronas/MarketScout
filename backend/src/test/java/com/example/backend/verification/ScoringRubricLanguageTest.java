package com.example.backend.verification;

import com.example.backend.shared.model.scoring.PillarScore;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * A Deep Verify report must come back in the language the user reads the UI in.
 * Crawlers run before that language is known, so they emit stable reason codes
 * and the rubric does the translating.
 */
class ScoringRubricLanguageTest {

    private final ScoringRubric rubric = new ScoringRubric();

    @Test
    void p6SkipReason_isTranslatedFromCode() {
        PillarScore vi = rubric.scoreP6(null, "P6_SOURCE_DOWN", "vi");
        PillarScore en = rubric.scoreP6(null, "P6_SOURCE_DOWN", "en");

        assertThat(vi.getFindings()).isEqualTo(
            "Nguồn dữ liệu trừng phạt không phản hồi — công ty này CHƯA được rà soát.");
        assertThat(en.getFindings()).isEqualTo(
            "The sanctions source did not respond — this company was NOT screened.");
    }

    @Test
    void p6SkipReason_saysNotScreenedRatherThanImplyingClean() {
        // "Couldn't check" must never be readable as "checked, nothing found" —
        // for sanctions that difference is the whole product.
        for (String code : new String[]{"P6_NO_API_KEY", "P6_DAILY_CAP", "P6_SOURCE_DOWN"}) {
            assertThat(rubric.scoreP6(null, code, "vi").getFindings()).contains("CHƯA được rà soát");
            assertThat(rubric.scoreP6(null, code, "en").getFindings()).contains("NOT screened");
        }
    }

    @Test
    void p6SkipReason_unknownTextPassesThroughForCachedReports() {
        // Reports cached under the old free-text reasons must still read correctly.
        assertThat(rubric.scoreP6(null, "OpenSanctions không phản hồi", "en").getFindings())
            .isEqualTo("OpenSanctions không phản hồi");
    }

    @Test
    void p6SkipReason_absentFallsBackToGenericInEachLanguage() {
        assertThat(rubric.scoreP6(null, null, "vi").getFindings()).isEqualTo("Không có dữ liệu P6");
        assertThat(rubric.scoreP6(null, "  ", "en").getFindings()).isEqualTo("No data for P6");
    }

    @Test
    void pillarEvidence_followsRequestedLanguage() {
        var facts = com.example.backend.shared.model.scoring.FactJson.P3Facts.builder()
            .b2bProfileUrl("https://alibaba.com/x").build();

        assertThat(rubric.scoreP3(facts, "vi").getEvidences().get(0).getText())
            .isEqualTo("Có hồ sơ trên sàn giao thương B2B");
        assertThat(rubric.scoreP3(facts, "en").getEvidences().get(0).getText())
            .isEqualTo("Public B2B marketplace profile found");
    }
}

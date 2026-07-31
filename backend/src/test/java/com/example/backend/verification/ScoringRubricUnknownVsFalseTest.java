package com.example.backend.verification;

import com.example.backend.shared.model.scoring.Evidence;
import com.example.backend.shared.model.scoring.FactJson;
import com.example.backend.shared.model.scoring.PillarScore;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * The recurring defect across this pipeline: a field that is null because nothing
 * could be checked was scored identically to a field that was checked and came
 * back negative. On a due-diligence report those are opposite claims — one says
 * "we don't know", the other says "we found a problem".
 */
class ScoringRubricUnknownVsFalseTest {

    private final ScoringRubric rubric = new ScoringRubric();

    private Evidence only(PillarScore s, String type) {
        return s.getEvidences().stream()
            .filter(e -> type.equals(e.getType()))
            .findFirst().orElseThrow(() -> new AssertionError(
                "no " + type + " evidence in " + s.getEvidences()));
    }

    @Test
    void p2_websiteUnknown_warnsInsteadOfAssertingNoWebsite() {
        PillarScore s = rubric.scoreP2(FactJson.P2Facts.builder().build(), "vi");

        assertThat(only(s, "WARN").getText()).isEqualTo("Chưa xác định được website chính thức");
        assertThat(s.getEvidences()).noneMatch(e -> "FAIL".equals(e.getType()));
    }

    @Test
    void p2_websiteConfirmedAbsent_stillFails() {
        PillarScore s = rubric.scoreP2(
            FactJson.P2Facts.builder().hasOfficialWebsite(false).build(), "vi");

        assertThat(only(s, "FAIL").getText()).isEqualTo("Không có website chính thức");
    }

    @Test
    void p2_tlsHandshakeRefused_isReportedAsNegative() {
        // checkSsl() distinguishes a refused handshake (false) from an inconclusive
        // one (null); only the refusal should reach the customer as a finding.
        PillarScore refused = rubric.scoreP2(
            FactJson.P2Facts.builder().hasOfficialWebsite(true).hasSsl(false).build(), "vi");
        PillarScore inconclusive = rubric.scoreP2(
            FactJson.P2Facts.builder().hasOfficialWebsite(true).build(), "vi");

        assertThat(refused.getEvidences()).anyMatch(e -> e.getText().contains("không có chứng chỉ SSL hợp lệ"));
        assertThat(inconclusive.getEvidences()).noneMatch(e -> e.getText().contains("SSL"));
    }

    @Test
    void p8_locationUnknown_warnsInsteadOfFailing() {
        PillarScore s = rubric.scoreP8(FactJson.P8Facts.builder().build(), "vi");

        assertThat(only(s, "WARN").getText()).isEqualTo("Chưa xác minh được địa điểm thực tế");
        assertThat(s.getEvidences()).noneMatch(e -> "FAIL".equals(e.getType()));
    }

    @Test
    void p8_locationConfirmedFake_stillFails() {
        PillarScore s = rubric.scoreP8(
            FactJson.P8Facts.builder().hasVerifiedLocation(false).build(), "vi");

        assertThat(only(s, "FAIL").getText()).isEqualTo("Địa chỉ không tương ứng địa điểm có thật");
    }

    @Test
    void unknownAndFalse_scoreTheSameButReadDifferently() {
        // Neither earns points — the fix is about what the report CLAIMS, not about
        // handing out points for missing data.
        PillarScore unknown = rubric.scoreP8(FactJson.P8Facts.builder().build(), "vi");
        PillarScore refuted = rubric.scoreP8(
            FactJson.P8Facts.builder().hasVerifiedLocation(false).build(), "vi");

        assertThat(unknown.getScore()).isEqualTo(refuted.getScore());
    }
}

package com.example.backend.verification.crawler.p4;

import org.junit.jupiter.api.Test;

import static com.example.backend.verification.crawler.p4.CrawlerP4.compareRegistryToGeocode;
import static org.assertj.core.api.Assertions.assertThat;

/**
 * P4 is the consistency pillar, so it needs two independent statements of the same
 * fact. It used to geocode the company NAME and compare the result to that same
 * name — comparing a company to a place, which can neither confirm nor refute
 * anything. It now compares the registry's address to where that address geocodes.
 */
class CrawlerP4MatchTest {

    private static final String REGISTRY =
        "Số 74, ngõ 14 phố Vũ Hữu, Phường Đại Mỗ, TP Hà Nội";

    @Test
    void sameAddressWrittenDifferently_matches() {
        String geocoded = "74, Ngo 14, Vu Huu, Dai Mo, Ha Noi, Vietnam";
        assertThat(compareRegistryToGeocode(REGISTRY, geocoded, null, null))
            .isEqualTo("COMPLETELY_MATCHED");
    }

    @Test
    void differentCityEntirely_isMajorMismatch() {
        String geocoded = "12 Nguyen Hue, Ben Nghe, Quan 1, Ho Chi Minh City, Vietnam";
        assertThat(compareRegistryToGeocode(REGISTRY, geocoded, null, null))
            .isEqualTo("MAJOR_MISMATCH");
    }

    @Test
    void nothingToCompare_isUnknownNotMismatch() {
        // A company whose registry address we never obtained has not been found
        // inconsistent — returning MINOR_MISMATCH would assert that it has.
        assertThat(compareRegistryToGeocode(null, null, null, null)).isNull();
        assertThat(compareRegistryToGeocode(REGISTRY, null, null, null)).isNull();
    }

    @Test
    void fillerWordsAloneDoNotCreateAMatch() {
        // Every Vietnamese address shares "phường", "quận", "đường"; every company
        // name starts "Công ty". Matching on those made unrelated records "match".
        String unrelated = "Đường Trần Phú, Phường 4, Quận 5, Thành phố Cần Thơ";
        assertThat(compareRegistryToGeocode(REGISTRY, unrelated, null, null))
            .isEqualTo("MAJOR_MISMATCH");
    }

    @Test
    void fallsBackToNameComparisonOnlyWhenGeocodeMissing() {
        assertThat(compareRegistryToGeocode(null, null,
            "Bao Han Viet Nam Trading Service", "Bao Han Viet Nam Trading Service"))
            .isEqualTo("COMPLETELY_MATCHED");
    }
}

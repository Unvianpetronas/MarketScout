package com.example.backend.health;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfSystemProperty;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.client.RestTemplate;

import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.contains;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

/**
 * The failure this guards against is silent: a dead source returns "nothing
 * found", which the pipeline scores as a company with no record. So the probe has
 * to check the PAYLOAD, not just that something answered with a 200.
 */
@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class SourceHealthServiceTest {

    @Mock private RestTemplate restTemplate;

    private SourceHealthService service() {
        SourceHealthService s = new SourceHealthService(restTemplate);
        ReflectionTestUtils.setField(s, "vietqrUrl", "https://api.vietqr.io/v2");
        ReflectionTestUtils.setField(s, "rdapBaseUrl", "https://rdap.org/domain");
        ReflectionTestUtils.setField(s, "nominatimUrl", "https://nominatim.openstreetmap.org");
        ReflectionTestUtils.setField(s, "nominatimContact", "test@marketscout.local");
        return s;
    }

    private SourceHealthService.SourceStatus statusOf(SourceHealthService s, String source) {
        return s.snapshot().stream().filter(x -> x.source().equals(source)).findFirst().orElseThrow();
    }

    @Test
    void vietqrAnsweringWithNoCompany_countsAsDown() {
        // This is exactly the masothue failure mode: a polite 200 saying nothing.
        when(restTemplate.getForEntity(contains("/business/"), eq(Map.class)))
            .thenReturn(ResponseEntity.ok(Map.of("code", "51", "desc", "not found")));

        SourceHealthService s = service();
        s.probeAll();

        assertThat(statusOf(s, "api.vietqr.io").up()).isFalse();
        assertThat(statusOf(s, "api.vietqr.io").detail()).contains("code=51");
    }

    @Test
    void vietqrReturningTheKnownCompany_countsAsUp() {
        when(restTemplate.getForEntity(contains("/business/"), eq(Map.class)))
            .thenReturn(ResponseEntity.ok(Map.of("code", "00",
                "data", Map.of("name", "CÔNG TY TNHH THƯƠNG MẠI VÀ DỊCH VỤ BẢO HÂN VIỆT NAM"))));

        SourceHealthService s = service();
        s.probeAll();

        assertThat(statusOf(s, "api.vietqr.io").up()).isTrue();
    }

    @Test
    void rdapWithoutRegistrationEvents_countsAsDown() {
        // A 200 with no events leaves P2 silently scoreless on domain age.
        when(restTemplate.getForEntity(contains("apple.com"), eq(Map.class)))
            .thenReturn(ResponseEntity.ok(Map.of("ldhName", "APPLE.COM")));

        SourceHealthService s = service();
        s.probeAll();

        assertThat(statusOf(s, "rdap.org").up()).isFalse();
        assertThat(statusOf(s, "rdap.org").detail()).contains("no events");
    }

    @Test
    void networkFailure_isCapturedRatherThanThrown() {
        when(restTemplate.getForEntity(anyString(), eq(Map.class)))
            .thenThrow(new org.springframework.web.client.ResourceAccessException("connect timed out"));

        SourceHealthService s = service();
        s.probeAll();   // one broken source must not abort the sweep

        assertThat(statusOf(s, "api.vietqr.io").up()).isFalse();
        assertThat(statusOf(s, "api.vietqr.io").detail()).contains("connect timed out");
        assertThat(s.snapshot()).hasSize(4);
    }

    @Test
    void stateTimestampSurvivesRepeatedProbesSoOutageLengthIsKnown() throws Exception {
        when(restTemplate.getForEntity(anyString(), eq(Map.class)))
            .thenThrow(new org.springframework.web.client.ResourceAccessException("down"));

        SourceHealthService s = service();
        s.probeAll();
        var first = statusOf(s, "api.vietqr.io").since();
        Thread.sleep(5);
        s.probeAll();

        // "since" must not reset on every sweep, otherwise a source that has been
        // dead for a month always looks like it just broke.
        assertThat(statusOf(s, "api.vietqr.io").since()).isEqualTo(first);
    }

    @Test
    void failuresSortFirst() {
        when(restTemplate.getForEntity(contains("/business/"), eq(Map.class)))
            .thenReturn(ResponseEntity.ok(Map.of("code", "51")));
        when(restTemplate.getForEntity(contains("apple.com"), eq(Map.class)))
            .thenReturn(ResponseEntity.ok(Map.of("events", List.of(Map.of("eventAction", "registration")))));

        SourceHealthService s = service();
        s.probeAll();

        assertThat(s.snapshot().get(0).up()).isFalse();
    }

    @Test
    @EnabledIfSystemProperty(named = "health.network", matches = "true")
    void realSources_areReachable() {
        SourceHealthService s = new SourceHealthService(new RestTemplate());
        ReflectionTestUtils.setField(s, "vietqrUrl", "https://api.vietqr.io/v2");
        ReflectionTestUtils.setField(s, "rdapBaseUrl", "https://rdap.org/domain");
        ReflectionTestUtils.setField(s, "nominatimUrl", "https://nominatim.openstreetmap.org");
        ReflectionTestUtils.setField(s, "nominatimContact", "test@marketscout.local");
        s.probeAll();

        assertThat(s.snapshot()).allSatisfy(st ->
            assertThat(st.up()).as("%s: %s", st.source(), st.detail()).isTrue());
    }
}

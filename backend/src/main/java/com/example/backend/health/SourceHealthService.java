package com.example.backend.health;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.function.Supplier;

/**
 * Canary checks for the external sources the 8 pillars depend on.
 *
 * masothue.vn stopped resolving and importyeti.com started returning 403 at some
 * unknown point, and nothing noticed — a dead source returns "not found", which is
 * indistinguishable from a company that genuinely has no record. The pipeline went
 * on scoring confidently off empty results until a customer complained. Each probe
 * below asks a source about a fixed subject whose answer is known, so "the source
 * is down" can never again masquerade as "the company looks bad".
 *
 * Metered sources (Tavily, OpenSanctions, Companies House) are NOT probed by
 * default: spending a daily API budget to discover the budget is fine would be a
 * worse failure than the one this guards against. Enable per-source only where the
 * quota can afford it.
 */
@Slf4j
@Service
public class SourceHealthService {

    /** `up=false` with a `detail` explaining what the probe actually saw. */
    public record SourceStatus(String source, String pillar, boolean up, String detail,
                               Instant since, Instant lastChecked) {}

    /** A company that exists and is trading — its absence means the source is broken. */
    private static final String KNOWN_MST = "0107781148";

    private final RestTemplate restTemplate;
    private final Map<String, SourceStatus> statuses = new ConcurrentHashMap<>();

    @Value("${app.vietqr.base-url:https://api.vietqr.io/v2}")
    private String vietqrUrl;

    @Value("${app.rdap.base-url:https://rdap.org/domain}")
    private String rdapBaseUrl;

    @Value("${app.nominatim.base-url:https://nominatim.openstreetmap.org}")
    private String nominatimUrl;

    @Value("${app.nominatim.contact:contact@marketscout.local}")
    private String nominatimContact;

    public SourceHealthService(RestTemplate restTemplate) {
        this.restTemplate = restTemplate;
    }

    @Scheduled(fixedDelayString = "${app.health.probe-interval-ms:3600000}", initialDelay = 60_000)
    public void probeAll() {
        probe("api.vietqr.io", "P1", this::probeVietQr);
        probe("rdap.org", "P2", this::probeRdap);
        probe("nominatim.openstreetmap.org", "P4", this::probeNominatim);
        probe("efts.sec.gov", "P5", this::probeSecEdgar);
    }

    /** Latest known state of every source, worst first so a failure is never below the fold. */
    public List<SourceStatus> snapshot() {
        List<SourceStatus> all = new ArrayList<>(statuses.values());
        all.sort(Comparator.comparing(SourceStatus::up).thenComparing(SourceStatus::source));
        return all;
    }

    private void probe(String source, String pillar, Supplier<String> check) {
        String failure;
        try {
            failure = check.get();
        } catch (Exception e) {
            failure = e.getClass().getSimpleName() + ": " + e.getMessage();
        }
        boolean up = failure == null;
        SourceStatus previous = statuses.get(source);
        // `since` tracks how long the CURRENT state has held, so a report can say
        // "down for 3 days" rather than just "down".
        Instant since = (previous != null && previous.up() == up) ? previous.since() : Instant.now();
        statuses.put(source, new SourceStatus(source, pillar, up,
            up ? "OK" : failure, since, Instant.now()));

        if (previous == null || previous.up() != up) {
            if (up) log.info("Source health: {} ({}) recovered", source, pillar);
            else log.error("Source health: {} ({}) is DOWN — {}", source, pillar, failure);
        }
    }

    // ── Probes: return null when healthy, or a reason when not ────────────────

    @SuppressWarnings("unchecked")
    private String probeVietQr() {
        ResponseEntity<Map> resp = restTemplate.getForEntity(
            vietqrUrl + "/business/" + KNOWN_MST, Map.class);
        Map<String, Object> body = resp.getBody();
        if (body == null) return "empty body";
        if (!"00".equals(String.valueOf(body.get("code")))) return "code=" + body.get("code");
        Object data = body.get("data");
        if (!(data instanceof Map<?, ?> d) || d.get("name") == null) return "no company name in payload";
        return null;
    }

    @SuppressWarnings("unchecked")
    private String probeRdap() {
        ResponseEntity<Map> resp = restTemplate.getForEntity(rdapBaseUrl + "/apple.com", Map.class);
        Map<String, Object> body = resp.getBody();
        if (body == null) return "empty body";
        // Registration events are what P2 reads for domain age; a 200 with no events
        // would leave the pillar silently scoreless.
        if (!(body.get("events") instanceof List<?> events) || events.isEmpty()) return "no events in RDAP payload";
        return null;
    }

    @SuppressWarnings("unchecked")
    private String probeNominatim() {
        HttpHeaders headers = new HttpHeaders();
        headers.set("User-Agent", "MarketScout-Verification/1.0 (" + nominatimContact + ")");
        ResponseEntity<List> resp = restTemplate.exchange(
            nominatimUrl + "/search?q=Hanoi&format=json&limit=1",
            HttpMethod.GET, new HttpEntity<>(headers), List.class);
        List<Object> body = resp.getBody();
        if (body == null || body.isEmpty()) return "no geocoding result for a known city";
        return null;
    }

    private String probeSecEdgar() {
        HttpHeaders headers = new HttpHeaders();
        headers.set("User-Agent", "MarketScout-Verification/1.0 (" + nominatimContact + ")");
        ResponseEntity<String> resp = restTemplate.exchange(
            "https://efts.sec.gov/LATEST/search-index?q=Apple",
            HttpMethod.GET, new HttpEntity<>(headers), String.class);
        if (!resp.getStatusCode().is2xxSuccessful()) return "HTTP " + resp.getStatusCode().value();
        return null;
    }
}

package com.example.backend.verification.crawler.p2;

import com.example.backend.shared.model.crawler.P2Data;
import com.example.backend.shared.model.crawler.PillarData;
import com.example.backend.shared.model.input.CompanyInput;
import com.example.backend.shared.cache.CacheService;
import com.example.backend.partners.TavilyClient;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.RequestEntity;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import javax.net.ssl.HttpsURLConnection;
import javax.net.ssl.SSLException;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.text.Normalizer;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Slf4j
@Service
@RequiredArgsConstructor
public class CrawlerP2 {

    @Value("${app.rdap.base-url:https://rdap.org/domain}")
    private String rdapBaseUrl;

    @Value("${app.cache.p2-ttl-days:7}")
    private int ttlDays;

    private final RestTemplate restTemplate;
    private final CacheService cacheService;
    private final TavilyClient tavilyClient;

    public P2Data fetch(CompanyInput input) {
        String domain = extractDomain(input.getWebsite());
        String key = "p2:" + (domain != null ? domain : input.getName().toLowerCase().replaceAll("\\s+", "_"));

        Optional<P2Data> cached = cacheService.get(key, P2Data.class);
        if (cached.isPresent()) {
            log.debug("P2 cache hit for {}", domain);
            return cached.get();
        }

        try {
            P2Data result = doFetch(input, domain);
            if (result.isFound()) {
                cacheService.set(key, result, Duration.ofDays(ttlDays), (short) 2, "rdap", input.getCountry());
            }
            return result;
        } catch (Exception e) {
            log.warn("P2 fetch failed for {}: {}", input.getName(), e.getMessage());
            return P2Data.builder().state(PillarData.DataState.SKIP).companyName(input.getName()).errorMsg("P2 error: " + e.getMessage()).fetchedAt(java.time.LocalDateTime.now()).build();
        }
    }

    @SuppressWarnings("unchecked")
    private P2Data doFetch(CompanyInput input, String domain) {
        boolean websiteDiscovered = false;

        // No website was supplied by the caller — Deep Verify almost never has one
        // (see discoverWebsite() doc). Without this, RDAP (the pillar's strongest
        // signal) would never run and every company would score as if it had no
        // official website, regardless of whether it actually does.
        if (domain == null || domain.isBlank()) {
            domain = discoverWebsite(input);
            websiteDiscovered = domain != null;
        }

        // Whatever the domain's source, it has to be shown to belong to THIS company
        // before its registration date and its certificate are reported as the
        // company's own. Search ranks the Hanoi stock exchange first for "Vingroup
        // official website" (hnx.vn hosts VIC's listing page), and the pillar used to
        // adopt it, then credit Vingroup with hnx.vn's 2005 domain age and its TLS
        // certificate — 75/75 at HIGH confidence, all of it wrong. A rejected domain
        // is dropped rather than kept, so nothing downstream can link to it or score
        // it; it survives only in rawText so a reviewer can see what was discarded.
        Boolean websiteVerified = domain != null ? verifyDomain(domain, input.getName()) : null;
        String rejectedDomain = null;
        if (domain != null && !Boolean.TRUE.equals(websiteVerified)) {
            log.debug("P2 rejected candidate domain {} for '{}' (verified={})", domain, input.getName(), websiteVerified);
            rejectedDomain = domain;
            domain = null;
        }
        boolean hasWebsite = domain != null;

        Integer domainAgeMonths = null;
        Boolean hasSsl = null;
        String registrar = null;

        if (hasWebsite) {
            try {
                String url = rdapBaseUrl + "/" + domain;
                RequestEntity<Void> req = RequestEntity.get(URI.create(url))
                    .header("Accept", "application/rdap+json, application/json")
                    .build();
                ResponseEntity<Map> resp = restTemplate.exchange(req, Map.class);
                Map<String, Object> rdap = resp.getBody();
                if (rdap != null) {
                    domainAgeMonths = extractRegistrationAgeMonths(rdap);
                    registrar = extractRegistrarName(rdap);
                }
            } catch (Exception e) {
                log.debug("RDAP lookup failed for {}: {}", domain, e.getMessage());
            }
            // Outside the RDAP block on purpose: an RDAP outage must not also wipe
            // out the certificate check, they are independent signals.
            hasSsl = checkSsl(domain);
        }

        // Supplement with Tavily
        String tavilyQuery = input.getName() + " official website social media presence";
        List<String> tavilyResults = tavilyClient.searchText(tavilyQuery, 3);

        // No website was supplied AND Tavily returned nothing — every field below
        // would default to a negative ("no website", "LOW" social presence) that
        // reads as a confirmed finding when in fact nothing was actually checked.
        if (!hasWebsite && tavilyResults.isEmpty()) {
            return P2Data.builder().state(PillarData.DataState.SKIP).companyName(input.getName())
                .errorMsg("Không có website để kiểm tra và không có kết quả từ Tavily").fetchedAt(LocalDateTime.now()).build();
        }

        String socialMediaScore = evaluateSocialMedia(tavilyResults);
        boolean usesFreeEmail = detectFreeEmail(tavilyResults);

        // Facebook content sits behind a login wall — search engines rarely index
        // the page itself, so this can only surface candidate URLs that happen to
        // be linked elsewhere (directories, articles), never confirm ownership.
        // A shop with several pages under similar names is common in VN — when
        // more than one candidate turns up we report all of them instead of
        // silently picking one, so a reviewer knows to check manually.
        List<String> facebookPages = tavilyClient.searchUrls(input.getName() + " Facebook page", 5).stream()
            .map(String::toLowerCase)
            .filter(u -> u.contains("facebook.com/"))
            .distinct()
            .limit(3)
            .toList();

        String rawText = String.format(
            "Company: %s | Domain: %s%s | DomainAgeMonths: %s | HasSSL: %s | SocialMedia: %s | Registrar: %s | Facebook: %s%s | Tavily: %s",
            input.getName(), domain, websiteDiscovered ? " (auto-discovered)" : "",
            domainAgeMonths, hasSsl, socialMediaScore, registrar, facebookPages,
            rejectedDomain != null ? " | RejectedDomain: " + rejectedDomain + " (không xác minh được thuộc về công ty)" : "",
            String.join(" ", tavilyResults)
        );

        return P2Data.builder()
            .state(PillarData.DataState.FOUND)
            .companyName(input.getName())
            // null, never false: neither "search found nothing" nor "the candidate
            // failed verification" establishes that the company has no website.
            .hasOfficialWebsite(hasWebsite ? Boolean.TRUE : null)
            .websiteVerified(websiteVerified)
            .domainAgeMonths(domainAgeMonths)
            .usesFreeEmail(usesFreeEmail)
            .facebookPages(facebookPages)
            .hasSsl(hasSsl)
            .socialMediaScore(socialMediaScore)
            .domain(domain)
            .registrar(registrar)
            .rawText(rawText)
            .dataSource("rdap + tavily")
            .fetchedAt(LocalDateTime.now())
            .build();
    }

    /**
     * Real TLS handshake against the domain. This used to be `hasSsl = hasWebsite`,
     * i.e. the report asserted "Website có chứng chỉ SSL" and awarded points without
     * ever testing anything. A handshake failure is a genuine negative; any other
     * error returns null (unknown) so a timeout never reads as "no certificate".
     */
    Boolean checkSsl(String domain) {
        HttpsURLConnection conn = null;
        try {
            conn = (HttpsURLConnection) URI.create("https://" + domain).toURL().openConnection();
            conn.setConnectTimeout(5000);
            conn.setReadTimeout(5000);
            conn.setInstanceFollowRedirects(false);
            conn.setRequestMethod("HEAD");
            conn.setRequestProperty("User-Agent", "MarketScout-Verification/1.0");
            conn.connect();
            return conn.getServerCertificates().length > 0;
        } catch (SSLException e) {
            log.debug("TLS handshake refused by {}: {}", domain, e.getMessage());
            return false;
        } catch (Exception e) {
            log.debug("TLS check inconclusive for {}: {}", domain, e.getMessage());
            return null;
        } finally {
            if (conn != null) conn.disconnect();
        }
    }

    /** Finds the "registration" event in an RDAP response and returns its age in months. */
    private Integer extractRegistrationAgeMonths(Map<String, Object> rdap) {
        Object eventsObj = rdap.get("events");
        if (!(eventsObj instanceof List<?> events)) return null;
        for (Object o : events) {
            if (o instanceof Map<?, ?> event
                    && "registration".equalsIgnoreCase(String.valueOf(event.get("eventAction")))) {
                return calcAgeMonths(String.valueOf(event.get("eventDate")));
            }
        }
        return null;
    }

    /** Finds the "registrar" entity in an RDAP response and returns its name (vCard "fn"). */
    private String extractRegistrarName(Map<String, Object> rdap) {
        Object entitiesObj = rdap.get("entities");
        if (!(entitiesObj instanceof List<?> entities)) return null;
        for (Object o : entities) {
            if (!(o instanceof Map<?, ?> entity)) continue;
            Object rolesObj = entity.get("roles");
            if (!(rolesObj instanceof List<?> roles) || !roles.contains("registrar")) continue;

            Object vcardObj = entity.get("vcardArray");
            if (!(vcardObj instanceof List<?> vcard) || vcard.size() < 2) continue;
            Object propsObj = vcard.get(1);
            if (!(propsObj instanceof List<?> props)) continue;
            for (Object propObj : props) {
                if (propObj instanceof List<?> prop && prop.size() >= 4 && "fn".equals(prop.get(0))) {
                    return String.valueOf(prop.get(3));
                }
            }
        }
        return null;
    }

    /** Minimum {@link #nameAffinity} for a domain to be adopted without reading its homepage. */
    private static final int NAME_MATCH_MIN = 40;
    /** Homepages fetched when no candidate carries the name — bounds discovery latency. */
    private static final int MAX_IDENTITY_CHECKS = 2;
    private static final int IDENTITY_READ_LIMIT = 64 * 1024;

    private static final Pattern TITLE_TAG =
        Pattern.compile("<title[^>]*>(.*?)</title>", Pattern.CASE_INSENSITIVE | Pattern.DOTALL);
    private static final Pattern META_TAG = Pattern.compile("<meta\\b[^>]*>", Pattern.CASE_INSENSITIVE);
    private static final Pattern IDENTITY_META = Pattern.compile(
        "(?:property|name)\\s*=\\s*[\"'](?:og:site_name|og:title|description|application-name)[\"']",
        Pattern.CASE_INSENSITIVE);
    private static final Pattern META_CONTENT =
        Pattern.compile("content\\s*=\\s*[\"']([^\"']*)[\"']", Pattern.CASE_INSENSITIVE);

    // Legal-form words carry no identity: every second Vietnamese company is a
    // "Công ty Cổ phần", and none of them put that in their domain.
    private static final Set<String> LEGAL_FORM_TOKENS = Set.of(
        "cong", "ty", "co", "phan", "cophan", "tnhh", "mtv", "cp", "tap", "doan", "dn",
        "jsc", "joint", "stock", "company", "corporation", "corp", "limited", "ltd",
        "inc", "plc", "llc", "gmbh", "pte", "sdn", "bhd", "nv", "bv", "ag", "srl", "spa"
    );

    // Domains that show up in "official website" searches but are never actually
    // the company's own site — a directory/social profile is not a homepage. This
    // is only a cheap pre-filter now; nameAffinity() is what actually decides, so
    // sites missing from this list (exchanges, newspapers) no longer slip through.
    private static final List<String> EXCLUDED_DOMAIN_FRAGMENTS = List.of(
        "linkedin.", "facebook.", "instagram.", "twitter.", "x.com", "youtube.",
        "wikipedia.", "crunchbase.", "bloomberg.", "glassdoor.", "indeed.",
        "tiktok.", "pinterest.", "github.com", "medium.com", "yelp.", "google.com/maps",
        // Registry and company-lookup sites. These rank first for a company name or
        // tax ID, so without them P2 adopted masothue.com as the partner's own site
        // and reported ITS domain age and certificate as the partner's.
        "masothue.", "thongtindoanhnghiep.", "dangkykinhdoanh.", "dkkd.gov",
        "infodoanhnghiep.", "tratencongty.", "vietnamcredit.", "hsctvn.",
        "opencorporates.", "gleif.org", "sec.gov", "company-information.service.gov.uk",
        "dnb.com", "zoominfo.", "importyeti.", "panjiva.",
        // Marketplace profiles — relevant to P3 trade presence, never a homepage.
        "alibaba.", "made-in-china.", "europages.", "kompass."
    );

    /**
     * CompanyInput.website is essentially never populated by the Deep Verify
     * pipeline (chat and /verify both go straight from a company name to
     * scoring, with no website field collected upstream) — so without this,
     * RDAP never runs and P2 always scores "no website" regardless of reality.
     * Best-effort: search for the official site and take the first result whose
     * domain isn't an obviously-non-company one. May guess wrong for common
     * company names; a caller-supplied website (form input) always wins over this.
     */
    private String discoverWebsite(CompanyInput input) {
        return discoverWebsite(input.getName(), input.getCountry());
    }

    /** Callable by ScoringEngine so the domain is resolved once and shared with P3/P4/P8. */
    public String discoverWebsite(String companyName, String country) {
        String query = companyName + " official website"
            + (country != null && !country.isBlank() ? " " + country : "");
        List<String> urls = tavilyClient.searchUrls(query, 5);

        List<String> unmatched = new ArrayList<>();
        String best = null;
        int bestScore = 0;
        for (String url : urls) {
            String candidate = extractDomain(url);
            if (candidate == null) continue;
            String lower = candidate.toLowerCase();
            if (EXCLUDED_DOMAIN_FRAGMENTS.stream().anyMatch(lower::contains)) continue;

            int score = nameAffinity(candidate, companyName);
            if (score < NAME_MATCH_MIN) {
                if (!unmatched.contains(candidate)) unmatched.add(candidate);
                continue;
            }
            // Tie-breakers only — they can never promote a domain that doesn't
            // carry the company's name in the first place.
            String cc = normalize(country).replace(" ", "");
            if (cc.length() == 2 && lower.endsWith("." + cc)) score += 10;
            if (isHomepage(url)) score += 10;
            if (score > bestScore) {
                bestScore = score;
                best = candidate;
            }
        }
        if (best != null) return best;

        // Nothing carried the name. A legal name that differs from the brand is
        // completely normal ("Công ty CP Sữa Việt Nam" → vinamilk.com.vn), so the
        // top few get a chance to prove it from their own homepage before the
        // pillar gives up — otherwise the name test would drop correct answers.
        for (String candidate : unmatched.stream().limit(MAX_IDENTITY_CHECKS).toList()) {
            if (Boolean.TRUE.equals(homepageMentions(candidate, companyName))) return candidate;
        }
        log.debug("No verifiable official website for '{}' among {}", companyName, urls);
        return null;
    }

    /**
     * TRUE only on positive evidence that the domain belongs to the company: either
     * the domain carries its name, or the homepage says so. Null means the homepage
     * could not be read — unknown, never "not theirs", so an outage or a bot wall
     * cannot turn into a finding against the company.
     */
    Boolean verifyDomain(String domain, String companyName) {
        if (nameAffinity(domain, companyName) >= NAME_MATCH_MIN) return Boolean.TRUE;
        return homepageMentions(domain, companyName);
    }

    /**
     * How much a domain looks like it belongs to this company, 0-60. This is the
     * check that replaces the old blocklist: enumerating every stock exchange,
     * newspaper and aggregator that outranks a company's own site is impossible,
     * but requiring the company's name in the domain rejects all of them at once.
     */
    static int nameAffinity(String domain, String companyName) {
        if (domain == null || domain.isBlank()) return 0;
        String label = normalize(domain.split("\\.")[0]).replace(" ", "");
        if (label.isEmpty()) return 0;

        List<String> tokens = nameTokens(companyName);
        if (tokens.isEmpty()) return 0;
        String compact = String.join("", tokens);

        if (compact.length() >= 4 && label.contains(compact)) return 60;
        if (label.length() >= 4 && compact.contains(label)) return 60;
        // "VCB" for "Vietcombank Joint Stock Commercial Bank" and the like.
        if (tokens.size() >= 3) {
            String acronym = tokens.stream().map(t -> t.substring(0, 1)).reduce("", String::concat);
            if (acronym.length() >= 3 && label.equals(acronym)) return 50;
        }
        // A single distinctive word is enough: "vinfast" inside "vinfastauto".
        if (tokens.stream().anyMatch(t -> t.length() >= 4 && label.contains(t))) return 40;
        return 0;
    }

    /**
     * Reads the homepage's own identity text (title / og:site_name / description)
     * and asks whether it names this company. Deliberately not the whole body: any
     * news or directory page mentions the company somewhere in its text, but a
     * stock exchange's homepage does not put a listed company in its own title.
     *
     * Known limit, measured rather than assumed: sites behind Cloudflare (vingroup.net
     * among them) answer a Java client with a 403 challenge page no matter what
     * headers are sent — it fingerprints the TLS handshake, and chasing that is an
     * arms race, not verification. Those come back null (unknown) and are simply not
     * adopted through this path; in practice they are already caught by
     * {@link #nameAffinity}, which is why this is a fallback and not the main test.
     */
    Boolean homepageMentions(String domain, String companyName) {
        HttpURLConnection conn = null;
        try {
            conn = (HttpURLConnection) URI.create("https://" + domain).toURL().openConnection();
            conn.setConnectTimeout(5000);
            conn.setReadTimeout(5000);
            conn.setInstanceFollowRedirects(true);
            conn.setRequestProperty("User-Agent", "MarketScout-Verification/1.0");
            String html;
            try (InputStream in = conn.getInputStream()) {
                html = new String(in.readNBytes(IDENTITY_READ_LIMIT), StandardCharsets.UTF_8);
            }
            String identity = normalize(extractIdentityText(html));
            if (identity.isBlank()) return null;

            List<String> tokens = nameTokens(companyName);
            String compact = String.join("", tokens);
            if (compact.length() >= 4 && identity.replace(" ", "").contains(compact)) return Boolean.TRUE;
            List<String> significant = tokens.stream().filter(t -> t.length() >= 3).toList();
            return !significant.isEmpty() && significant.stream().allMatch(identity::contains);
        } catch (Exception e) {
            log.debug("Homepage identity check inconclusive for {}: {}", domain, e.getMessage());
            return null;
        } finally {
            if (conn != null) conn.disconnect();
        }
    }

    private static String extractIdentityText(String html) {
        StringBuilder sb = new StringBuilder();
        Matcher title = TITLE_TAG.matcher(html);
        if (title.find()) sb.append(title.group(1)).append(' ');
        Matcher meta = META_TAG.matcher(html);
        while (meta.find()) {
            String tag = meta.group();
            if (!IDENTITY_META.matcher(tag).find()) continue;
            Matcher content = META_CONTENT.matcher(tag);
            if (content.find()) sb.append(content.group(1)).append(' ');
        }
        return sb.toString();
    }

    /** Diacritic-free, punctuation-free lowercase — "Tập đoàn" and "tap doan" must compare equal. */
    static String normalize(String s) {
        if (s == null) return "";
        String stripped = Normalizer.normalize(s, Normalizer.Form.NFD)
            .replaceAll("\\p{M}", "")
            .toLowerCase()
            .replace('đ', 'd');   // NFD does not decompose đ
        return stripped.replaceAll("[^a-z0-9]+", " ").trim();
    }

    /** Company name minus its legal form, so "Công ty CP Vingroup" compares as "vingroup". */
    private static List<String> nameTokens(String companyName) {
        List<String> all = Arrays.stream(normalize(companyName).split(" "))
            .filter(t -> !t.isBlank()).toList();
        List<String> core = all.stream().filter(t -> !LEGAL_FORM_TOKENS.contains(t)).toList();
        return core.isEmpty() ? all : core;   // a name made only of legal words keeps them
    }

    private static boolean isHomepage(String url) {
        String path = url.replaceFirst("^https?://[^/]+", "");
        return path.isBlank() || path.equals("/");
    }

    private String evaluateSocialMedia(List<String> results) {
        String combined = String.join(" ", results).toLowerCase();
        int score = 0;
        if (combined.contains("linkedin")) score++;
        if (combined.contains("facebook")) score++;
        if (combined.contains("twitter") || combined.contains("x.com")) score++;
        if (combined.contains("instagram")) score++;
        if (score >= 3) return "HIGH";
        if (score >= 1) return "MEDIUM";
        return "LOW";
    }

    private boolean detectFreeEmail(List<String> results) {
        String combined = String.join(" ", results).toLowerCase();
        return combined.contains("gmail") || combined.contains("yahoo") || combined.contains("hotmail");
    }

    private String extractDomain(String website) {
        if (website == null || website.isBlank()) return null;
        return website.replaceAll("https?://(www\\.)?", "").split("/")[0];
    }

    private Integer calcAgeMonths(String dateStr) {
        if (dateStr == null || dateStr.isBlank()) return null;
        try {
            java.time.LocalDate date = java.time.LocalDate.parse(dateStr.substring(0, 10));
            return (int) java.time.temporal.ChronoUnit.MONTHS.between(date, java.time.LocalDate.now());
        } catch (Exception e) {
            return null;
        }
    }
}

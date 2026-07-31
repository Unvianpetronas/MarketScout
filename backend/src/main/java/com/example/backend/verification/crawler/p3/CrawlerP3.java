package com.example.backend.verification.crawler.p3;

import com.example.backend.partners.TavilyClient;
import com.example.backend.shared.cache.CacheService;
import com.example.backend.shared.model.crawler.P3Data;
import com.example.backend.shared.model.crawler.PillarData;
import com.example.backend.shared.model.input.CompanyInput;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Locale;
import java.util.Optional;

/**
 * P3 — Trade Presence.
 *
 * Replaces the previous VN/international split. Both of its sources are gone:
 * ecosys.vcci.com.vn no longer resolves at all, and importyeti.com returns 403 to
 * server-side clients — so P3 was scoring every company off an empty result.
 *
 * No free source publishes customs manifests, so this pillar deliberately does NOT
 * claim shipment counts, routes or volume trends. It measures whether the company
 * actually shows up in the places a real trading business shows up, and every
 * signal it reports carries a URL the customer can open. Signals are the same
 * everywhere, so one crawler serves every country.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class CrawlerP3 {

    @Value("${app.cache.p3-ttl-days:7}")
    private int ttlDays;

    /** Marketplaces where an exporter keeps a public buyer-facing profile. */
    private static final List<String> B2B_HOSTS = List.of(
        "alibaba.com", "made-in-china.com", "ec21.com", "tradeindia.com",
        "globalsources.com", "indiamart.com", "tradekey.com", "go4worldbusiness.com");

    /** Industry directories and trade-fair exhibitor listings. */
    private static final List<String> DIRECTORY_HOSTS = List.of(
        "kompass.com", "europages.", "vcci.com.vn", "yellowpages.",
        "expo", "fair", "exhibitor", "trade-show", "hoicho");

    /** Words that make a search hit trade-related rather than generic company news. */
    private static final List<String> TRADE_TERMS = List.of(
        "export", "import", "shipment", "container", "fob", "cif", "oem",
        "xuất khẩu", "nhập khẩu", "lô hàng", "container");

    private final CacheService cacheService;
    private final TavilyClient tavilyClient;

    public P3Data fetch(CompanyInput input) {
        String key = "p3:" + input.getName().toLowerCase(Locale.ROOT).replaceAll("\\s+", "_");
        Optional<P3Data> cached = cacheService.get(key, P3Data.class);
        if (cached.isPresent()) {
            log.debug("P3 cache hit for {}", input.getName());
            return cached.get();
        }
        try {
            P3Data result = doFetch(input);
            if (result.isFound()) {
                cacheService.set(key, result, Duration.ofDays(ttlDays), (short) 3, "tavily", input.getCountry());
            }
            return result;
        } catch (Exception e) {
            log.warn("P3 fetch failed for {}: {}", input.getName(), e.getMessage());
            return skip(input, "P3 error: " + e.getMessage());
        }
    }

    private P3Data doFetch(CompanyInput input) {
        String name = input.getName();
        List<String> tradeUrls = tavilyClient.searchUrls(name + " export import B2B supplier", 8);
        List<String> directoryUrls = tavilyClient.searchUrls(name + " company directory trade fair exhibitor", 5);

        // Search itself is unavailable — that is a technical failure, not a company
        // with no trade presence. Scoring it as "nothing found" would put a clean
        // exporter and an outage in the same bucket.
        if (tradeUrls.isEmpty() && directoryUrls.isEmpty()) {
            return skip(input, "Không tra được hiện diện thương mại — nguồn tìm kiếm không phản hồi (lỗi kỹ thuật)");
        }

        String b2bProfileUrl = firstMatching(tradeUrls, B2B_HOSTS);
        String directoryUrl = firstMatching(concat(directoryUrls, tradeUrls), DIRECTORY_HOSTS);
        int newsMentions = countTradeNews(tradeUrls);
        Boolean websiteHasTradeContent = websiteMentionsTrade(input, tradeUrls);

        String rawText = String.format(
            "Company: %s | B2B profile: %s | Directory: %s | Own-site trade content: %s | Trade news hits: %d",
            name, b2bProfileUrl, directoryUrl, websiteHasTradeContent, newsMentions);

        return P3Data.builder()
            .state(PillarData.DataState.FOUND)
            .companyName(name)
            .b2bProfileUrl(b2bProfileUrl)
            .directoryUrl(directoryUrl)
            .websiteHasTradeContent(websiteHasTradeContent)
            .tradeNewsMentions(newsMentions)
            // Left to the fact-extraction step: comparing declared trade lines against
            // the registry's recorded industry needs the P1 record, which this crawler
            // does not receive. Guessing true here is what the old VN crawler did.
            .isIndustryMatched(null)
            .rawText(rawText)
            .dataSource("tavily")
            .fetchedAt(LocalDateTime.now())
            .build();
    }

    /**
     * Whether the company's OWN domain surfaces for trade terms. Only meaningful
     * once the website is known — returns null (unknown) otherwise rather than
     * false, which the rubric would otherwise read as "their site says nothing
     * about trading".
     */
    private Boolean websiteMentionsTrade(CompanyInput input, List<String> tradeUrls) {
        String website = input.getWebsite();
        if (website == null || website.isBlank()) return null;
        String host = website.toLowerCase(Locale.ROOT)
            .replaceAll("^https?://", "").replaceAll("^www\\.", "").replaceAll("/.*$", "");
        if (host.isBlank()) return null;
        return tradeUrls.stream().anyMatch(u -> u.toLowerCase(Locale.ROOT).contains(host));
    }

    /** Distinct trade-flavoured hits that are not marketplace or directory pages. */
    private int countTradeNews(List<String> urls) {
        return (int) urls.stream()
            .map(u -> u.toLowerCase(Locale.ROOT))
            .filter(u -> B2B_HOSTS.stream().noneMatch(u::contains))
            .filter(u -> DIRECTORY_HOSTS.stream().noneMatch(u::contains))
            .filter(u -> TRADE_TERMS.stream().anyMatch(u::contains))
            .distinct()
            .count();
    }

    private String firstMatching(List<String> urls, List<String> hosts) {
        return urls.stream()
            .filter(u -> hosts.stream().anyMatch(h -> u.toLowerCase(Locale.ROOT).contains(h)))
            .findFirst().orElse(null);
    }

    private List<String> concat(List<String> a, List<String> b) {
        return java.util.stream.Stream.concat(a.stream(), b.stream()).toList();
    }

    private P3Data skip(CompanyInput input, String reason) {
        return P3Data.builder()
            .state(PillarData.DataState.SKIP)
            .companyName(input.getName())
            .errorMsg(reason)
            .fetchedAt(LocalDateTime.now())
            .build();
    }
}

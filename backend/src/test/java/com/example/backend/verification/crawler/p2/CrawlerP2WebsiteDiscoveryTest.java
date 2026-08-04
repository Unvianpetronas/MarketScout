package com.example.backend.verification.crawler.p2;

import com.example.backend.partners.TavilyClient;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfSystemProperty;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.doReturn;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.spy;
import static org.mockito.Mockito.when;

/**
 * Website discovery used to be "first search result not on a blocklist wins".
 * Searching "Vingroup official website Vietnam" ranks the Hanoi stock exchange
 * (hnx.vn, which hosts VIC's listing page) first, so the report adopted hnx.vn as
 * Vingroup's own site and then reported ITS domain age and ITS certificate as the
 * company's — 75/75, confidence HIGH, entirely wrong.
 *
 * A blocklist can never enumerate every exchange, newspaper and aggregator on the
 * web, so these pin the replacement rule: a domain is only adopted on positive
 * evidence that it belongs to the company.
 */
class CrawlerP2WebsiteDiscoveryTest {

    private final TavilyClient tavily = mock(TavilyClient.class);
    private final CrawlerP2 crawler = spy(new CrawlerP2(null, null, tavily));

    @Test
    void discoverWebsite_prefersNameMatchOverSearchRank() {
        when(tavily.searchUrls(anyString(), anyInt())).thenReturn(List.of(
            "https://hnx.vn/vi-vn/",                       // ranked first, not the company's site
            "https://cafef.vn/vingroup-vic.chn",
            "https://vingroup.net/"
        ));

        assertThat(crawler.discoverWebsite("Tập đoàn Vingroup", "VN")).isEqualTo("vingroup.net");
    }

    @Test
    void discoverWebsite_noNameMatchAndHomepageDoesNotConfirm_returnsNull() {
        // Better to report "could not determine an official website" than to
        // attribute a stock exchange's domain to the company being verified.
        when(tavily.searchUrls(anyString(), anyInt())).thenReturn(List.of(
            "https://hnx.vn/vi-vn/",
            "https://cafef.vn/vingroup-vic.chn"
        ));
        doReturn(false).when(crawler).homepageMentions(anyString(), anyString());

        assertThat(crawler.discoverWebsite("Tập đoàn Vingroup", "VN")).isNull();
    }

    @Test
    void discoverWebsite_legalNameDiffersFromBrand_recoveredByHomepageCheck() {
        // "Công ty CP Sữa Việt Nam" shares no token with vinamilk.com.vn, so the
        // name test alone would drop a correct answer. The homepage says who it is.
        when(tavily.searchUrls(anyString(), anyInt())).thenReturn(List.of("https://vinamilk.com.vn/"));
        doReturn(true).when(crawler).homepageMentions("vinamilk.com.vn", "Công ty CP Sữa Việt Nam");

        assertThat(crawler.discoverWebsite("Công ty CP Sữa Việt Nam", "VN")).isEqualTo("vinamilk.com.vn");
    }

    @Test
    void discoverWebsite_ignoresDirectoryAndSocialResults() {
        when(tavily.searchUrls(anyString(), anyInt())).thenReturn(List.of(
            "https://www.linkedin.com/company/hoaphat",
            "https://masothue.com/0100100008-tap-doan-hoa-phat",
            "https://www.hoaphat.com.vn/"
        ));

        assertThat(crawler.discoverWebsite("Tập đoàn Hòa Phát", "VN")).isEqualTo("hoaphat.com.vn");
    }

    @Test
    void nameAffinity_scoresBrandDomainsAboveUnrelatedOnes() {
        assertThat(CrawlerP2.nameAffinity("vingroup.net", "Tập đoàn Vingroup")).isGreaterThanOrEqualTo(40);
        assertThat(CrawlerP2.nameAffinity("vinfastauto.com", "VinFast Trading and Production JSC")).isGreaterThanOrEqualTo(40);
        assertThat(CrawlerP2.nameAffinity("hnx.vn", "Tập đoàn Vingroup")).isZero();
        assertThat(CrawlerP2.nameAffinity("cafef.vn", "Tập đoàn Vingroup")).isZero();
    }

    @Test
    void verifyDomain_strongNameMatchNeedsNoNetworkCall() {
        assertThat(crawler.verifyDomain("vingroup.net", "Tập đoàn Vingroup")).isTrue();
    }

    /**
     * The tests above stub the homepage check; these run it against real sites,
     * because the fallback is only worth having if real HTML actually separates an
     * owner from a bystander. Opt-in via -Dp2.network=true, same as the SSL tests.
     */
    @Test
    @EnabledIfSystemProperty(named = "p2.network", matches = "true")
    void homepageMentions_realBrandSite_confirmsCompanyWithADifferentLegalName() {
        // vinamilk.com.vn answers with <title>Vinamilk - Thương hiệu sữa hàng đầu
        // Việt Nam...</title>, which carries sữa/việt/nam — the legal name. This is
        // the case the name test alone cannot get right.
        assertThat(crawler.homepageMentions("vinamilk.com.vn", "Công ty CP Sữa Việt Nam")).isTrue();
    }

    @Test
    @EnabledIfSystemProperty(named = "p2.network", matches = "true")
    void homepageMentions_realExchangeSite_isNeverConfirmed() {
        // The site the old code adopted as Vingroup's. Its homepage ships no <title>
        // and Java rejects its certificate chain, so the answer is "unknown" rather
        // than a flat "not theirs" — and unknown is never adopted, only TRUE is.
        assertThat(crawler.homepageMentions("hnx.vn", "Tập đoàn Vingroup")).isNotEqualTo(true);
    }

    @Test
    @EnabledIfSystemProperty(named = "p2.network", matches = "true")
    void verifyDomain_cloudflareProtectedOwnSite_stillPassesOnTheName() {
        // vingroup.net returns a 403 challenge to any Java client, so the homepage
        // fallback cannot read it. The name in the domain is what carries this one.
        assertThat(crawler.verifyDomain("vingroup.net", "Tập đoàn Vingroup")).isTrue();
        assertThat(crawler.verifyDomain("hnx.vn", "Tập đoàn Vingroup")).isNotEqualTo(true);
    }

    @Test
    void homepageMentions_unreachableHost_isUnknownNotFalse() {
        // "Could not check" must never read as "this domain is not theirs" —
        // that would turn an outage into a finding against the company.
        assertThat(crawler.homepageMentions("this-domain-should-not-exist-marketscout.invalid", "Vingroup")).isNull();
    }
}

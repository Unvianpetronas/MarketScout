package com.example.backend.verification.crawler.p2;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfSystemProperty;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * P2 used to set `hasSsl = hasWebsite`, so the report claimed "Website có chứng
 * chỉ SSL" and awarded 15 points without ever opening a connection. These pin the
 * three outcomes the replacement must distinguish: verified, refused, unknown.
 *
 * Network-dependent, so opt-in via -Dp2.network=true rather than failing CI when
 * the sandbox has no egress.
 */
class CrawlerP2SslTest {

    private final CrawlerP2 crawler = new CrawlerP2(null, null, null);

    @Test
    void checkSsl_unresolvableHost_isUnknownNotFalse() {
        // A DNS failure means "we could not check" — reporting it as "no certificate"
        // is the exact confusion that made dead sources look like bad companies.
        assertThat(crawler.checkSsl("this-domain-should-not-exist-marketscout.invalid")).isNull();
    }

    @Test
    @EnabledIfSystemProperty(named = "p2.network", matches = "true")
    void checkSsl_realHttpsSite_isVerified() {
        assertThat(crawler.checkSsl("example.com")).isTrue();
    }
}

package com.example.backend.verification.crawler.p1;

import com.example.backend.shared.model.crawler.P1Data;
import com.example.backend.shared.model.crawler.PillarData;
import com.example.backend.shared.model.input.CompanyInput;
import com.example.backend.shared.cache.CacheService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.util.Optional;

@Slf4j
@Service
@RequiredArgsConstructor
public class CrawlerP1Router {

    @Value("${app.cache.p1-ttl-days:7}")
    private int ttlDays;

    private final CrawlerP1VN crawlerP1VN;
    private final CrawlerP1Intl crawlerP1Intl;
    private final CacheService cacheService;

    public P1Data fetch(CompanyInput input) {
        String key = buildKey(input);
        Optional<P1Data> cached = cacheService.get(key, P1Data.class);
        if (cached.isPresent()) {
            log.debug("P1 cache hit for {}", input.getName());
            return cached.get();
        }

        P1Data result = route(input);

        if (result.isFound()) {
            cacheService.set(key, result, Duration.ofDays(ttlDays), (short) 1,
                input.isVietnam() ? "vietqr" : "gleif",
                input.getCountry());
        }
        return result;
    }

    private P1Data route(CompanyInput input) {
        if (input.isVietnam()) {
            if (input.hasTaxId()) {
                log.info("P1 CASE 1: VN + MST {} → VietQR", input.getTaxId());
                return crawlerP1VN.fetchByMST(input.getTaxId());
            } else {
                log.info("P1 CASE 2: VN + name only → MST lookup for {}", input.getName());
                P1Data result = crawlerP1VN.findMSTByName(input.getName());
                // CASE 2b: không tra được MST và tên không có dấu tiếng Việt
                // → có thể là công ty nước ngoài bị route nhầm, thử GLEIF
                if (!result.isFound() && looksLikeForeignName(input.getName())) {
                    log.info("P1 CASE 2b: no VN match + no VN diacritics → trying GLEIF for '{}'", input.getName());
                    return crawlerP1Intl.fetchByName(input.getName(), input.getCountry());
                }
                return result;
            }
        } else {
            log.info("P1 CASE 3: International → GLEIF for {}", input.getName());
            return crawlerP1Intl.fetchByName(input.getName(), input.getCountry());
        }
    }

    /**
     * Trả về true nếu tên không chứa ký tự tiếng Việt có dấu.
     * Dùng để phát hiện tên nước ngoài bị route nhầm vào pipeline VN.
     */
    private boolean looksLikeForeignName(String name) {
        if (name == null || name.isBlank()) return false;
        return !name.matches(".*[àáâãèéêìíòóôõùúýăđơưạảấầẩẫậắằẳẵặẹẻẽếềểễệỉịọỏốồổỗộớờởỡợụủứừửữựỳỵỷỹ"
            + "ÀÁÂÃÈÉÊÌÍÒÓÔÕÙÚÝĂĐƠƯẠẢẤẦẨẪẬẮẰẲẴẶẸẺẼẾỀỂỄỆỈỊỌỎỐỒỔỖỘỚỜỞỠỢỤỦỨỪỬỮỰỲỴỶỸ].*");
    }

    private String buildKey(CompanyInput input) {
        if (input.isVietnam() && input.hasTaxId()) {
            return "p1:vn:" + input.getTaxId();
        } else if (!input.isVietnam()) {
            String slug = input.getName() != null ? input.getName().toLowerCase().replaceAll("\\s+", "_") : "unknown";
            return "p1:intl:" + slug;
        } else {
            String slug = input.getName() != null ? input.getName().toLowerCase().replaceAll("\\s+", "_") : "unknown";
            return "p1:vn:name:" + slug;
        }
    }
}

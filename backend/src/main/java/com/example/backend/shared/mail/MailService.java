package com.example.backend.shared.mail;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.List;
import java.util.Map;

/**
 * Centralized transactional email sender (Mailtrap HTTP API).
 * All product emails go out in English.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class MailService {

    private final RestTemplate restTemplate;

    @Value("${mailtrap.api-token}")
    private String apiToken;

    @Value("${mailtrap.api-url}")
    private String apiUrl;

    @Value("${mailtrap.from-email}")
    private String fromEmail;

    @Value("${mailtrap.from-name:MarketScout}")
    private String fromName;

    /** Sends an HTML email. Returns true on success; never throws. */
    public boolean send(String toEmail, String subject, String html) {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setBearerAuth(apiToken);

        Map<String, Object> body = Map.of(
                "from",    Map.of("email", fromEmail, "name", fromName),
                "to",      List.of(Map.of("email", toEmail)),
                "subject", subject,
                "html",    html
        );

        try {
            restTemplate.postForEntity(apiUrl, new HttpEntity<>(body, headers), String.class);
            return true;
        } catch (Exception e) {
            log.warn("Failed to send email to {} (subject='{}'): {}", toEmail, subject, e.getMessage());
            return false;
        }
    }
}

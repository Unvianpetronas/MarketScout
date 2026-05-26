package com.example.backend.service.EmailSending;

import com.example.backend.model.Users;
import com.example.backend.repository.UsersRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestTemplate;

import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class EmailVerificationService {

    private static final String PREFIX = "ev:";
    private static final Duration TOKEN_TTL = Duration.ofHours(24);

    private final StringRedisTemplate redis;
    private final RestTemplate restTemplate;
    private final UsersRepository usersRepository;

    @Value("${mailtrap.api-token}")
    private String apiToken;

    @Value("${mailtrap.api-url}")
    private String apiUrl;

    @Value("${mailtrap.from-email}")
    private String fromEmail;

    @Value("${mailtrap.from-name:MarketScout}")
    private String fromName;

    @Value("${app.base-url:http://localhost:8080}")
    private String baseUrl;

    @Value("${app.frontend-url:http://localhost:5173}")
    private String frontendUrl;

    public void sendVerification(UUID userId, String toEmail, String language) {
        String token = UUID.randomUUID().toString().replace("-", "");
        redis.opsForValue().set(PREFIX + token, userId.toString(), TOKEN_TTL);

        String verifyUrl = baseUrl + "/api/v1/auth/verify-email?token=" + token;
        boolean isVi = !"en".equalsIgnoreCase(language);

        send(
            toEmail,
            isVi ? "Xác thực email - MarketScout" : "Verify your email - MarketScout",
            buildHtml(verifyUrl, isVi)
        );
    }

    @Transactional
    public void verify(String token) {
        String userIdStr = redis.opsForValue().get(PREFIX + token);
        if (userIdStr == null) {
            throw new RuntimeException("Link xác thực không hợp lệ hoặc đã hết hạn");
        }

        Users user = usersRepository.findById(UUID.fromString(userIdStr))
                .orElseThrow(() -> new RuntimeException("Người dùng không tồn tại"));

        if (!user.getEmailVerified()) {
            user.setEmailVerified(true);
            user.setUpdatedAt(Instant.now());
            usersRepository.save(user);
        }

        redis.delete(PREFIX + token);
    }

    public void resend(String email) {
        Users user = usersRepository.findByEmail(email.trim().toLowerCase())
                .orElseThrow(() -> new RuntimeException("Email không tồn tại"));

        if (user.getEmailVerified()) {
            throw new RuntimeException("Email đã được xác thực trước đó");
        }

        sendVerification(user.getId(), user.getEmail(), user.getLanguage());
    }

    public String getFrontendUrl() {
        return frontendUrl;
    }

    private void send(String toEmail, String subject, String html) {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setBearerAuth(apiToken);

        Map<String, Object> body = Map.of(
                "from",    Map.of("email", fromEmail, "name", fromName),
                "to",      List.of(Map.of("email", toEmail)),
                "subject", subject,
                "html",    html
        );

        HttpEntity<Map<String, Object>> request = new HttpEntity<>(body, headers);
        try {
            restTemplate.postForEntity(apiUrl, request, String.class);
        } catch (Exception e) {
            throw new RuntimeException("Không thể gửi email: " + e.getMessage());
        }
    }

    private String buildHtml(String verifyUrl, boolean isVi) {
        String title    = isVi ? "Xác thực email của bạn"   : "Verify your email";
        String greeting = isVi ? "Cảm ơn bạn đã đăng ký <strong>MarketScout</strong>!"
                               : "Thank you for signing up for <strong>MarketScout</strong>!";
        String body     = isVi ? "Nhấn vào nút bên dưới để xác thực tài khoản:"
                               : "Click the button below to verify your account:";
        String btnText  = isVi ? "Xác thực email"           : "Verify email";
        String orCopy   = isVi ? "Hoặc copy link sau vào trình duyệt:"
                               : "Or copy this link into your browser:";
        String validity = isVi ? "Link có hiệu lực trong <strong>24 giờ</strong>."
                               : "This link is valid for <strong>24 hours</strong>.";
        String ignore   = isVi ? "Nếu bạn không đăng ký tài khoản này, hãy bỏ qua email này."
                               : "If you did not create this account, you can safely ignore this email.";

        return """
            <!DOCTYPE html>
            <html lang="%s">
            <body style="font-family:Arial,sans-serif;background:#f4f4f4;padding:32px">
              <div style="max-width:520px;margin:auto;background:white;border-radius:10px;padding:32px">
                <h2 style="color:#4F46E5;margin-top:0">%s</h2>
                <p>%s</p>
                <p>%s</p>
                <div style="text-align:center;margin:28px 0">
                  <a href="%s"
                     style="background:#4F46E5;color:white;padding:13px 30px;
                            text-decoration:none;border-radius:7px;font-size:15px;
                            display:inline-block">%s</a>
                </div>
                <p style="color:#666;font-size:13px">%s<br>
                  <span style="color:#4F46E5">%s</span>
                </p>
                <hr style="border:none;border-top:1px solid #eee;margin:24px 0">
                <p style="color:#999;font-size:12px">%s<br>%s</p>
              </div>
            </body>
            </html>
            """.formatted(
                isVi ? "vi" : "en",
                title, greeting, body,
                verifyUrl, btnText,
                orCopy, verifyUrl,
                validity, ignore
        );
    }
}

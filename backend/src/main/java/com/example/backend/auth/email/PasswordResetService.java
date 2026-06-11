package com.example.backend.auth.email;

import com.example.backend.domain.Users;
import com.example.backend.domain.UsersRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.http.*;
import org.springframework.security.crypto.password.PasswordEncoder;
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
public class PasswordResetService {

    // token → userId  (lookup khi click link)
    private static final String PREFIX       = "pr:";
    // userId → token  (để invalidate token cũ khi user reset lại)
    private static final String USER_PREFIX  = "pr_user:";
    private static final Duration TOKEN_TTL  = Duration.ofHours(1);

    private final StringRedisTemplate redis;
    private final RestTemplate restTemplate;
    private final UsersRepository usersRepository;
    private final PasswordEncoder passwordEncoder;

    @Value("${mailtrap.api-token}")
    private String apiToken;

    @Value("${mailtrap.api-url}")
    private String apiUrl;

    @Value("${mailtrap.from-email}")
    private String fromEmail;

    @Value("${mailtrap.from-name:MarketScout}")
    private String fromName;

    @Value("${app.frontend-url:http://localhost:3000}")
    private String frontendUrl;

    public void sendResetToken(UUID userId, String toEmail, String language) {
        // ── Xóa token cũ nếu user reset nhiều lần ──────────────────
        String oldToken = redis.opsForValue().get(USER_PREFIX + userId);
        if (oldToken != null) {
            redis.delete(PREFIX + oldToken);       // xóa token cũ
            redis.delete(USER_PREFIX + userId);    // xóa mapping cũ
        }

        // ── Tạo token mới ───────────────────────────────────────────
        String token = UUID.randomUUID().toString().replace("-", "");

        // Lưu token → userId (dùng khi click link)
        redis.opsForValue().set(PREFIX + token, userId.toString(), TOKEN_TTL);

        // Lưu userId → token (dùng để invalidate lần sau)
        redis.opsForValue().set(USER_PREFIX + userId, token, TOKEN_TTL);

        // ── Gửi email ───────────────────────────────────────────────
        String resetUrl = frontendUrl + "/reset-password?token=" + token;
        boolean isVi = !"en".equalsIgnoreCase(language);

        send(
                toEmail,
                isVi ? "Đặt lại mật khẩu - MarketScout" : "Reset your password - MarketScout",
                buildHtml(resetUrl, isVi)
        );
    }

    @Transactional
    public void resetPassword(String token, String newPassword) {
        String userIdStr = redis.opsForValue().get(PREFIX + token);
        if (userIdStr == null) {
            throw new RuntimeException("Password reset link is invalid or has expired");
        }

        Users user = usersRepository.findById(UUID.fromString(userIdStr))
                .orElseThrow(() -> new RuntimeException("User not found"));

        user.setPasswordHash(passwordEncoder.encode(newPassword));
        user.setUpdatedAt(Instant.now());
        usersRepository.save(user);

        // Xóa cả 2 key sau khi dùng xong
        redis.delete(PREFIX + token);
        redis.delete(USER_PREFIX + userIdStr);
    }

    // ── Private helpers ──────────────────────────────────────────────────────

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
            throw new RuntimeException("Failed to send email: " + e.getMessage());
        }
    }

    private String buildHtml(String resetUrl, boolean isVi) {
        String title    = isVi ? "Đặt lại mật khẩu"       : "Reset your password";
        String greeting = isVi ? "Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản <strong>MarketScout</strong> của bạn."
                : "We received a request to reset the password for your <strong>MarketScout</strong> account.";
        String body     = isVi ? "Nhấn vào nút bên dưới để đặt mật khẩu mới:"
                : "Click the button below to set a new password:";
        String btnText  = isVi ? "Đặt lại mật khẩu"       : "Reset password";
        String orCopy   = isVi ? "Hoặc copy link sau vào trình duyệt:"
                : "Or copy this link into your browser:";
        String validity = isVi ? "Link có hiệu lực trong <strong>1 giờ</strong>."
                : "This link is valid for <strong>1 hour</strong>.";
        String ignore   = isVi ? "Nếu bạn không yêu cầu đặt lại mật khẩu, hãy bỏ qua email này. Mật khẩu của bạn sẽ không thay đổi."
                : "If you did not request a password reset, you can safely ignore this email. Your password will not change.";

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
                resetUrl, btnText,
                orCopy, resetUrl,
                validity, ignore
        );
    }
}
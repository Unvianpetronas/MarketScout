package com.example.backend.controller;

import com.example.backend.DTO.AuthDTO;
import com.example.backend.config.JwtService;
import com.example.backend.service.EmailSending.EmailVerificationService;
import com.example.backend.service.EmailSending.PasswordResetService;
import com.example.backend.service.RefreshTokenService;
import com.example.backend.service.TokenBlacklistService;
import com.example.backend.service.UserService;
import io.jsonwebtoken.Claims;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.io.IOException;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/auth")
@RequiredArgsConstructor
public class AuthController {

    private final UserService userService;
    private final JwtService jwtService;
    private final TokenBlacklistService tokenBlacklistService;
    private final RefreshTokenService refreshTokenService;
    private final EmailVerificationService emailVerificationService;
    private final PasswordResetService passwordResetService;
    private static final Logger logger = LoggerFactory.getLogger(AuthController.class);

    @PostMapping("/users")
    public ResponseEntity<AuthDTO.RegisterResponse> register(@Valid @RequestBody AuthDTO.RegisterRequest req) {
        logger.info("Register request for: {}", req.getEmail());
        return ResponseEntity.ok(userService.register(req));
    }

    @PostMapping("/login")
    public ResponseEntity<AuthDTO.LoginResponse> login(@Valid @RequestBody AuthDTO.LoginRequest req) {
        logger.info("Login attempt for: {}", req.getEmail());
        return ResponseEntity.ok(userService.login(req));
    }

    @PostMapping("/logout")
    public ResponseEntity<Map<String, String>> logout(
            @RequestHeader("Authorization") String authHeader,
            @RequestBody(required = false) AuthDTO.LogoutRequest req) {
        String token = authHeader.replace("Bearer ", "");
        try {
            Claims claims = jwtService.parseToken(token);
            String jti = jwtService.getJti(claims);
            if (jti != null) {
                tokenBlacklistService.blacklist(jti, claims.getExpiration().toInstant());
            }
        } catch (RuntimeException ignored) {
            // Token already expired — blacklist not needed
        }
        if (req != null && req.getRefreshToken() != null) {
            refreshTokenService.revokeByToken(req.getRefreshToken());
        }
        return ResponseEntity.ok(Map.of("message", "Logged out successfully"));
    }

    @PostMapping("/refresh")
    public ResponseEntity<AuthDTO.RefreshResponse> refresh(@Valid @RequestBody AuthDTO.RefreshRequest req) {
        return ResponseEntity.ok(userService.refresh(req.getRefreshToken()));
    }

    // User clicks link in email → backend verifies → redirect to frontend
    @GetMapping("/verify-email")
    public void verifyEmail(@RequestParam String token, HttpServletResponse response) throws IOException {
        String frontendUrl = emailVerificationService.getFrontendUrl();
        try {
            emailVerificationService.verify(token);
            response.sendRedirect(frontendUrl + "/login?verified=true");
        } catch (RuntimeException e) {
            String msg = URLEncoder.encode(e.getMessage(), StandardCharsets.UTF_8);
            response.sendRedirect(frontendUrl + "/verify-error?message=" + msg);
        }
    }

    @PostMapping("/resend-verification")
    public ResponseEntity<Map<String, String>> resendVerification(
            @Valid @RequestBody AuthDTO.ResendVerificationRequest req) {
        emailVerificationService.resend(req.getEmail());
        return ResponseEntity.ok(Map.of("message", "Verification email has been resent"));
    }

    @GetMapping("/me")
    public ResponseEntity<AuthDTO.MeResponse> getMe(@RequestHeader("Authorization") String authHeader) {
        String token = authHeader.replace("Bearer ", "");
        Claims claims = jwtService.parseToken(token);
        return ResponseEntity.ok(userService.getMe(jwtService.getEmail(claims)));
    }

    @PutMapping("/me")
    public ResponseEntity<AuthDTO.UserResponse> updateMe(
            @RequestHeader("Authorization") String authHeader,
            @RequestBody AuthDTO.UpdateUserRequest req) {
        String token = authHeader.replace("Bearer ", "");
        Claims claims = jwtService.parseToken(token);
        return ResponseEntity.ok(userService.updateMe(jwtService.getEmail(claims), req));
    }

    // ── Forgot password — send reset link to email ────────────────
    @PostMapping("/forgot-password")
    public ResponseEntity<Map<String, String>> forgotPassword(
            @Valid @RequestBody AuthDTO.ForgotPasswordRequest req) {
        userService.forgotPassword(req);
        return ResponseEntity.ok(Map.of("message", "Password reset email has been sent"));
    }

    // ── Reset password — user submits token from email link ────────
    @PostMapping("/reset-password")
    public ResponseEntity<Map<String, String>> resetPassword(
            @Valid @RequestBody AuthDTO.ResetPasswordRequest req) {
        passwordResetService.resetPassword(req.getToken(), req.getNewPassword());
        return ResponseEntity.ok(Map.of("message", "Password has been reset successfully"));
    }

    // ── Change password — logged-in user ──────────────────────────
    @PostMapping("/change-password")
    public ResponseEntity<Map<String, String>> changePassword(
            @RequestHeader("Authorization") String authHeader,
            @Valid @RequestBody AuthDTO.ChangePasswordRequest req) {
        String token = authHeader.replace("Bearer ", "");
        Claims claims = jwtService.parseToken(token);
        userService.changePassword(jwtService.getEmail(claims), req);
        return ResponseEntity.ok(Map.of("message", "Password changed successfully"));
    }
}

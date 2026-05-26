package com.example.backend.DTO;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

public class AuthDTO {

    // ── Login ─────────────────────────────────────────────────────
    @Data @NoArgsConstructor @AllArgsConstructor @Builder
    public static class LoginRequest {
        @NotBlank @Email
        private String email;

        @NotBlank @Size(min = 6)
        private String password;
    }

    @Data @NoArgsConstructor @AllArgsConstructor @Builder
    public static class LoginResponse {
        private String token;
        private String refreshToken;
        private UUID id;
        private String email;
        private String fullName;
        private String role;
        private Integer quotaRemaining;
        private String phone;
        private String taxId;
        private String companyName;
        private String companyWebsite;
        private String headquartersAddr;
        private String industry;
        private String annualRevenue;
        private String businessDesc;
        private String targetMarkets;
        private String certifications;
        private String theme;
        private String language;
        private Boolean aiOptimization;
    }

    // ── Register ──────────────────────────────────────────────────
    @Data @NoArgsConstructor @AllArgsConstructor @Builder
    public static class RegisterRequest {
        @NotBlank @Email
        private String email;

        @NotBlank @Size(min = 6)
        private String password;

        @Size(max = 200)
        private String fullName;

        @Size(max = 300)
        private String companyName;

        @Size(max = 30)
        private String phone;

        @Size(max = 50)
        private String taxId;

        @Size(max = 300)
        private String companyWebsite;

        @Size(max = 500)
        private String headquartersAddr;

        @Size(max = 100)
        private String industry;

        @Size(max = 50)
        private String annualRevenue;

        private String businessDesc;
        private String targetMarkets;
        private String certifications;
    }

    // Sau khi đăng ký — không có token, phải verify email trước
    @Data @NoArgsConstructor @AllArgsConstructor @Builder
    public static class RegisterResponse {
        private String message;
        private String email;
    }

    // ── Refresh Token ─────────────────────────────────────────────
    @Data @NoArgsConstructor @AllArgsConstructor @Builder
    public static class RefreshRequest {
        @NotBlank
        private String refreshToken;
    }

    @Data @NoArgsConstructor @AllArgsConstructor @Builder
    public static class RefreshResponse {
        private String token;
        private String refreshToken;
    }

    // ── Logout ────────────────────────────────────────────────────
    @Data @NoArgsConstructor @AllArgsConstructor @Builder
    public static class LogoutRequest {
        private String refreshToken;
    }

    // ── Update profile ────────────────────────────────────────────
    @Data @NoArgsConstructor @AllArgsConstructor @Builder
    public static class UpdateUserRequest {
        private String fullName;
        private String companyName;
        private String phone;
        private String taxId;
        private String companyWebsite;
        private String headquartersAddr;
        private String industry;
        private String annualRevenue;
        private String businessDesc;
        private String targetMarkets;
        private String certifications;
        private String theme;
        private String language;
        private Boolean aiOptimization;
    }

    @Data @NoArgsConstructor @AllArgsConstructor @Builder
    public static class UserResponse {
        private UUID id;
        private String email;
        private String fullName;
        private String companyName;
        private String phone;
        private String taxId;
        private String companyWebsite;
        private String headquartersAddr;
        private String industry;
        private String annualRevenue;
        private String businessDesc;
        private String targetMarkets;
        private String certifications;
        private String theme;
        private String language;
        private Boolean aiOptimization;
    }

    // ── Forgot / Reset password ───────────────────────────────────
    @Data @NoArgsConstructor @AllArgsConstructor @Builder
    public static class ForgotPasswordRequest {
        @NotBlank @Email
        private String email;
    }

    @Data @NoArgsConstructor @AllArgsConstructor @Builder
    public static class ResetPasswordRequest {
        @NotBlank
        private String token;
        @NotBlank @Size(min = 6, message = "Mật khẩu ít nhất 6 ký tự")
        private String newPassword;
    }

    // ── Change password ───────────────────────────────────────────
    @Data @NoArgsConstructor @AllArgsConstructor @Builder
    public static class ChangePasswordRequest {
        @NotBlank
        private String currentPassword;
        @NotBlank @Size(min = 6)
        private String newPassword;
    }

    // ── Email verification ────────────────────────────────────────
    @Data @NoArgsConstructor @AllArgsConstructor @Builder
    public static class ResendVerificationRequest {
        @NotBlank @Email
        private String email;
    }

    // ── Get me ────────────────────────────────────────────────────
    @Data @NoArgsConstructor @AllArgsConstructor @Builder
    public static class MeResponse {
        private UUID id;
        private String email;
        private String fullName;
        private String companyName;
        private String role;
        private Integer quotaRemaining;
        private Boolean emailVerified;
        private String phone;
        private String taxId;
        private String companyWebsite;
        private String headquartersAddr;
        private String industry;
        private String annualRevenue;
        private String businessDesc;
        private String targetMarkets;
        private String certifications;
        private String theme;
        private String language;
        private Boolean aiOptimization;
    }

}
package com.example.backend.auth;

import com.example.backend.auth.AuthDTO;
import com.example.backend.config.JwtService;
import com.example.backend.domain.Subscription;
import com.example.backend.domain.Users;
import com.example.backend.domain.PlanRepository;
import com.example.backend.domain.SubscriptionRepository;
import com.example.backend.domain.UsersRepository;
import com.example.backend.auth.email.EmailVerificationService;
import com.example.backend.auth.email.PasswordResetService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Locale;

@Service
@RequiredArgsConstructor
public class UserService {

    private final UsersRepository usersRepository;
    private final SubscriptionRepository subscriptionRepository;
    private final PlanRepository planRepository;
    private final JwtService jwtService;
    private final PasswordEncoder passwordEncoder;
    private final RefreshTokenService refreshTokenService;
    private final EmailVerificationService emailVerificationService;
    private final PasswordResetService passwordResetService;

    // ── Register ──────────────────────────────────────────────────
    @Transactional
    public AuthDTO.RegisterResponse register(AuthDTO.RegisterRequest request) {
        String email = request.getEmail().trim().toLowerCase();

        if (usersRepository.existsByEmail(email)) {
            throw new RuntimeException("Email is already in use");
        }

        Users user = Users.builder()
                .email(email)
                .passwordHash(passwordEncoder.encode(request.getPassword()))
                .fullName(request.getFullName())
                .companyName(request.getCompanyName())
                .phone(request.getPhone())
                .taxId(request.getTaxId())
                .companyWebsite(request.getCompanyWebsite())
                .headquartersAddr(request.getHeadquartersAddr())
                .industry(request.getIndustry())
                .annualRevenue(request.getAnnualRevenue())
                .businessDesc(request.getBusinessDesc())
                .targetMarkets(request.getTargetMarkets())
                .certifications(request.getCertifications())
                .role("user")
                .quotaRemaining(2)
                .quotaUsedThisCycle(0)
                .cycleResetAt(Instant.now().plus(30, ChronoUnit.DAYS))
                .isActive(true)
                .emailVerified(false)
                .theme("system")
                .language("vi")
                .aiOptimization(true)
                .createdAt(Instant.now())
                .plan(planRepository.findByNameIgnoreCase("free").orElseThrow())
                .build();
        usersRepository.save(user);

        // Tạo subscription free
        Subscription sub = Subscription.builder()
                .user(user)
                .plan(planRepository.findByNameIgnoreCase("free").orElseThrow())
                .status("active")
                .billingCycle("monthly")
                .currentPeriodStart(Instant.now())
                .currentPeriodEnd(Instant.now().plus(30, ChronoUnit.DAYS))
                .createdAt(Instant.now())
                .build();
        subscriptionRepository.save(sub);

        // Gửi email verify — không trả JWT
        emailVerificationService.sendVerification(user.getId(), user.getEmail(), user.getLanguage());

        return AuthDTO.RegisterResponse.builder()
                .message("Registration successful! Please check your email to verify your account.")
                .email(user.getEmail())
                .build();
    }

    // ── Login ─────────────────────────────────────────────────────
    @Transactional
    public AuthDTO.LoginResponse login(AuthDTO.LoginRequest request) {
        String email = request.getEmail().trim().toLowerCase();

        Users user = usersRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Invalid email or password"));

        if (!user.getIsActive()) {
            throw new RuntimeException("Account has been deactivated");
        }

        if (!user.getEmailVerified()) {
            throw new RuntimeException("EMAIL_NOT_VERIFIED");
        }

        if (!passwordEncoder.matches(request.getPassword(), user.getPasswordHash())) {
            throw new RuntimeException("Invalid email or password");
        }

        user.setLastLoginAt(Instant.now());
        usersRepository.save(user);

        String token = jwtService.generateToken(
                user.getId(), user.getEmail(), user.getRole().toUpperCase(Locale.ROOT), user.getFullName());
        String refreshToken = refreshTokenService.create(user.getId());

        return AuthDTO.LoginResponse.builder()
                .token(token)
                .refreshToken(refreshToken)
                .id(user.getId())
                .email(user.getEmail())
                .fullName(user.getFullName())
                .companyName(user.getCompanyName())
                .role(user.getRole().toUpperCase(Locale.ROOT))
                .planName(user.getPlan() != null ? user.getPlan().getName() : null)
                .quotaRemaining(user.getQuotaRemaining())
                .phone(user.getPhone())
                .taxId(user.getTaxId())
                .companyWebsite(user.getCompanyWebsite())
                .headquartersAddr(user.getHeadquartersAddr())
                .industry(user.getIndustry())
                .annualRevenue(user.getAnnualRevenue())
                .businessDesc(user.getBusinessDesc())
                .targetMarkets(user.getTargetMarkets())
                .certifications(user.getCertifications())
                .theme(user.getTheme())
                .language(user.getLanguage())
                .aiOptimization(user.getAiOptimization())
                .build();
    }

    // ── Refresh Token ─────────────────────────────────────────────
    @Transactional
    public AuthDTO.RefreshResponse refresh(String refreshToken) {
        RefreshTokenService.RotateResult result = refreshTokenService.validateAndRotate(refreshToken);
        Users user = usersRepository.findById(result.userId())
                .orElseThrow(() -> new RuntimeException("User not found"));
        String newAccessToken = jwtService.generateToken(
                user.getId(), user.getEmail(), user.getRole().toUpperCase(Locale.ROOT), user.getFullName());
        return AuthDTO.RefreshResponse.builder()
                .token(newAccessToken)
                .refreshToken(result.newToken())
                .build();
    }

    // ── Get me ────────────────────────────────────────────────────
    @Transactional(readOnly = true)
    public AuthDTO.MeResponse getMe(String email) {
        Users user = usersRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));

        return AuthDTO.MeResponse.builder()
                .id(user.getId())
                .email(user.getEmail())
                .fullName(user.getFullName())
                .companyName(user.getCompanyName())
                .role(user.getRole().toUpperCase(Locale.ROOT))
                .planName(user.getPlan() != null ? user.getPlan().getName() : null)
                .quotaRemaining(user.getQuotaRemaining())
                .emailVerified(user.getEmailVerified())
                .phone(user.getPhone())
                .taxId(user.getTaxId())
                .companyWebsite(user.getCompanyWebsite())
                .headquartersAddr(user.getHeadquartersAddr())
                .industry(user.getIndustry())
                .annualRevenue(user.getAnnualRevenue())
                .businessDesc(user.getBusinessDesc())
                .targetMarkets(user.getTargetMarkets())
                .certifications(user.getCertifications())
                .theme(user.getTheme())
                .language(user.getLanguage())
                .aiOptimization(user.getAiOptimization())
                .build();
    }

    // ── Update me ─────────────────────────────────────────────────
    @Transactional
    public AuthDTO.UserResponse updateMe(String email, AuthDTO.UpdateUserRequest request) {
        Users user = usersRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));

        if (request.getFullName() != null)        user.setFullName(request.getFullName());
        if (request.getCompanyName() != null)     user.setCompanyName(request.getCompanyName());
        if (request.getPhone() != null)           user.setPhone(request.getPhone());
        if (request.getTaxId() != null)           user.setTaxId(request.getTaxId());
        if (request.getCompanyWebsite() != null)  user.setCompanyWebsite(request.getCompanyWebsite());
        if (request.getHeadquartersAddr() != null) user.setHeadquartersAddr(request.getHeadquartersAddr());
        if (request.getIndustry() != null)        user.setIndustry(request.getIndustry());
        if (request.getAnnualRevenue() != null)   user.setAnnualRevenue(request.getAnnualRevenue());
        if (request.getBusinessDesc() != null)    user.setBusinessDesc(request.getBusinessDesc());
        if (request.getTargetMarkets() != null)   user.setTargetMarkets(request.getTargetMarkets());
        if (request.getCertifications() != null)  user.setCertifications(request.getCertifications());
        if (request.getTheme() != null)           user.setTheme(request.getTheme());
        if (request.getLanguage() != null)        user.setLanguage(request.getLanguage());
        if (request.getAiOptimization() != null)  user.setAiOptimization(request.getAiOptimization());

        user.setUpdatedAt(Instant.now());
        usersRepository.save(user);

        return AuthDTO.UserResponse.builder()
                .id(user.getId())
                .email(user.getEmail())
                .fullName(user.getFullName())
                .companyName(user.getCompanyName())
                .phone(user.getPhone())
                .taxId(user.getTaxId())
                .companyWebsite(user.getCompanyWebsite())
                .headquartersAddr(user.getHeadquartersAddr())
                .industry(user.getIndustry())
                .annualRevenue(user.getAnnualRevenue())
                .businessDesc(user.getBusinessDesc())
                .targetMarkets(user.getTargetMarkets())
                .certifications(user.getCertifications())
                .theme(user.getTheme())
                .language(user.getLanguage())
                .aiOptimization(user.getAiOptimization())
                .build();
    }

    // ── Forgot password — send reset email ───────────────────────
    public void forgotPassword(AuthDTO.ForgotPasswordRequest request) {
        String email = request.getEmail().trim().toLowerCase();

        Users user = usersRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Email not found"));

        if (!user.getIsActive()) {
            throw new RuntimeException("Account has been deactivated");
        }

        if (!user.getEmailVerified()) {
            throw new RuntimeException("Email has not been verified");
        }

        passwordResetService.sendResetToken(user.getId(), user.getEmail(), user.getLanguage());
    }

    // ── Change password — logged-in user ──────────────────────────
    @Transactional
    public void changePassword(String email, AuthDTO.ChangePasswordRequest request) {
        Users user = usersRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));

        if (!passwordEncoder.matches(request.getCurrentPassword(), user.getPasswordHash())) {
            throw new RuntimeException("Current password is incorrect");
        }

        user.setPasswordHash(passwordEncoder.encode(request.getNewPassword()));
        user.setUpdatedAt(Instant.now());
        usersRepository.save(user);
    }
}
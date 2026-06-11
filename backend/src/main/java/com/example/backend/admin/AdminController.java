package com.example.backend.admin;

import com.example.backend.quota.QuotaDTO;
import com.example.backend.exception.AppException;
import com.example.backend.domain.Users;
import com.example.backend.domain.UsersRepository;
import com.example.backend.quota.QuotaService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Slf4j
@RestController
@RequestMapping("/api/v1/admin")
@RequiredArgsConstructor
public class AdminController {

    private final QuotaService quotaService;
    private final UsersRepository usersRepository;

    // ── GET /api/v1/admin/users — list all users (paginated) ──────────
    @GetMapping("/users")
    public ResponseEntity<Map<String, Object>> listUsers(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(defaultValue = "") String search) {

        List<Users> allUsers = usersRepository.findAll();

        // Filter by search query (email or name)
        List<Users> filtered = allUsers.stream()
            .filter(u -> search.isEmpty()
                || u.getEmail().toLowerCase().contains(search.toLowerCase())
                || (u.getFullName() != null && u.getFullName().toLowerCase().contains(search.toLowerCase())))
            .toList();

        // Manual pagination
        int start = Math.min(page * size, filtered.size());
        int end   = Math.min(start + size, filtered.size());
        List<AdminUserDTO> items = filtered.subList(start, end).stream()
            .map(this::toAdminUserDTO).toList();

        return ResponseEntity.ok(Map.of(
            "users", items,
            "total", filtered.size(),
            "page", page,
            "size", size
        ));
    }

    // ── PATCH /api/v1/admin/users/{id}/quota ──────────────────────────
    // Set quota to an exact value (admin override)
    @PatchMapping("/users/{id}/quota")
    public ResponseEntity<QuotaDTO.QuotaResponse> setQuota(
            @PathVariable UUID id,
            @Valid @RequestBody QuotaDTO.AdminSetRequest req) {

        quotaService.adminSetQuota(id, req.getQuota());

        Users user = usersRepository.findById(id)
                .orElseThrow(() -> new AppException(AppException.ErrorCode.USER_NOT_FOUND));

        log.info("Admin set quota — userId={} newQuota={}", id, req.getQuota());

        return ResponseEntity.ok(new QuotaDTO.QuotaResponse(
                id,
                user.getQuotaRemaining(),
                "Quota updated successfully"
        ));
    }

    // ── POST /api/v1/admin/users/{id}/quota/refund ────────────────────
    // Refund 1 quota (after a failed report)
    @PostMapping("/users/{id}/quota/refund")
    public ResponseEntity<QuotaDTO.QuotaResponse> refundQuota(@PathVariable UUID id) {
        quotaService.refundOne(id);

        Users user = usersRepository.findById(id)
                .orElseThrow(() -> new AppException(AppException.ErrorCode.USER_NOT_FOUND));

        log.info("Admin refunded 1 quota — userId={}", id);

        return ResponseEntity.ok(new QuotaDTO.QuotaResponse(
                id,
                user.getQuotaRemaining(),
                "Quota refunded successfully"
        ));
    }

    // ── Helper ────────────────────────────────────────────────────────
    private AdminUserDTO toAdminUserDTO(Users u) {
        String planName = u.getPlan() != null ? u.getPlan().getName() : "Free";
        Integer monthlyQuota = u.getPlan() != null ? u.getPlan().getMonthlyQuota() : 3;
        return new AdminUserDTO(
            u.getId().toString(),
            u.getEmail(),
            u.getFullName() != null ? u.getFullName() : u.getEmail().split("@")[0],
            u.getRole(),
            planName,
            u.getQuotaRemaining(),
            u.getQuotaUsedThisCycle(),
            monthlyQuota != null ? monthlyQuota : 3,
            u.getIsActive() != null ? u.getIsActive() : true,
            u.getEmailVerified() != null ? u.getEmailVerified() : false,
            u.getCreatedAt()
        );
    }

    // ── Inner DTO ─────────────────────────────────────────────────────
    public record AdminUserDTO(
        String id, String email, String fullName, String role,
        String planName, int quotaRemaining, int quotaUsed, int monthlyQuota,
        boolean isActive, boolean emailVerified, Instant createdAt
    ) {}
}


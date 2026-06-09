package com.example.backend.admin;

import com.example.backend.quota.QuotaDTO;
import com.example.backend.exception.AppException;
import com.example.backend.domain.Users;
import com.example.backend.domain.UsersRepository;
import com.example.backend.quota.QuotaService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.UUID;

@Slf4j
@RestController
@RequestMapping("/api/v1/admin")
@RequiredArgsConstructor
public class AdminController {

    private final QuotaService quotaService;
    private final UsersRepository usersRepository;

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
}

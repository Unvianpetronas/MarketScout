package com.example.backend.contract;

import com.example.backend.config.JwtService;
import io.jsonwebtoken.Claims;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

/** Report-scoped contract linking — cross-check, field overrides, unlink. */
@RestController
@RequestMapping("/api/v1/assessments/{reportId}/contracts")
@RequiredArgsConstructor
public class ReportContractController {

    private final ContractLinkService contractLinkService;
    private final JwtService jwtService;

    @GetMapping
    public ResponseEntity<java.util.List<ContractDTO.LinkSummary>> listLinks(
            @RequestHeader("Authorization") String authHeader,
            @PathVariable UUID reportId) {
        UUID userId = extractUserId(authHeader);
        return ResponseEntity.ok(contractLinkService.listLinks(reportId, userId));
    }

    @PostMapping("/{contractId}/link")
    public ResponseEntity<ContractDTO.LinkResponse> link(
            @RequestHeader("Authorization") String authHeader,
            @PathVariable UUID reportId, @PathVariable UUID contractId) {
        UUID userId = extractUserId(authHeader);
        return ResponseEntity.ok(contractLinkService.link(reportId, contractId, userId));
    }

    @PatchMapping("/{contractId}/fields")
    public ResponseEntity<ContractDTO.LinkResponse> updateField(
            @RequestHeader("Authorization") String authHeader,
            @PathVariable UUID reportId, @PathVariable UUID contractId,
            @RequestBody ContractDTO.FieldOverrideRequest request) {
        UUID userId = extractUserId(authHeader);
        return ResponseEntity.ok(contractLinkService.updateFieldOverride(
                reportId, contractId, request.getField(), request.getValue(), userId));
    }

    @DeleteMapping("/{contractId}/link")
    public ResponseEntity<Void> unlink(
            @RequestHeader("Authorization") String authHeader,
            @PathVariable UUID reportId, @PathVariable UUID contractId) {
        UUID userId = extractUserId(authHeader);
        contractLinkService.unlink(reportId, contractId, userId);
        return ResponseEntity.noContent().build();
    }

    private UUID extractUserId(String authHeader) {
        Claims claims = jwtService.parseToken(authHeader.replace("Bearer ", ""));
        return jwtService.getId(claims);
    }
}

package com.example.backend.contract;

import com.example.backend.config.JwtService;
import com.example.backend.domain.Contract;
import io.jsonwebtoken.Claims;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/contracts")
@RequiredArgsConstructor
public class ContractController {

    private final ContractService contractService;
    private final JwtService jwtService;

    @PostMapping(consumes = "multipart/form-data")
    public ResponseEntity<ContractDTO.ContractSummary> upload(
            @RequestHeader("Authorization") String authHeader,
            @RequestParam("file") MultipartFile file) {
        UUID userId = extractUserId(authHeader);
        return ResponseEntity.ok(contractService.upload(userId, file));
    }

    @GetMapping
    public ResponseEntity<List<ContractDTO.ContractSummary>> list(
            @RequestHeader("Authorization") String authHeader,
            @RequestParam(value = "search", required = false) String search) {
        UUID userId = extractUserId(authHeader);
        return ResponseEntity.ok(contractService.list(userId, search));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ContractDTO.ContractDetail> get(
            @RequestHeader("Authorization") String authHeader,
            @PathVariable UUID id) {
        UUID userId = extractUserId(authHeader);
        return ResponseEntity.ok(contractService.get(id, userId));
    }

    @PatchMapping("/{id}")
    public ResponseEntity<ContractDTO.ContractSummary> rename(
            @RequestHeader("Authorization") String authHeader,
            @PathVariable UUID id,
            @RequestBody ContractDTO.RenameRequest request) {
        UUID userId = extractUserId(authHeader);
        return ResponseEntity.ok(contractService.rename(id, userId, request.getFileName()));
    }

    @GetMapping("/{id}/file")
    public ResponseEntity<byte[]> downloadFile(
            @RequestHeader("Authorization") String authHeader,
            @PathVariable UUID id) {
        UUID userId = extractUserId(authHeader);
        Contract contract = contractService.getFileForDownload(id, userId);
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(contract.getContentType()))
                .header(HttpHeaders.CONTENT_DISPOSITION, ContentDisposition.inline()
                        .filename(contract.getFileName(), StandardCharsets.UTF_8).build().toString())
                .body(contract.getFileData());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(
            @RequestHeader("Authorization") String authHeader,
            @PathVariable UUID id) {
        UUID userId = extractUserId(authHeader);
        contractService.delete(id, userId);
        return ResponseEntity.noContent().build();
    }

    private UUID extractUserId(String authHeader) {
        Claims claims = jwtService.parseToken(authHeader.replace("Bearer ", ""));
        return jwtService.getId(claims);
    }
}

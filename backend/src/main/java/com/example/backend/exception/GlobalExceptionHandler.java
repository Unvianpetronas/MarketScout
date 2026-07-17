package com.example.backend.exception;

import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.util.Map;
import java.util.stream.Collectors;

@Slf4j
@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(AppException.class)
    public ResponseEntity<Map<String, Object>> handleApp(AppException ex) {
        log.warn("AppException [{}]: {}", ex.getErrorCode(), ex.getMessage());
        return ResponseEntity
                .status(ex.getErrorCode().getHttpStatus())
                .body(Map.of(
                        "error", ex.getErrorCode().name(),
                        "message", ex.getMessage()
                ));
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<Map<String, Object>> handleValidation(MethodArgumentNotValidException ex) {
        String details = ex.getBindingResult().getFieldErrors().stream()
                .map(fe -> fe.getField() + ": " + fe.getDefaultMessage())
                .collect(Collectors.joining(", "));
        return ResponseEntity.badRequest().body(Map.of(
                "error", "VALIDATION_FAILED",
                "message", details
        ));
    }

    // Deleting a row still referenced elsewhere (e.g. a Contract linked to a
    // Report, or a Report holding a P7 contract link) — reports.p7_verified_contract_id
    // and assessment_contract_links.contract_id are RESTRICT, not CASCADE, on
    // purpose (deleting a contract must not silently blank out a report's P7
    // evidence). Without this handler the raw FK violation message leaks to the
    // client as an opaque 500.
    @ExceptionHandler(org.springframework.dao.DataIntegrityViolationException.class)
    public ResponseEntity<Map<String, Object>> handleDataIntegrity(org.springframework.dao.DataIntegrityViolationException ex) {
        log.warn("Data integrity violation: {}", ex.getMostSpecificCause() != null
                ? ex.getMostSpecificCause().getMessage() : ex.getMessage());
        return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of(
                "error", "CONFLICT",
                "message", "Không thể xoá vì dữ liệu này đang được tham chiếu bởi dữ liệu khác."
        ));
    }

    // Catches legacy RuntimeException throws in UserService until they are migrated to AppException
    @ExceptionHandler(RuntimeException.class)
    public ResponseEntity<Map<String, Object>> handleRuntime(RuntimeException ex) {
        String msg = ex.getMessage() != null ? ex.getMessage() : "Internal server error";

        HttpStatus status;
        if ("EMAIL_NOT_VERIFIED".equals(msg) || "Account has been deactivated".equals(msg)) {
            status = HttpStatus.FORBIDDEN;
        } else if ("Invalid email or password".equals(msg)) {
            status = HttpStatus.UNAUTHORIZED;
        } else if (msg.startsWith("Email is already")) {
            status = HttpStatus.CONFLICT;
        } else {
            log.error("Unhandled RuntimeException", ex);
            status = HttpStatus.INTERNAL_SERVER_ERROR;
        }

        return ResponseEntity.status(status).body(Map.of(
                "error", "ERROR",
                "message", msg
        ));
    }
}

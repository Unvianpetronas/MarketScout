package com.example.backend.exception;

import lombok.Getter;
import org.springframework.http.HttpStatus;

@Getter
public class AppException extends RuntimeException {

    @Getter
    public enum ErrorCode {
        // ── Quota ──────────────────────────────────────────────────────
        QUOTA_EXHAUSTED("Quota exhausted. Please upgrade your plan or wait for the next billing cycle.", HttpStatus.FORBIDDEN),

        // ── Common ─────────────────────────────────────────────────────
        USER_NOT_FOUND("User not found.", HttpStatus.NOT_FOUND),
        PLAN_NOT_FOUND("Plan not found.", HttpStatus.NOT_FOUND),
        SESSION_NOT_FOUND("Chat session not found or you do not have access.", HttpStatus.NOT_FOUND),
        UNAUTHORIZED("You do not have permission to perform this action.", HttpStatus.FORBIDDEN),
        BAD_REQUEST("Invalid request.", HttpStatus.BAD_REQUEST);

        private final String defaultMessage;
        private final HttpStatus httpStatus;

        ErrorCode(String defaultMessage, HttpStatus httpStatus) {
            this.defaultMessage = defaultMessage;
            this.httpStatus = httpStatus;
        }
    }

    private final ErrorCode errorCode;

    public AppException(ErrorCode errorCode) {
        super(errorCode.getDefaultMessage());
        this.errorCode = errorCode;
    }

    public AppException(ErrorCode errorCode, String customMessage) {
        super(customMessage);
        this.errorCode = errorCode;
    }
}

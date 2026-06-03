package com.example.backend.exception;

import lombok.Getter;
import org.springframework.http.HttpStatus;

@Getter
public class AppException extends RuntimeException {

    @Getter
    public enum ErrorCode {
        // ── Quota ──────────────────────────────────────────────────────
        QUOTA_EXHAUSTED("Bạn đã dùng hết quota. Vui lòng nâng cấp gói hoặc chờ reset chu kỳ.", HttpStatus.FORBIDDEN),

        // ── Common ─────────────────────────────────────────────────────
        USER_NOT_FOUND("Người dùng không tồn tại.", HttpStatus.NOT_FOUND),
        PLAN_NOT_FOUND("Gói dịch vụ không tồn tại.", HttpStatus.NOT_FOUND),
        UNAUTHORIZED("Không có quyền thực hiện thao tác này.", HttpStatus.FORBIDDEN),
        BAD_REQUEST("Yêu cầu không hợp lệ.", HttpStatus.BAD_REQUEST);

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

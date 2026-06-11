package com.example.backend.chat;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.*;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public class ChatDTO {

    @Data @NoArgsConstructor @AllArgsConstructor @Builder
    public static class CreateSessionRequest {
        @Size(max = 300)
        private String title;
    }

    @Data @NoArgsConstructor @AllArgsConstructor @Builder
    public static class SessionResponse {
        private UUID    id;
        private String  title;
        private Instant createdAt;
        private Instant updatedAt;
    }

    @Data @NoArgsConstructor @AllArgsConstructor @Builder
    public static class UpdateSessionRequest {
        @NotBlank(message = "Title cannot be blank")
        @Size(max = 300)
        private String title;
    }

    @Data @NoArgsConstructor @AllArgsConstructor @Builder
    public static class SendMessageRequest {
        @NotBlank(message = "Message content cannot be blank")
        private String content;
    }

    @Data @NoArgsConstructor @AllArgsConstructor @Builder
    public static class MessageResponse {
        private UUID    id;
        private UUID    sessionId;
        private String  role;
        private String  content;
        private String  modelUsed;
        private Instant createdAt;
    }

    @Data @NoArgsConstructor @AllArgsConstructor @Builder
    public static class ConversationResponse {
        private UUID                  sessionId;
        private String                title;
        private List<MessageResponse> messages;
    }

    @Data @NoArgsConstructor @AllArgsConstructor @Builder
    public static class ChatResponse {
        private MessageResponse userMessage;
        private MessageResponse assistantMessage;
    }
}

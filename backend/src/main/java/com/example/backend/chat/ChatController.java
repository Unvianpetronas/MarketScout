package com.example.backend.chat;

import com.example.backend.chat.ChatDTO;
import com.example.backend.report.ReportDTO;
import com.example.backend.config.JwtService;
import com.example.backend.chat.ChatService;
import io.jsonwebtoken.Claims;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/chat")
@RequiredArgsConstructor
public class ChatController {

    private final ChatService chatService;
    private final JwtService  jwtService;

    // ── MarketScout Pipeline (SSE) ────────────────────────────────────────────

    /**
     * POST /api/v1/chat/message
     * Main pipeline endpoint — detects intent and streams agent events via SSE.
     * Quota deducted only for VERIFY_PARTNER (1) and COMPARE_PARTNERS (2).
     */
    @PostMapping(value = "/message", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter handleMessage(
            @RequestHeader("Authorization") String authHeader,
            @Valid @RequestBody ReportDTO.ChatMessageRequest req) {
        UUID userId = extractUserId(authHeader);
        return chatService.processMessage(userId, req);
    }

    // ── Sessions ──────────────────────────────────────────────────────────────

    /** Create a new chat session (optionally with a title). */
    @PostMapping("/sessions")
    public ResponseEntity<ChatDTO.SessionResponse> createSession(
            @RequestHeader("Authorization") String authHeader,
            @RequestBody(required = false) ChatDTO.CreateSessionRequest req) {
        UUID userId = extractUserId(authHeader);
        ChatDTO.CreateSessionRequest body = req != null ? req : new ChatDTO.CreateSessionRequest();
        return ResponseEntity.status(HttpStatus.CREATED)
            .body(chatService.createSession(userId, body));
    }

    /** List all sessions for the authenticated user, newest first. */
    @GetMapping("/sessions")
    public ResponseEntity<List<ChatDTO.SessionResponse>> listSessions(
            @RequestHeader("Authorization") String authHeader) {
        UUID userId = extractUserId(authHeader);
        return ResponseEntity.ok(chatService.listSessions(userId));
    }

    /** Delete a session and all its messages (CASCADE). */
    @DeleteMapping("/sessions/{sessionId}")
    public ResponseEntity<Void> deleteSession(
            @RequestHeader("Authorization") String authHeader,
            @PathVariable UUID sessionId) {
        UUID userId = extractUserId(authHeader);
        chatService.deleteSession(userId, sessionId);
        return ResponseEntity.noContent().build();
    }

    // ── Messages ──────────────────────────────────────────────────────────────

    /** Get full conversation history for a session. */
    @GetMapping("/sessions/{sessionId}/messages")
    public ResponseEntity<ChatDTO.ConversationResponse> getHistory(
            @RequestHeader("Authorization") String authHeader,
            @PathVariable UUID sessionId) {
        UUID userId = extractUserId(authHeader);
        return ResponseEntity.ok(chatService.getHistory(userId, sessionId));
    }

    // ── Util ──────────────────────────────────────────────────────────────────

    private UUID extractUserId(String authHeader) {
        String token = authHeader.replace("Bearer ", "");
        Claims claims = jwtService.parseToken(token);
        return jwtService.getId(claims);
    }
}

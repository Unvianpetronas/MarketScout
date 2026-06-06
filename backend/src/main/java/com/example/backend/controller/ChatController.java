package com.example.backend.controller;

import com.example.backend.DTO.ChatDTO;
import com.example.backend.config.JwtService;
import com.example.backend.service.ChatService;
import io.jsonwebtoken.Claims;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/chat")
@RequiredArgsConstructor
public class ChatController {

    private final ChatService chatService;
    private final JwtService  jwtService;

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

    /**
     * Send a user message; Gemini replies.
     * Returns both the user message and the assistant reply.
     */
    @PostMapping("/sessions/{sessionId}/messages")
    public ResponseEntity<ChatDTO.ChatResponse> sendMessage(
            @RequestHeader("Authorization") String authHeader,
            @PathVariable UUID sessionId,
            @Valid @RequestBody ChatDTO.SendMessageRequest req) {
        UUID userId = extractUserId(authHeader);
        return ResponseEntity.ok(chatService.sendMessage(userId, sessionId, req));
    }

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

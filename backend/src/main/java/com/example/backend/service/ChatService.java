package com.example.backend.service;

import com.example.backend.DTO.ChatDTO;
import com.example.backend.exception.AppException;
import com.example.backend.model.ChatMessage;
import com.example.backend.model.ChatSession;
import com.example.backend.model.Users;
import com.example.backend.repository.ChatMessageRepository;
import com.example.backend.repository.ChatSessionRepository;
import com.example.backend.repository.UsersRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class ChatService {

    private final ChatSessionRepository sessionRepo;
    private final ChatMessageRepository messageRepo;
    private final UsersRepository       usersRepo;
    private final GeminiService         geminiService;
    private final QuotaService          quotaService;

    // ── Sessions ──────────────────────────────────────────────────────────────

    @Transactional
    public ChatDTO.SessionResponse createSession(UUID userId, ChatDTO.CreateSessionRequest req) {
        Users user = requireUser(userId);

        String title = (req.getTitle() != null && !req.getTitle().isBlank())
            ? req.getTitle() : "New conversation";

        ChatSession session = sessionRepo.save(
            ChatSession.builder().user(user).title(title).build()
        );

        log.info("Created chat session {} for user {}", session.getId(), userId);
        return toSessionResponse(session);
    }

    @Transactional(readOnly = true)
    public List<ChatDTO.SessionResponse> listSessions(UUID userId) {
        return sessionRepo.findByUser_IdOrderByUpdatedAtDesc(userId)
            .stream().map(this::toSessionResponse).toList();
    }

    @Transactional
    public void deleteSession(UUID userId, UUID sessionId) {
        ChatSession session = requireSession(userId, sessionId);
        sessionRepo.delete(session);
        log.info("Deleted session {} for user {}", sessionId, userId);
    }

    // ── Messages ──────────────────────────────────────────────────────────────

    @Transactional
    public ChatDTO.ChatResponse sendMessage(UUID userId, UUID sessionId, ChatDTO.SendMessageRequest req) {
        Users user       = requireUser(userId);
        ChatSession session = requireSession(userId, sessionId);

        // Deduct quota before doing any work — throws QUOTA_EXHAUSTED (403) if empty
        quotaService.checkAndDeduct(userId);

        // Load full history for multi-turn context
        List<ChatMessage> history = messageRepo.findBySession_IdOrderByCreatedAtAsc(sessionId);

        // Persist user message first
        ChatMessage userMsg = messageRepo.save(ChatMessage.builder()
            .session(session)
            .user(user)
            .role("user")
            .content(req.getContent())
            .build());

        // Build Gemini conversation history (history + new user message)
        List<GeminiService.GeminiMessage> geminiHistory = new ArrayList<>(history.size() + 1);
        for (ChatMessage msg : history) {
            geminiHistory.add(new GeminiService.GeminiMessage(msg.getRole(), msg.getContent()));
        }
        geminiHistory.add(new GeminiService.GeminiMessage("user", req.getContent()));

        // Call Gemini — refund quota if the API call itself fails so the user isn't penalized
        String aiText;
        try {
            aiText = geminiService.chat(geminiHistory);
        } catch (Exception e) {
            quotaService.refundOne(userId);
            throw e;
        }

        // Persist assistant response
        ChatMessage assistantMsg = messageRepo.save(ChatMessage.builder()
            .session(session)
            .user(user)
            .role("assistant")
            .content(aiText)
            .modelUsed(GeminiService.MODEL_NAME)
            .build());

        // Touch session's updatedAt so it bubbles up in the session list
        sessionRepo.touchUpdatedAt(sessionId, Instant.now());

        log.info("Sent message in session {} — {} history msgs, AI replied {} chars",
            sessionId, history.size(), aiText.length());

        return ChatDTO.ChatResponse.builder()
            .userMessage(toMessageResponse(userMsg))
            .assistantMessage(toMessageResponse(assistantMsg))
            .build();
    }

    @Transactional(readOnly = true)
    public ChatDTO.ConversationResponse getHistory(UUID userId, UUID sessionId) {
        ChatSession session = requireSession(userId, sessionId);
        List<ChatMessage> messages = messageRepo.findBySession_IdOrderByCreatedAtAsc(sessionId);

        return ChatDTO.ConversationResponse.builder()
            .sessionId(session.getId())
            .title(session.getTitle())
            .messages(messages.stream().map(this::toMessageResponse).toList())
            .build();
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private Users requireUser(UUID userId) {
        return usersRepo.findById(userId)
            .orElseThrow(() -> new AppException(AppException.ErrorCode.USER_NOT_FOUND));
    }

    private ChatSession requireSession(UUID userId, UUID sessionId) {
        return sessionRepo.findByIdAndUser_Id(sessionId, userId)
            .orElseThrow(() -> new AppException(AppException.ErrorCode.SESSION_NOT_FOUND));
    }

    private ChatDTO.SessionResponse toSessionResponse(ChatSession s) {
        return ChatDTO.SessionResponse.builder()
            .id(s.getId())
            .title(s.getTitle())
            .createdAt(s.getCreatedAt())
            .updatedAt(s.getUpdatedAt())
            .build();
    }

    private ChatDTO.MessageResponse toMessageResponse(ChatMessage m) {
        return ChatDTO.MessageResponse.builder()
            .id(m.getId())
            .sessionId(m.getSession().getId())
            .role(m.getRole())
            .content(m.getContent())
            .modelUsed(m.getModelUsed())
            .createdAt(m.getCreatedAt())
            .build();
    }
}

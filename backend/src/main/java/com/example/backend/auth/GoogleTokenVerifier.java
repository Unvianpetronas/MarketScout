package com.example.backend.auth;

import com.example.backend.exception.AppException;
import com.google.api.client.googleapis.auth.oauth2.GoogleIdToken;
import com.google.api.client.googleapis.auth.oauth2.GoogleIdTokenVerifier;
import com.google.api.client.http.javanet.NetHttpTransport;
import com.google.api.client.json.gson.GsonFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.util.Collections;

/**
 * Verifies a Google Sign-In ID token (a JWT signed by Google) offline: checks
 * the signature against Google's public keys, the expiry, the issuer, and that
 * the audience equals our own OAuth client ID. Returns the trusted profile
 * fields so {@link UserService} can log the user in or provision an account.
 */
@Component
public class GoogleTokenVerifier {

    private final GoogleIdTokenVerifier verifier;
    private final boolean configured;

    public GoogleTokenVerifier(@Value("${google.client-id:}") String clientId) {
        this.configured = clientId != null && !clientId.isBlank();
        this.verifier = new GoogleIdTokenVerifier.Builder(new NetHttpTransport(), new GsonFactory())
                .setAudience(configured
                        ? Collections.singletonList(clientId)
                        : Collections.emptyList())
                .build();
    }

    public GoogleProfile verify(String idTokenString) {
        if (!configured) {
            throw new AppException(AppException.ErrorCode.BAD_REQUEST,
                    "Google Sign-In is not configured on the server.");
        }
        GoogleIdToken idToken;
        try {
            idToken = verifier.verify(idTokenString);
        } catch (Exception e) {
            throw new AppException(AppException.ErrorCode.BAD_REQUEST, "Invalid Google token.");
        }
        if (idToken == null) {
            throw new AppException(AppException.ErrorCode.BAD_REQUEST, "Invalid Google token.");
        }
        GoogleIdToken.Payload payload = idToken.getPayload();
        if (!Boolean.TRUE.equals(payload.getEmailVerified())) {
            throw new AppException(AppException.ErrorCode.BAD_REQUEST, "Google email is not verified.");
        }
        return new GoogleProfile(payload.getEmail(), (String) payload.get("name"));
    }

    public record GoogleProfile(String email, String name) {}
}

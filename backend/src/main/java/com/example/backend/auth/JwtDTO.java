package com.example.backend.auth;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class JwtDTO {
    private UUID Id;
    private String email;
    private String fullName;
    private String role;       // "ADMIN", "MANAGER", "USER"

    public boolean canManageItems() {
        return "ADMIN".equals(role) || "MANAGER".equals(role);
    }

    public boolean canManageUsers() {
        return "ADMIN".equals(role);
    }
}

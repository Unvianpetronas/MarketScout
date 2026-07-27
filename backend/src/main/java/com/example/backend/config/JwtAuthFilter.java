package com.example.backend.config;

import com.example.backend.auth.TokenBlacklistService;
import com.example.backend.domain.Users;
import com.example.backend.domain.UsersRepository;
import io.jsonwebtoken.Claims;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.List;
import java.util.UUID;

@Component
@RequiredArgsConstructor
public class JwtAuthFilter extends OncePerRequestFilter {

    private final JwtService jwtService;
    private final TokenBlacklistService blacklistService;
    private final UsersRepository usersRepository;

    // SSE endpoints (e.g. /api/v1/chat/message) complete via an ASYNC dispatch.
    // OncePerRequestFilter skips ASYNC dispatches by default, which would leave
    // SecurityContextHolder empty when that dispatch is authorized, causing
    // AuthorizationDeniedException after the response is already committed.
    @Override
    protected boolean shouldNotFilterAsyncDispatch() {
        return false;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain chain) throws ServletException, IOException {
        String authHeader = request.getHeader("Authorization");

        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            chain.doFilter(request, response);
            return;
        }

        String token = authHeader.substring(7);
        try {
            Claims claims = jwtService.parseToken(token);
            String jti = jwtService.getJti(claims);

            if (jti != null && blacklistService.isBlacklisted(jti)) {
                response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
                response.setContentType("application/json;charset=UTF-8");
                response.getWriter().write("{\"error\":\"Token has been revoked, please log in again\"}");
                return;
            }

            // Role and active-status come from the DB, not the token's baked-in "role"
            // claim — a JWT is valid for up to jwt.expiration-ms (24h default), so an
            // admin demoting/banning a user must take effect immediately, not only once
            // that token happens to expire.
            UUID userId = jwtService.getId(claims);
            Users user = usersRepository.findById(userId).orElse(null);
            if (user == null || !Boolean.TRUE.equals(user.getIsActive())) {
                response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
                response.setContentType("application/json;charset=UTF-8");
                response.getWriter().write("{\"error\":\"Account is no longer active, please log in again\"}");
                return;
            }

            // Principal is a UserDetails (not the bare subject String) so controllers
            // reading @AuthenticationPrincipal UserDetails — e.g. AdminController's
            // audit "actor" on every write endpoint — resolve a non-null value;
            // getUsername() returns the email subject the controllers look up by.
            List<SimpleGrantedAuthority> authorities =
                    List.of(new SimpleGrantedAuthority("ROLE_" + user.getRole().toUpperCase(java.util.Locale.ROOT)));
            UserDetails principal = new User(claims.getSubject(), "", authorities);
            UsernamePasswordAuthenticationToken auth = new UsernamePasswordAuthenticationToken(
                    principal, null, authorities
            );
            SecurityContextHolder.getContext().setAuthentication(auth);

        } catch (RuntimeException e) {
            // Invalid or expired token — no auth set, let security config decide
        }

        chain.doFilter(request, response);
    }
}

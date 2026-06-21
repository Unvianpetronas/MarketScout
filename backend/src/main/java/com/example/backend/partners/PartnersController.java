package com.example.backend.partners;

import com.example.backend.config.JwtService;
import com.example.backend.shared.model.agent.IntentResult;
import com.example.backend.shared.model.crawler.LeadResult;
import io.jsonwebtoken.Claims;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/partners")
@RequiredArgsConstructor
public class PartnersController {

    private final FindPartnersService findPartnersService;
    private final JwtService jwtService;

    /**
     * GET /api/v1/partners/search
     * Searches for trade partner leads via Tavily, filtered against sanctions lists (P6).
     * No quota cost — same as FIND_BUYER/FIND_SELLER chat intents.
     */
    @GetMapping("/search")
    public ResponseEntity<List<LeadResult>> search(
            @RequestHeader("Authorization") String authHeader,
            @RequestParam(required = false) String q,
            @RequestParam(required = false) String country,
            @RequestParam(defaultValue = "FIND_BUYER") String role) {
        UUID userId = extractUserId(authHeader);

        String intent = "FIND_SELLER".equalsIgnoreCase(role) ? "FIND_SELLER" : "FIND_BUYER";
        IntentResult intentResult = IntentResult.builder()
            .intent(intent)
            .product(q)
            .market(country)
            .build();

        List<LeadResult> leads = findPartnersService.findAndFilter(intentResult, userId.toString(), null);
        return ResponseEntity.ok(leads);
    }

    private UUID extractUserId(String authHeader) {
        String token = authHeader.replace("Bearer ", "");
        Claims claims = jwtService.parseToken(token);
        return jwtService.getId(claims);
    }
}

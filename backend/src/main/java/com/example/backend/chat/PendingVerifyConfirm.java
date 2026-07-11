package com.example.backend.chat;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.UUID;

/**
 * A VERIFY_PARTNER / COMPARE_PARTNERS request that has been resolved (company
 * name unambiguous) but not yet confirmed by the user — SePay has no
 * auto-charge, and a Deep Verify run costs a paid quota credit + 5-8 minutes,
 * so we ask before spending either. Stored in Redis (short TTL) keyed by
 * chat session, same pattern as {@link CompanyResolverService}'s pending
 * clarification.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PendingVerifyConfirm {
    private List<String> companyNames; // size 1 = VERIFY_PARTNER, size 2 = COMPARE_PARTNERS
    private List<String> countries;    // parallel to companyNames; blank string = unknown
    private String taxId;              // only meaningful for a single-company verify
    private UUID contractId;           // only meaningful for a single-company verify
    private String website;            // only meaningful for a single-company verify
    private int quotaCost;
}

package com.example.backend.shared.model.crawler;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.NoArgsConstructor;
import lombok.experimental.SuperBuilder;

@Data
@EqualsAndHashCode(callSuper = true)
@SuperBuilder
@NoArgsConstructor
@AllArgsConstructor
public class P4Data extends PillarData {
    private String identityMatchLevel; // COMPLETELY_MATCHED | MINOR_MISMATCH | MAJOR_MISMATCH
    private Boolean addressVerified;
    private Boolean ceoVerified;
    private String googlePlaceId;
    private String verifiedAddress;
}

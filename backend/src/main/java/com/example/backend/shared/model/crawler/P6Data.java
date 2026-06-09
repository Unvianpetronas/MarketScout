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
public class P6Data extends PillarData {
    private boolean sanctioned;                  // HARD STOP trigger
    private Boolean isPersonalAccountRequested;
    private Boolean bicVerified;
    private String accountType;                  // CORPORATE | PERSONAL | UNKNOWN
    private String sanctionSource;               // e.g. OFAC, UN, EU

    public boolean isSanctioned() {
        return sanctioned;
    }
}

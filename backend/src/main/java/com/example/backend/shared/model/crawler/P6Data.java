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
    private String sanctionSource;               // e.g. OFAC, UN, EU, ae_local_terrorists

    // Audit fields — lưu chi tiết entity match để review false positive
    private String matchedEntityName;            // tên entity trong danh sách trừng phạt đã match
    private String matchedEntityId;              // ID entity trong OpenSanctions
    private Double matchScore;                   // confidence score (0.0 - 1.0)

    public boolean isSanctioned() {
        return sanctioned;
    }
}

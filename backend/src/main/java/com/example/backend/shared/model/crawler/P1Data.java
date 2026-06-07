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
public class P1Data extends PillarData {
    private String registrationId;    // MST or LEI
    private String registrationType; // MST_VN | LEI_INTL
    private String status;           // ACTIVE | INACTIVE | UNKNOWN
    private String address;
    private String nganhNghe;        // VN only
    private String legalForm;        // International only
    private Double ageYears;
    private Boolean hasLegalRepresentative;
}

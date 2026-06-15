package com.example.backend.domain;

import jakarta.persistence.*;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

import java.util.UUID;

@Getter
@Setter
@Entity
@Table(name = "deal_analyses")
public class DealAnalysis {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", nullable = false)
    private UUID id;

    @Size(max = 10)
    @Column(name = "recommended_incoterm", length = 10)
    private String recommendedIncoterm;

    @Size(max = 10)
    @Column(name = "payment_method", length = 10)
    private String paymentMethod;

    @Column(name = "risk_factors", columnDefinition = "text")
    private String riskFactors;
}
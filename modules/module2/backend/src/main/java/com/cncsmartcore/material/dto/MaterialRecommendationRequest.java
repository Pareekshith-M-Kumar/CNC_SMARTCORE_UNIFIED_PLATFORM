package com.cncsmartcore.material.dto;

import jakarta.validation.constraints.NotNull;

public record MaterialRecommendationRequest(
    @NotNull(message = "Optimization priority is required")
    String priority, // 'STRENGTH', 'WEIGHT', 'COST', 'CORROSION', 'MACHINABILITY', 'BALANCED'
    String environment, // 'INDOOR', 'OUTDOOR', 'MARINE', 'CHEMICAL', 'HIGH_TEMP'
    String applicationType, // 'STRUCTURAL', 'HOUSING', 'FIXTURE', 'PRECISION', 'PROTOTYPE'
    Double maxBudgetPerKg
) {}

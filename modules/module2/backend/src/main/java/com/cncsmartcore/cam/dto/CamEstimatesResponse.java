package com.cncsmartcore.cam.dto;

import java.time.Instant;
import java.util.List;
import java.util.Map;

public record CamEstimatesResponse(
    String label, // "Estimate"
    Map<String, Object> inputs,
    TimeBreakdown time,
    double energyKwh,
    CostBreakdown cost,
    List<String> warnings,
    Instant calculatedAt
) {
    public static final String LABEL = "Estimate";

    public record TimeBreakdown(
        double cuttingMin,
        double rapidMin,
        double toolChangeMin,
        double setupMin,
        double totalMachiningMin
    ) {}

    public record CostBreakdown(
        double machine,
        double material,
        double tooling,
        double setup,
        double energy,
        double total,
        String currency // "INR"
    ) {}
}

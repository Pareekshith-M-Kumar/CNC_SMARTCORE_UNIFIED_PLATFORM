package com.cncsmartcore.material.dto;

import com.cncsmartcore.material.Material;
import java.util.Arrays;
import java.util.List;
import java.util.UUID;

public record MaterialResponse(
    UUID id,
    String code,
    String name,
    String category,
    double densityKgM3,
    double kcNMm2,
    double vcMinMMin,
    double vcMaxMMin,
    double fzFactor,
    int strengthRating,
    int lightnessRating,
    int corrosionRating,
    int machinabilityRating,
    int costLevel,
    double costPerKg,
    List<String> suitableApplications,
    String notes,
    boolean isSampleData,
    boolean isActive
) {
    public static MaterialResponse from(Material m) {
        List<String> apps = m.getSuitableApplications() != null && !m.getSuitableApplications().isBlank()
            ? Arrays.stream(m.getSuitableApplications().split(","))
                    .map(String::trim)
                    .toList()
            : List.of();

        return new MaterialResponse(
            m.getId(),
            m.getCode(),
            m.getName(),
            m.getCategory(),
            m.getDensityKgM3(),
            m.getKcNMm2(),
            m.getVcMinMMin(),
            m.getVcMaxMMin(),
            m.getFzFactor(),
            m.getStrengthRating(),
            m.getLightnessRating(),
            m.getCorrosionRating(),
            m.getMachinabilityRating(),
            m.getCostLevel(),
            m.getCostPerKg(),
            apps,
            m.getNotes(),
            m.isSampleData(),
            m.isActive()
        );
    }

    @com.fasterxml.jackson.annotation.JsonProperty("kcNPerMm2")
    public double getKcNPerMm2() {
        return kcNMm2;
    }

    @com.fasterxml.jackson.annotation.JsonProperty("vcMinMPerMin")
    public double getVcMinMPerMin() {
        return vcMinMMin;
    }

    @com.fasterxml.jackson.annotation.JsonProperty("vcMaxMPerMin")
    public double getVcMaxMPerMin() {
        return vcMaxMMin;
    }
}
